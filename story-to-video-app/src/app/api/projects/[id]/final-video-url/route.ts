/**
 * GET /api/projects/[id]/final-video-url
 * 返回项目总视频的签名 URL（用于播放/下载，避免过期）
 */
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as dbProjects from "@/lib/db/projects";
import * as dbMedia from "@/lib/db/media";

export async function GET(
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
  const path = (project as { final_video_path?: string | null }).final_video_path;
  if (!path) {
    return Response.json({ ok: false, error: "尚未生成总视频" }, { status: 404 });
  }
  const url = await dbMedia.getSignedUrl(path, 3600);
  return Response.json({ ok: true, url });
}
