import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as db from "@/lib/db/projects";

/**
 * GET /api/projects/:id — 项目详情（含分镜与媒体）
 * PATCH /api/projects/:id — 更新标题/故事/风格/阶段
 * DELETE /api/projects/:id — 删除项目
 */
async function getUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  if (!userId) {
    return Response.json({ ok: false, error: "未登录" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const project = await db.getProjectById(id, userId);
    return Response.json({ ok: true, data: project });
  } catch (e) {
    if (e instanceof db.ProjectError) {
      if (e.code === "not_found")
        return Response.json({ ok: false, error: "项目不存在" }, { status: 404 });
      if (e.code === "unauthorized")
        return Response.json({ ok: false, error: "无权限" }, { status: 403 });
    }
    return Response.json({ ok: false, error: "服务器错误" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  if (!userId) {
    return Response.json({ ok: false, error: "未登录" }, { status: 401 });
  }
  const { id } = await params;
  let body: { title?: string; story?: string; style?: string; stage?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "无效 JSON" }, { status: 400 });
  }
  const updates: Parameters<typeof db.updateProject>[2] = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.story !== undefined) updates.story = body.story;
  if (body.style !== undefined) updates.style = body.style;
  if (
    body.stage !== undefined &&
    ["draft", "scenes", "images", "videos", "completed"].includes(body.stage)
  ) {
    updates.stage = body.stage as "draft" | "scenes" | "images" | "videos" | "completed";
  }
  try {
    const project = await db.updateProject(id, userId, updates);
    return Response.json({ ok: true, data: project });
  } catch (e) {
    if (e instanceof db.ProjectError && e.code === "not_found")
      return Response.json({ ok: false, error: "项目不存在" }, { status: 404 });
    if (e instanceof db.ProjectError && e.code === "unauthorized")
      return Response.json({ ok: false, error: "无权限" }, { status: 403 });
    return Response.json({ ok: false, error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  if (!userId) {
    return Response.json({ ok: false, error: "未登录" }, { status: 401 });
  }
  const { id } = await params;
  try {
    await db.deleteProject(id, userId);
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof db.ProjectError && e.code === "not_found")
      return Response.json({ ok: false, error: "项目不存在" }, { status: 404 });
    if (e instanceof db.ProjectError && e.code === "unauthorized")
      return Response.json({ ok: false, error: "无权限" }, { status: 403 });
    return Response.json({ ok: false, error: "删除失败" }, { status: 500 });
  }
}
