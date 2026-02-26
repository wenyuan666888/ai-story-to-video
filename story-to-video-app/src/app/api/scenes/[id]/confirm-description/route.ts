import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as dbProjects from "@/lib/db/projects";
import * as dbScenes from "@/lib/db/scenes";

/**
 * POST /api/scenes/:id/confirm-description — 确认单个分镜描述
 */
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
  const sceneId = (await params).id;
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
    await dbProjects.getProjectById(projectId, user.id);
    const updated = await dbScenes.confirmSceneDescription(sceneId);
    return Response.json({ ok: true, data: updated });
  } catch (e) {
    if (e instanceof dbProjects.ProjectError && e.code === "not_found") {
      return Response.json({ ok: false, error: "无权限" }, { status: 403 });
    }
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "确认失败" },
      { status: 500 }
    );
  }
}
