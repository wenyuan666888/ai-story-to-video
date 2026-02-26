/**
 * 将分镜描述转为图片搜索关键词（用于 Unsplash 等）
 * 若配置了 OPENAI_API_KEY 则用 AI 转为英文关键词，否则用简单截取
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";

/**
 * 将分镜描述转为 1～3 个英文关键词，便于按描述搜索相关图片
 */
export async function getImageSearchQuery(description: string): Promise<string> {
  const trimmed = description.trim().slice(0, 500);
  if (!trimmed) return "story scene";

  if (!OPENAI_API_KEY) {
    return fallbackQuery(trimmed);
  }

  try {
    const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You output only 1-3 English keywords for image search, comma-separated. No other text. Examples: mountain sunset, child playing, office meeting",
          },
          {
            role: "user",
            content: `Convert this scene description to 1-3 English image search keywords only, comma-separated:\n\n${trimmed}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 50,
      }),
    });
    if (!res.ok) return fallbackQuery(trimmed);
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (content && content.length <= 80) return content;
  } catch {
    // ignore
  }
  return fallbackQuery(trimmed);
}

function fallbackQuery(description: string): string {
  // 简单截取或常见词映射，避免空/乱码
  const s = description.replace(/\s+/g, " ").trim().slice(0, 30);
  if (/[\u4e00-\u9fa5]/.test(s)) return "story scene"; // 纯中文时 Unsplash 搜索效果差，用通用词
  return s || "story scene";
}
