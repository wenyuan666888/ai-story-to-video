/**
 * POST /api/projects/[id]/export-final-video
 * 按分镜顺序将各段视频用 ffmpeg 拼接成一条总视频，上传到 Storage 并写回项目
 * 依赖：服务器需安装 ffmpeg（PATH 可用）
 */
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as dbProjects from "@/lib/db/projects";
import * as dbMedia from "@/lib/db/media";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { spawn } from "child_process";

function latestVideo(scene: { videos?: { storage_path: string; url: string; version?: number }[] }) {
  const list = scene.videos ?? [];
  if (list.length === 0) return null;
  const sorted = [...list].sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
  return sorted[0] ?? null;
}

async function ensureFfmpeg(): Promise<boolean> {
  return new Promise((resolve) => {
    const p = spawn("ffmpeg", ["-version"], { stdio: "ignore" });
    p.on("error", () => resolve(false));
    p.on("close", (code) => resolve(code === 0));
  });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ ok: false, error: "未登录" }, { status: 401 });
  }
  const projectId = (await params).id;
  let project: Awaited<ReturnType<typeof dbProjects.getProjectById>>;
  try {
    project = await dbProjects.getProjectById(projectId, user.id);
  } catch {
    return Response.json({ ok: false, error: "项目不存在或无权限" }, { status: 404 });
  }
  const scenes = (project as { scenes?: { order_index: number; videos?: { storage_path: string; url: string }[] }[] }).scenes ?? [];
  const ordered = [...scenes].sort((a, b) => a.order_index - b.order_index);
  const videoUrls: string[] = [];
  for (const s of ordered) {
    const v = latestVideo(s);
    if (!v?.url && !v?.storage_path) {
      return Response.json(
        { ok: false, error: `分镜 ${s.order_index + 1} 尚无可用视频` },
        { status: 400 }
      );
    }
    const url = v.storage_path
      ? await dbMedia.getSignedUrl(v.storage_path, 3600)
      : v.url;
    videoUrls.push(url);
  }
  if (videoUrls.length === 0) {
    return Response.json({ ok: false, error: "没有可导出的分镜视频" }, { status: 400 });
  }
  const hasFfmpeg = await ensureFfmpeg();
  if (!hasFfmpeg) {
    return Response.json(
      {
        ok: false,
        error: "服务器未安装 ffmpeg，无法导出总视频。请安装 ffmpeg 或在本地使用「连续播放」观看。",
      },
      { status: 503 }
    );
  }
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "export-video-"));
  try {
    const partPaths: string[] = [];
    for (let i = 0; i < videoUrls.length; i++) {
      const res = await fetch(videoUrls[i]!);
      if (!res.ok) throw new Error(`下载分镜 ${i + 1} 失败`);
      const buf = Buffer.from(await res.arrayBuffer());
      const partPath = path.join(tmpDir, `part-${i}.mp4`);
      await fs.writeFile(partPath, buf);
      partPaths.push(partPath);
    }
    const listPath = path.join(tmpDir, "list.txt");
    const listContent = partPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
    await fs.writeFile(listPath, listContent, "utf8");
    const outPath = path.join(tmpDir, "final.mp4");
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(
        "ffmpeg",
        ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", outPath],
        { stdio: "pipe" }
      );
      let stderr = "";
      proc.stderr?.on("data", (c) => (stderr += c.toString()));
      proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(stderr || `ffmpeg exit ${code}`))));
    });
    const outBuffer = await fs.readFile(outPath);
    const { path: storagePath, url } = await dbMedia.uploadFile(
      user.id,
      projectId,
      "final.mp4",
      outBuffer,
      { contentType: "video/mp4" }
    );
    await dbProjects.updateProject(projectId, user.id, {
      final_video_path: storagePath,
      final_video_url: url,
    });
    return Response.json({
      ok: true,
      data: { final_video_path: storagePath, final_video_url: url },
    });
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
