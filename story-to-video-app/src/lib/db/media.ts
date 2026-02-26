/**
 * 媒体数据访问层
 * 支持：Mock 占位图/视频；真实生成时上传到 Supabase Storage 并写库
 */
import { createClient } from "@/lib/supabase/server";
import type { Image, Video } from "@/types/database";

const MEDIA_BUCKET = "project-media";

/** 免费图床：按 sceneId 种子生成不同图片，无需 API Key */
export function getFreeSceneImageUrl(sceneId: string): string {
  const seed = sceneId.replace(/-/g, "").slice(0, 8) || "0";
  return `https://picsum.photos/seed/${seed}/800/450`;
}

/** 免费示例视频：按分镜序号轮换不同视频，无需 API Key */
const SAMPLE_VIDEO_URLS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoy.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdown.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
];
export function getFreeSceneVideoUrl(orderIndex: number): string {
  return SAMPLE_VIDEO_URLS[orderIndex % SAMPLE_VIDEO_URLS.length]!;
}

// ---------- 上传与签名 ----------
export async function getSignedUrl(storagePath: string, expiresIn = 3600): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error) throw new Error("创建签名 URL 失败");
  return data.signedUrl;
}

export async function uploadFile(
  userId: string,
  projectId: string,
  fileName: string,
  file: Buffer | Blob,
  options: { contentType?: string } = {}
): Promise<{ path: string; url: string }> {
  const supabase = await createClient();
  const path = `${userId}/${projectId}/${fileName}`;
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, {
      contentType: options.contentType ?? "image/png",
      upsert: true,
    });
  if (error) throw new Error("上传文件失败");
  const url = await getSignedUrl(path);
  return { path, url };
}

export async function createImageRecord(
  sceneId: string,
  storagePath: string,
  url: string,
  options: { width?: number; height?: number } = {}
): Promise<Image> {
  const supabase = await createClient();
  const { data: maxV } = await supabase
    .from("images")
    .select("version")
    .eq("scene_id", sceneId)
    .order("version", { ascending: false })
    .limit(1)
    .single();
  const version = ((maxV as { version?: number } | null)?.version ?? 0) + 1;
  const { data, error } = await supabase
    .from("images")
    .insert({
      scene_id: sceneId,
      storage_path: storagePath,
      url,
      width: options.width ?? null,
      height: options.height ?? null,
      version,
    })
    .select()
    .single();
  if (error) throw new Error("创建图片记录失败");
  return data as Image;
}

export async function getImagesBySceneId(sceneId: string): Promise<Image[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("images")
    .select("*")
    .eq("scene_id", sceneId)
    .order("version", { ascending: false });
  if (error) throw new Error("获取图片失败");
  return (data ?? []) as Image[];
}

/** 获取分镜最新一张图片（用于图生视频时提供图片 URL） */
export async function getLatestImageBySceneId(sceneId: string): Promise<Image | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("images")
    .select("*")
    .eq("scene_id", sceneId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("获取图片失败");
  return data as Image | null;
}

export async function deleteImagesBySceneId(sceneId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("images").delete().eq("scene_id", sceneId);
}

export async function deleteOldSceneImages(sceneId: string): Promise<void> {
  const supabase = await createClient();
  const images = await getImagesBySceneId(sceneId);
  if (images.length === 0) return;
  const paths = images.map((i) => i.storage_path).filter(Boolean);
  if (paths.length) await supabase.storage.from(MEDIA_BUCKET).remove(paths);
  await deleteImagesBySceneId(sceneId);
}

export async function uploadAndCreateImage(
  userId: string,
  projectId: string,
  sceneId: string,
  fileName: string,
  imageData: Buffer | string,
  options: { width?: number; height?: number; contentType?: string } = {}
): Promise<Image> {
  const buffer =
    typeof imageData === "string" ? Buffer.from(imageData, "base64") : imageData;
  const { path, url } = await uploadFile(userId, projectId, fileName, buffer, {
    contentType: options.contentType ?? "image/png",
  });
  return createImageRecord(sceneId, path, url, {
    width: options.width,
    height: options.height,
  });
}

// ---------- 火山图生视频：先创建 processing 记录，完成后更新 ----------
export async function createProcessingVideo(sceneId: string, taskId: string): Promise<Video> {
  const supabase = await createClient();
  const { data: maxV } = await supabase
    .from("videos")
    .select("version")
    .eq("scene_id", sceneId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const version = ((maxV as { version?: number } | null)?.version ?? 0) + 1;
  const { data, error } = await supabase
    .from("videos")
    .insert({
      scene_id: sceneId,
      storage_path: "",
      url: "",
      task_id: taskId,
      version,
    })
    .select()
    .single();
  if (error) throw new Error("创建视频记录失败");
  return data as Video;
}

export async function updateCompletedVideo(
  videoId: string,
  storagePath: string,
  url: string,
  options: { duration?: number } = {}
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("videos")
    .update({
      storage_path: storagePath,
      url,
      duration: options.duration ?? null,
    })
    .eq("id", videoId);
  if (error) throw new Error("更新视频记录失败");
}

// ---------- 免费生成：仅写库，图片/视频用免费外链（不调用收费 API） ----------
export async function createImage(
  sceneId: string,
  options: { url?: string; storage_path?: string } = {}
): Promise<{ id: string }> {
  const supabase = await createClient();
  const url = options.url ?? getFreeSceneImageUrl(sceneId);
  const storage_path = options.storage_path ?? `external/scene-${sceneId}-${Date.now()}.jpg`;
  const { data, error } = await supabase
    .from("images")
    .insert({ scene_id: sceneId, storage_path, url, version: 1 })
    .select("id")
    .single();
  if (error) throw new Error("创建图片记录失败");
  return { id: (data as { id: string }).id };
}

export async function createVideo(
  sceneId: string,
  options: { url?: string; storage_path?: string; orderIndex?: number } = {}
): Promise<{ id: string }> {
  const supabase = await createClient();
  const url = options.url ?? getFreeSceneVideoUrl(options.orderIndex ?? 0);
  const storage_path = options.storage_path ?? `external/scene-${sceneId}-${Date.now()}.mp4`;
  const { data, error } = await supabase
    .from("videos")
    .insert({ scene_id: sceneId, storage_path, url, version: 1 })
    .select("id")
    .single();
  if (error) throw new Error("创建视频记录失败");
  return { id: (data as { id: string }).id };
}
