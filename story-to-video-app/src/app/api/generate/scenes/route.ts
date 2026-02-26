import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as dbProjects from "@/lib/db/projects";
import * as dbScenes from "@/lib/db/scenes";
import { storyToScenes } from "@/lib/ai/story-to-scenes";

/**
 * POST /api/generate/scenes
 * Body: { projectId: string }
 * 流程：取项目 story → 调 AI 得到分镜数组 → 删旧分镜 → 写入新分镜 → 更新项目 stage 为 scenes
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
    const story = project.story?.trim() || "";
    if (!story) {
      return Response.json({ ok: false, error: "项目没有故事内容" }, { status: 400 });
    }
    const scenes = await storyToScenes(story, project.style ?? undefined);
    await dbScenes.deleteScenesByProjectId(projectId);
    const created = await dbScenes.createScenes(
      projectId,
      scenes.map((s) => ({ order_index: s.order_index, description: s.description }))
    );
    await dbProjects.updateProject(projectId, user.id, { stage: "scenes" });
    return Response.json({ ok: true, data: { scenes: created } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "生成分镜失败";
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}
