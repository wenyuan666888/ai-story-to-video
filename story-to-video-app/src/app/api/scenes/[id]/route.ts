import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as dbProjects from "@/lib/db/projects";
import * as dbScenes from "@/lib/db/scenes";

/**
 * PATCH /api/scenes/:id — 更新分镜描述
 * Body: { description: string }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ ok: false, error: "未登录" }, { status: 401 });
  }
  const sceneId = (await params).id;
  let body: { description?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "无效 JSON" }, { status: 400 });
  }
  const description = body.description?.trim();
  if (!description) {
    return Response.json({ ok: false, error: "缺少 description" }, { status: 400 });
  }
  try {
    const { data: scene } = await supabase
      .from("scenes")
      .select("project_id")
      .eq("id", sceneId)
      .single();
    if (!scene || !("project_id" in scene)) {
      return Response.json({ ok: false, error: "分镜不存在" }, { status: 404 });
    }
    await dbProjects.getProjectById((scene as { project_id: string }).project_id, user.id);
    const updated = await dbScenes.updateSceneDescription(sceneId, description);
    return Response.json({ ok: true, data: updated });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "更新失败" },
      { status: 500 }
    );
  }
}
