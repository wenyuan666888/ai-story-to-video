/**
 * 火山引擎 Seedream 文生图 API
 * 文档: https://www.volcengine.com/docs/82379/1541523
 * 端点: https://ark.cn-beijing.volces.com/api/v3/images/generations
 */

const VOLC_API_KEY = process.env.VOLC_API_KEY;
const VOLC_IMAGE_URL =
  process.env.VOLC_IMAGE_BASE_URL ?? "https://ark.cn-beijing.volces.com/api/v3/images/generations";
const DEFAULT_MODEL = "doubao-seedream-4-5-251128";

const REQUEST_TIMEOUT_MS = 120000;
const MAX_RETRIES = 2;

export function isVolcImageConfigured(): boolean {
  return !!VOLC_API_KEY;
}

/** 统一画风提示：所有分镜使用同一风格，便于整体一致 */
const UNIFIED_STYLE_PREFIX = "同一故事、统一画风，整体视觉一致。";
/** 根据项目风格追加英文风格提示，便于 Seedream 生成符合风格的图 */
function buildStyleSuffix(style?: string): string {
  const map: Record<string, string> = {
    realistic: ", photorealistic, high quality, natural lighting, consistent style",
    anime: ", anime style, vibrant colors, clean lines, consistent anime look",
    cartoon: ", cartoon style, bright colors, playful, consistent cartoon style",
    cinematic: ", cinematic, dramatic lighting, film look, consistent cinematography",
    watercolor: ", watercolor painting, soft edges, delicate colors, consistent art style",
    oil_painting: ", oil painting, thick brushstrokes, rich colors, consistent classical look",
    sketch: ", pencil sketch, detailed linework, artistic, consistent sketch style",
    cyberpunk: ", cyberpunk, neon lights, futuristic, consistent cyberpunk aesthetic",
    fantasy: ", fantasy, magical, ethereal, mystical, consistent fantasy style",
    scifi: ", sci-fi, futuristic, high-tech, consistent sci-fi style",
  };
  return map[style ?? "realistic"] ?? map.realistic;
}

interface VolcImageResponse {
  data?: Array<{ url?: string; b64_json?: string }>;
  error?: { message?: string; code?: string };
}

/**
 * 根据文本描述生成图片，返回 base64（便于上传到 Supabase Storage）
 */
export async function generateImageFromPrompt(
  prompt: string,
  style?: string,
  options: { size?: "1K" | "2K" } = {}
): Promise<string> {
  if (!VOLC_API_KEY) {
    throw new Error("未配置 VOLC_API_KEY");
  }
  const fullPrompt = `${UNIFIED_STYLE_PREFIX} ${prompt.trim().slice(0, 560)}${buildStyleSuffix(style)}`;
  const body = {
    model: DEFAULT_MODEL,
    prompt: fullPrompt,
    size: options.size ?? "2K",
    watermark: false,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let lastErr: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(VOLC_IMAGE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${VOLC_API_KEY}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const data = (await res.json()) as VolcImageResponse;

      if (data.error) {
        throw new Error(data.error.message ?? data.error.code ?? "火山引擎返回错误");
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const first = data.data?.[0];
      if (!first) throw new Error("未返回图片数据");

      if (first.b64_json) {
        clearTimeout(timeoutId);
        return first.b64_json;
      }
      if (first.url) {
        const imgRes = await fetch(first.url);
        if (!imgRes.ok) throw new Error("下载生成图片失败");
        const buf = await imgRes.arrayBuffer();
        clearTimeout(timeoutId);
        return Buffer.from(buf).toString("base64");
      }
      throw new Error("响应中无 url 或 b64_json");
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      if ((e as Error).name === "AbortError") {
        clearTimeout(timeoutId);
        throw new Error("请求超时");
      }
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
  }
  clearTimeout(timeoutId);
  throw lastErr ?? new Error("生成失败");
}
