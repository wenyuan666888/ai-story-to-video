import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as dbProjects from "@/lib/db/projects";
import * as dbScenes from "@/lib/db/scenes";

/**
 * POST /api/scenes/confirm-all-descriptions
 * Body: { projectId: string }
 * 确认该项目下全部分镜描述，并可将 stage 更新为 images（由前端再调 PATCH project 或单独接口）
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
    await dbProjects.getProjectById(projectId, user.id);
    await dbScenes.confirmAllDescriptions(projectId);
    await dbProjects.updateProject(projectId, user.id, { stage: "images" });
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof dbProjects.ProjectError && e.code === "not_found") {
      return Response.json({ ok: false, error: "项目不存在" }, { status: 404 });
    }
    if (e instanceof dbProjects.ProjectError && e.code === "unauthorized") {
      return Response.json({ ok: false, error: "无权限" }, { status: 403 });
    }
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "确认失败" },
      { status: 500 }
    );
  }
}
