/**
 * 分镜数据访问层
 * 负责：批量创建分镜、按项目查询、更新描述、确认描述/图片/视频
 */
import { createClient } from "@/lib/supabase/server";
import type { Scene } from "@/types/database";

export class SceneError extends Error {
  constructor(
    message: string,
    public code: "not_found" | "unauthorized" | "database_error"
  ) {
    super(message);
    this.name = "SceneError";
  }
}

export async function createScenes(
  projectId: string,
  scenes: Array<{ order_index: number; description: string }>
): Promise<Scene[]> {
  const supabase = await createClient();
  const rows = scenes.map((s) => ({
    project_id: projectId,
    order_index: s.order_index,
    description: s.description,
    description_confirmed: false,
    image_status: "pending",
    image_confirmed: false,
    video_status: "pending",
    video_confirmed: false,
  }));
  const { data, error } = await supabase.from("scenes").insert(rows).select();
  if (error) {
    console.error("createScenes:", error);
    throw new SceneError("创建分镜失败", "database_error");
  }
  return (data ?? []) as Scene[];
}

export async function getScenesByProjectId(projectId: string): Promise<Scene[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scenes")
    .select("*")
    .eq("project_id", projectId)
    .order("order_index", { ascending: true });
  if (error) throw new SceneError("获取分镜失败", "database_error");
  return (data ?? []) as Scene[];
}

export async function getSceneById(sceneId: string): Promise<Scene> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scenes")
    .select("*")
    .eq("id", sceneId)
    .single();
  if (error || !data) throw new SceneError("分镜不存在", "not_found");
  return data as Scene;
}

export async function updateSceneDescription(
  sceneId: string,
  description: string
): Promise<Scene> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scenes")
    .update({ description })
    .eq("id", sceneId)
    .select()
    .single();
  if (error) throw new SceneError("更新描述失败", "database_error");
  return data as Scene;
}

export async function confirmSceneDescription(sceneId: string): Promise<Scene> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scenes")
    .update({ description_confirmed: true })
    .eq("id", sceneId)
    .select()
    .single();
  if (error) throw new SceneError("确认失败", "database_error");
  return data as Scene;
}

export async function confirmAllDescriptions(projectId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("scenes")
    .update({ description_confirmed: true })
    .eq("project_id", projectId);
  if (error) throw new SceneError("批量确认失败", "database_error");
}

export async function deleteScenesByProjectId(projectId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("scenes").delete().eq("project_id", projectId);
  if (error) throw new SceneError("删除分镜失败", "database_error");
}

export async function confirmSceneImage(sceneId: string): Promise<Scene> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scenes")
    .update({ image_confirmed: true })
    .eq("id", sceneId)
    .select()
    .single();
  if (error) throw new SceneError("确认图片失败", "database_error");
  return data as Scene;
}

export async function confirmAllImages(projectId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("scenes")
    .update({ image_confirmed: true })
    .eq("project_id", projectId);
  if (error) throw new SceneError("批量确认图片失败", "database_error");
}

export async function confirmSceneVideo(sceneId: string): Promise<Scene> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scenes")
    .update({ video_confirmed: true })
    .eq("id", sceneId)
    .select()
    .single();
  if (error) throw new SceneError("确认视频失败", "database_error");
  return data as Scene;
}

export async function confirmAllVideos(projectId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("scenes")
    .update({ video_confirmed: true })
    .eq("project_id", projectId);
  if (error) throw new SceneError("批量确认视频失败", "database_error");
}

export async function updateSceneImageStatus(
  sceneId: string,
  status: "pending" | "processing" | "completed" | "failed"
): Promise<void> {
  const supabase = await createClient();
  await supabase.from("scenes").update({ image_status: status }).eq("id", sceneId);
}

export async function updateSceneVideoStatus(
  sceneId: string,
  status: "pending" | "processing" | "completed" | "failed"
): Promise<void> {
  const supabase = await createClient();
  await supabase.from("scenes").update({ video_status: status }).eq("id", sceneId);
}
