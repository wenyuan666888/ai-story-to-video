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
 * POST /api/generate/image/:sceneId
 * 优先火山引擎 Seedream 按分镜描述文生图；未配置则 Unsplash 搜索或 Picsum 占位
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sceneId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ ok: false, error: "未登录" }, { status: 401 });
  }
  const sceneId = (await params).sceneId;
  try {
    const { data: sceneRow } = await supabase
      .from("scenes")
      .select("project_id")
      .eq("id", sceneId)
      .single();
    if (!sceneRow || !("project_id" in sceneRow)) {
      return Response.json({ ok: false, error: "分镜不存在" }, { status: 404 });
    }
    const projectId = (sceneRow as { project_id: string }).project_id;
    const project = await dbProjects.getProjectById(projectId, user.id);
    const scene = await dbScenes.getSceneById(sceneId);
    if (scene.project_id !== projectId) {
      return Response.json({ ok: false, error: "分镜不属于该项目" }, { status: 400 });
    }
    if (!scene.description_confirmed) {
      return Response.json({ ok: false, error: "请先确认该分镜描述" }, { status: 400 });
    }

    await dbScenes.updateSceneImageStatus(sceneId, "processing");

    let imageDone = false;
    if (isVolcImageConfigured()) {
      try {
        const base64 = await generateImageFromPrompt(
          scene.description,
          project.style ?? undefined,
          { size: "2K" }
        );
        const fileName = `scene-${sceneId}-${Date.now()}.png`;
        await dbMedia.uploadAndCreateImage(
          user.id,
          projectId,
          sceneId,
          fileName,
          Buffer.from(base64, "base64"),
          { contentType: "image/png" }
        );
        imageDone = true;
      } catch (volcErr) {
        const msg = volcErr instanceof Error ? volcErr.message : String(volcErr);
        if (/not activated|activate the model|未开通|请.*开通/i.test(msg)) {
          console.warn("[image] Volc model not activated, fallback to Unsplash/Picsum:", msg);
        } else {
          throw volcErr;
        }
      }
    }
    if (!imageDone) {
      const query = await getImageSearchQuery(scene.description);
      const descriptionBasedUrl = await getPhotoUrlByQuery(query);
      const url = descriptionBasedUrl ?? dbMedia.getFreeSceneImageUrl(sceneId);
      await dbMedia.createImage(sceneId, { url });
    }

    await dbScenes.updateSceneImageStatus(sceneId, "completed");
    return Response.json({ ok: true });
  } catch (e) {
    await dbScenes.updateSceneImageStatus(sceneId, "failed").catch(() => {});
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "生成失败" },
      { status: 500 }
    );
  }
}
