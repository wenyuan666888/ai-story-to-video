import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as dbProjects from "@/lib/db/projects";
import * as dbScenes from "@/lib/db/scenes";
import * as dbMedia from "@/lib/db/media";
import {
  isVolcVideoConfigured,
  createVideoTask,
} from "@/lib/ai/volc-video";

/**
 * POST /api/generate/videos — Body: { projectId: string }
 * 优先火山 Seedance 图生视频（分镜图片+描述）；未配置或失败则用免费示例视频
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ ok: false, error: "未登录" }, { status: 401 });
  }
  let body: { projectId: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "无效 JSON" }, { status: 400 });
  }
  const { projectId } = body;
  if (!projectId) {
    return Response.json({ ok: false, error: "缺少 projectId" }, { status: 400 });
  }
  try {
    const project = await dbProjects.getProjectById(projectId, user.id);
    const scenes = project.scenes.filter(
      (s) => s.image_confirmed && s.video_status === "pending"
    );
    const results: Array<{ sceneId: string; taskId: string; videoId: string }> = [];
    let useVolc = isVolcVideoConfigured();

    for (const s of scenes) {
      let done = false;
      if (useVolc) {
        const latestImage = await dbMedia.getLatestImageBySceneId(s.id);
        if (latestImage) {
          const imageUrl = latestImage.storage_path
            ? await dbMedia.getSignedUrl(latestImage.storage_path, 3600)
            : latestImage.url;
          try {
            const { taskId } = await createVideoTask(
              imageUrl,
              s.description,
              { duration: 5, style: project.style ?? undefined }
            );
            const video = await dbMedia.createProcessingVideo(s.id, taskId);
            await dbScenes.updateSceneVideoStatus(s.id, "processing");
            results.push({ sceneId: s.id, taskId, videoId: video.id });
            done = true;
          } catch (volcErr) {
            const msg = volcErr instanceof Error ? volcErr.message : String(volcErr);
            if (/not activated|activate the model|未开通|请.*开通/i.test(msg)) {
              console.warn("[videos] Volc video model not activated, fallback:", msg);
              useVolc = false;
            } else {
              throw volcErr;
            }
          }
        }
      }
      if (!done) {
        await dbMedia.createVideo(s.id, { orderIndex: s.order_index });
        await dbScenes.updateSceneVideoStatus(s.id, "completed");
      }
    }

    await dbProjects.updateProject(projectId, user.id, { stage: "videos" });
    return Response.json({
      ok: true,
      data: { generated: scenes.length, results },
    });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "生成失败" },
      { status: 500 }
    );
  }
}
