import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as dbProjects from "@/lib/db/projects";
import * as dbScenes from "@/lib/db/scenes";
import * as dbMedia from "@/lib/db/media";
import { getVideoTaskStatus, downloadVideo } from "@/lib/ai/volc-video";

/**
 * GET /api/generate/video/task/:taskId?sceneId=xxx&projectId=xxx&videoId=xxx
 * 轮询视频任务状态；完成后下载视频并上传到 Storage，更新记录与分镜状态
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ ok: false, error: "未登录" }, { status: 401 });
  }
  const taskId = (await params).taskId;
  const { searchParams } = new URL(_req.url);
  const sceneId = searchParams.get("sceneId");
  const projectId = searchParams.get("projectId");
  const videoId = searchParams.get("videoId");
  if (!sceneId || !projectId || !videoId) {
    return Response.json({ ok: false, error: "缺少 sceneId / projectId / videoId" }, { status: 400 });
  }
  try {
    await dbProjects.getProjectById(projectId, user.id);
    const statusResult = await getVideoTaskStatus(taskId);

    if (statusResult.status === "completed" && statusResult.videoUrl) {
      const buffer = await downloadVideo(statusResult.videoUrl);
      const fileName = `scene-${sceneId}-${Date.now()}.mp4`;
      const { path, url } = await dbMedia.uploadFile(
        user.id,
        projectId,
        fileName,
        buffer,
        { contentType: "video/mp4" }
      );
      await dbMedia.updateCompletedVideo(videoId, path, url);
      await dbScenes.updateSceneVideoStatus(sceneId, "completed");
      return Response.json({
        ok: true,
        data: { status: "completed", videoUrl: url },
      });
    }

    if (statusResult.status === "failed") {
      await dbScenes.updateSceneVideoStatus(sceneId, "pending");
      return Response.json({
        ok: true,
        data: { status: "failed", error: statusResult.errorMessage },
      });
    }

    return Response.json({
      ok: true,
      data: { status: statusResult.status },
    });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "查询失败" },
      { status: 500 }
    );
  }
}
