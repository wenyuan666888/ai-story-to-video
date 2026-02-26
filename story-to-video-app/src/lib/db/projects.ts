/**
 * 项目数据访问层
 * 开发流程：先写「增删改查」和「校验当前用户是否拥有项目」，再在 API 里调用
 */
import { createClient } from "@/lib/supabase/server";
import type {
  Project,
  ProjectWithScenes,
  ProjectStage,
} from "@/types/database";

export class ProjectError extends Error {
  constructor(
    message: string,
    public code: "not_found" | "unauthorized" | "database_error"
  ) {
    super(message);
    this.name = "ProjectError";
  }
}

export async function createProject(
  userId: string,
  title: string,
  story?: string,
  style?: string
): Promise<Project> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      title,
      story: story ?? "",
      style: style ?? "default",
      stage: "draft",
    })
    .select()
    .single();
  if (error) {
    console.error("createProject:", error);
    throw new ProjectError("创建项目失败", "database_error");
  }
  return data as Project;
}

export async function getProjects(
  userId: string,
  options: { page?: number; limit?: number } = {}
): Promise<{ projects: Project[]; total: number }> {
  const supabase = await createClient();
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const offset = (page - 1) * limit;
  const { data, error, count } = await supabase
    .from("projects")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) {
    console.error("getProjects:", error);
    throw new ProjectError("获取项目列表失败", "database_error");
  }
  return {
    projects: (data ?? []) as Project[],
    total: count ?? 0,
  };
}

export async function getProjectById(
  projectId: string,
  userId: string
): Promise<ProjectWithScenes> {
  const supabase = await createClient();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();
  if (projectError || !project) {
    if (projectError?.code === "PGRST116")
      throw new ProjectError("项目不存在", "not_found");
    throw new ProjectError("获取项目失败", "database_error");
  }
  const { data: scenes } = await supabase
    .from("scenes")
    .select("*")
    .eq("project_id", projectId)
    .order("order_index", { ascending: true });
  const sceneIds = (scenes ?? []).map((s) => s.id);
  const [imagesRes, videosRes] = await Promise.all([
    sceneIds.length ? supabase.from("images").select("*").in("scene_id", sceneIds) : { data: [] },
    sceneIds.length ? supabase.from("videos").select("*").in("scene_id", sceneIds) : { data: [] },
  ]);
  const scenesWithMedia = (scenes ?? []).map((s) => ({
    ...s,
    images: (imagesRes.data ?? []).filter((i: { scene_id: string }) => i.scene_id === s.id),
    videos: (videosRes.data ?? []).filter((v: { scene_id: string }) => v.scene_id === s.id),
  }));
  return {
    ...project,
    scenes: scenesWithMedia,
  } as ProjectWithScenes;
}

export async function updateProject(
  projectId: string,
  userId: string,
  updates: {
    title?: string;
    story?: string;
    style?: string;
    stage?: ProjectStage;
    final_video_path?: string | null;
    final_video_url?: string | null;
  }
): Promise<Project> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("projects")
    .select("user_id")
    .eq("id", projectId)
    .single();
  if (!existing || existing.user_id !== userId)
    throw new ProjectError("无权限", "unauthorized");
  const { data, error } = await supabase
    .from("projects")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .select()
    .single();
  if (error) throw new ProjectError("更新失败", "database_error");
  return data as Project;
}

export async function deleteProject(projectId: string, userId: string): Promise<void> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("projects")
    .select("user_id")
    .eq("id", projectId)
    .single();
  if (!existing || existing.user_id !== userId)
    throw new ProjectError("无权限", "unauthorized");
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw new ProjectError("删除失败", "database_error");
}
