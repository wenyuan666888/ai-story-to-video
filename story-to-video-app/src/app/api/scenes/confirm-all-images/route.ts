import { NextRequest } from "next/server";
import * as dbProjects from "@/lib/db/projects";
import * as dbScenes from "@/lib/db/scenes";
import { createClient } from "@/lib/supabase/server";

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
    await dbProjects.getProjectById(projectId, user.id);
    await dbScenes.confirmAllImages(projectId);
    await dbProjects.updateProject(projectId, user.id, { stage: "videos" });
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof dbProjects.ProjectError && e.code === "not_found") {
      return Response.json({ ok: false, error: "项目不存在" }, { status: 404 });
    }
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "确认失败" },
      { status: 500 }
    );
  }
}
