import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as db from "@/lib/db/projects";

/**
 * GET /api/projects — 当前用户的项目列表（分页）
 * POST /api/projects — 创建项目
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ ok: false, error: "未登录" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 20;
  try {
    const { projects, total } = await db.getProjects(user.id, { page, limit });
    return Response.json({ ok: true, data: { projects, total } });
  } catch (e) {
    const err = e instanceof db.ProjectError ? e : new Error("服务器错误");
    const status = err instanceof db.ProjectError && err.code === "unauthorized" ? 403 : 500;
    return Response.json({ ok: false, error: err.message }, { status });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ ok: false, error: "未登录" }, { status: 401 });
  }
  let body: { title: string; story?: string; style?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "无效 JSON" }, { status: 400 });
  }
  const { title, story, style } = body;
  if (!title || typeof title !== "string") {
    return Response.json({ ok: false, error: "缺少 title" }, { status: 400 });
  }
  try {
    const project = await db.createProject(user.id, title.trim(), story?.trim(), style?.trim());
    return Response.json({ ok: true, data: project });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "创建失败" },
      { status: 500 }
    );
  }
}
