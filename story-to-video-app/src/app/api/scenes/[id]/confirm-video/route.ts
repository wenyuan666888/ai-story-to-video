import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as dbProjects from "@/lib/db/projects";
import * as dbScenes from "@/lib/db/scenes";

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
    const { data: scene } = await supabase
      .from("scenes")
      .select("project_id")
      .eq("id", sceneId)
      .single();
    if (!scene || !("project_id" in scene)) {
      return Response.json({ ok: false, error: "分镜不存在" }, { status: 404 });
    }
    await dbProjects.getProjectById((scene as { project_id: string }).project_id, user.id);
    await dbScenes.confirmSceneVideo(sceneId);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "确认失败" },
      { status: 500 }
    );
  }
}
