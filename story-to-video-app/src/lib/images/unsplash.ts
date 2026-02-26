/**
 * Unsplash 按关键词搜索图片，返回与描述相关的图片 URL
 * 需在 .env.local 配置 UNSPLASH_ACCESS_KEY（免费申请：https://unsplash.com/oauth/applications）
 * 使用图片时请按 Unsplash API 规范注明摄影师来源
 */

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const SEARCH_URL = "https://api.unsplash.com/search/photos";

export function isUnsplashConfigured(): boolean {
  return !!UNSPLASH_ACCESS_KEY;
}

/**
 * 根据搜索关键词获取一张相关图片的 URL（regular 尺寸，约 1080px 宽）
 * 未配置 key 或搜索无结果时返回 null
 */
export async function getPhotoUrlByQuery(query: string): Promise<string | null> {
  if (!UNSPLASH_ACCESS_KEY) return null;
  const q = query.trim().slice(0, 100) || "scene";
  const url = `${SEARCH_URL}?query=${encodeURIComponent(q)}&per_page=5&client_id=${UNSPLASH_ACCESS_KEY}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: Array<{ urls?: { regular?: string; small?: string } }>;
    };
    const first = data.results?.[0];
    return first?.urls?.regular ?? first?.urls?.small ?? null;
  } catch {
    return null;
  }
}
