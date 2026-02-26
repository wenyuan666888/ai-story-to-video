import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as dbProjects from "@/lib/db/projects";
import * as dbScenes from "@/lib/db/scenes";
import * as dbMedia from "@/lib/db/media";
import { getImageSearchQuery } from "@/lib/ai/description-to-query";
import { getPhotoUrlByQuery } from "@/lib/images/unsplash";
import {
  isVolcImageConfigured,
  generateImageFromPrompt,
} from "@/lib/ai/volc-image";

/**
 * POST /api/generate/images
 * Body: { projectId: string }
 * 优先火山引擎 Seedream 按分镜描述文生图；未配置则 Unsplash 或 Picsum 占位
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
      (s) => s.description_confirmed && s.image_status === "pending"
    );
    const useVolc = isVolcImageConfigured();
    const style = project.style ?? undefined;
    let volcFailed = false;

    for (const s of scenes) {
      await dbScenes.updateSceneImageStatus(s.id, "processing");
      let imageDone = false;
      if (useVolc && !volcFailed) {
        try {
          const base64 = await generateImageFromPrompt(s.description, style, {
            size: "2K",
          });
          const fileName = `scene-${s.id}-${Date.now()}.png`;
          await dbMedia.uploadAndCreateImage(
            user.id,
            projectId,
            s.id,
            fileName,
            Buffer.from(base64, "base64"),
            { contentType: "image/png" }
          );
          imageDone = true;
        } catch (volcErr) {
          const msg = volcErr instanceof Error ? volcErr.message : String(volcErr);
          if (/not activated|activate the model|未开通|请.*开通/i.test(msg)) {
            console.warn("[images] Volc model not activated, fallback for remaining:", msg);
            volcFailed = true;
          } else {
            throw volcErr;
          }
        }
      }
      if (!imageDone) {
        const query = await getImageSearchQuery(s.description);
        const descriptionBasedUrl = await getPhotoUrlByQuery(query);
        const url = descriptionBasedUrl ?? dbMedia.getFreeSceneImageUrl(s.id);
        await dbMedia.createImage(s.id, { url });
      }
      await dbScenes.updateSceneImageStatus(s.id, "completed");
    }
    await dbProjects.updateProject(projectId, user.id, { stage: "images" });
    return Response.json({ ok: true, data: { generated: scenes.length } });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "生成失败" },
      { status: 500 }
    );
  }
}
