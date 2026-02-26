/**
 * 火山引擎 Seedance 图生视频 API（与分镜描述相关）
 * 文档: https://www.volcengine.com/docs/82379/1520757
 * 创建任务: POST .../api/v3/contents/generations/tasks
 * 查询任务: GET .../api/v3/contents/generations/tasks/{task_id}
 */

const VOLC_API_KEY = process.env.VOLC_API_KEY;
const VOLC_VIDEO_TASKS_URL =
  process.env.VOLC_VIDEO_TASKS_URL ??
  "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks";
const DEFAULT_MODEL = "doubao-seedance-1-5-pro-251215";

const REQUEST_TIMEOUT_MS = 60000;

export function isVolcVideoConfigured(): boolean {
  return !!VOLC_API_KEY;
}

export type VideoTaskStatus = "pending" | "processing" | "completed" | "failed";

export interface VideoTaskResult {
  taskId: string;
  status: VideoTaskStatus;
}

export interface VideoStatusResult {
  taskId: string;
  status: VideoTaskStatus;
  videoUrl?: string;
  errorMessage?: string;
}

interface CreateTaskResponse {
  id?: string;
  status?: string;
  error?: { message?: string; code?: string };
}

interface GetTaskResponse {
  id: string;
  status: string;
  content?: { video_url?: string };
  output?: { url?: string };
  error?: { message?: string };
}

const STYLE_HINTS: Record<string, string> = {
  realistic: "写实风格，与前后镜头光影、色调一致",
  anime: "动漫风格，与整体画风统一",
  cartoon: "卡通风格，与全片风格一致",
  cinematic: "电影感，与前后镜头衔接自然",
  watercolor: "水彩风格，统一艺术风格",
  oil_painting: "油画风格，整体协调",
  sketch: "素描风格，统一笔触",
  cyberpunk: "赛博朋克风格，统一霓虹与氛围",
  fantasy: "奇幻风格，统一世界观视觉",
  scifi: "科幻风格，统一未来感",
};

/**
 * 创建图生视频任务（图片 URL + 动作描述）
 * imageUrl 需公网可访问，若为 Supabase 私有存储请传签名 URL
 * style 用于统一多镜头画风、衔接自然
 */
export async function createVideoTask(
  imageUrl: string,
  prompt?: string,
  options: { duration?: number; style?: string } = {}
): Promise<VideoTaskResult> {
  if (!VOLC_API_KEY) throw new Error("未配置 VOLC_API_KEY");
  const duration = options.duration ?? 5;
  const styleHint = STYLE_HINTS[options.style ?? "realistic"] ?? STYLE_HINTS.realistic;
  const text = (prompt ?? "画面自然动起来").trim().slice(0, 400);
  const fullText = `整体风格：${styleHint}。本镜头：${text}，时长约${duration}秒，与前后镜头衔接自然。`;
  const body = {
    model: DEFAULT_MODEL,
    content: [
      { type: "text", text: fullText },
      { type: "image_url", image_url: { url: imageUrl } },
    ],
    duration,
    watermark: false,
  };

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const res = await fetch(VOLC_VIDEO_TASKS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${VOLC_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  });
  clearTimeout(t);
  const data = (await res.json()) as CreateTaskResponse;
  if (data.error) throw new Error(data.error.message ?? data.error.code ?? "创建视频任务失败");
  if (!res.ok || !data.id) throw new Error(`HTTP ${res.status}`);
  return { taskId: data.id, status: (data.status as VideoTaskStatus) ?? "pending" };
}

/**
 * 查询视频任务状态，完成后返回 videoUrl
 */
export async function getVideoTaskStatus(taskId: string): Promise<VideoStatusResult> {
  if (!VOLC_API_KEY) throw new Error("未配置 VOLC_API_KEY");
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const res = await fetch(`${VOLC_VIDEO_TASKS_URL}/${taskId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${VOLC_API_KEY}` },
    signal: controller.signal,
  });
  clearTimeout(t);
  const data = (await res.json()) as GetTaskResponse;
  if (data.error)
    return { taskId: data.id, status: "failed", errorMessage: data.error.message };
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  let status: VideoTaskStatus = "pending";
  const s = (data.status ?? "").toLowerCase();
  if (s === "running" || s === "processing") status = "processing";
  else if (s === "success" || s === "succeeded" || s === "completed") status = "completed";
  else if (s === "failed") status = "failed";

  const videoUrl = data.content?.video_url ?? data.output?.url;
  return { taskId: data.id, status, videoUrl };
}

export async function downloadVideo(videoUrl: string): Promise<Buffer> {
  const res = await fetch(videoUrl);
  if (!res.ok) throw new Error(`下载视频失败: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
