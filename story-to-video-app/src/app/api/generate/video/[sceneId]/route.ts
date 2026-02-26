import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as dbProjects from "@/lib/db/projects";
import * as dbScenes from "@/lib/db/scenes";
import * as dbMedia from "@/lib/db/media";

/**
 * POST /api/generate/video/:sceneId — Mock：写占位视频记录并更新 video_status 为 completed
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
    const { data: scene } = await supabase
      .from("scenes")
      .select("project_id, order_index")
      .eq("id", sceneId)
      .single();
    if (!scene || !("project_id" in scene)) {
      return Response.json({ ok: false, error: "分镜不存在" }, { status: 404 });
    }
    const projectId = (scene as { project_id: string }).project_id;
    const orderIndex = (scene as { order_index?: number }).order_index ?? 0;
    await dbProjects.getProjectById(projectId, user.id);
    await dbMedia.createVideo(sceneId, { orderIndex });
    await dbScenes.updateSceneVideoStatus(sceneId, "completed");
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "生成失败" },
      { status: 500 }
    );
  }
}
