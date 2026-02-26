/**
 * 故事 → 分镜 的 AI 封装
 * 使用 OpenAI 兼容接口（可替换为智谱/其他：改 BASE_URL 和 API Key 即可）
 * 未配置 API Key 时使用 Mock，便于理解流程
 */

export interface SceneItem {
  order_index: number;
  description: string;
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";

export function isAiConfigured(): boolean {
  return !!OPENAI_API_KEY;
}

const SYSTEM_PROMPT = `你是一个视频分镜编剧。你的任务是根据用户提供的故事**合理拆分并扩充**为 4～8 个具体的、可画面化的场景描述，且**前后衔接、画风统一**。

要求：
1. **合理拆分**：若用户给的是一整段话（没有句号或只有逗号分隔），请按情节、动作或场景变化拆成 4～8 个分镜，每镜对应一个清晰的画面或情节点，不要整段照搬成一句。
2. **必须根据故事内容扩充**：每个场景描述要来源于并紧扣故事，写出该镜头下具体的画面（环境、角色、动作、表情、光影氛围等），便于后续按描述生成图片和视频。
3. **衔接与统一**：各分镜在视觉风格、色调、角色造型上要保持一致，前后镜头在叙事和画面上自然衔接，像一个完整短片的不同镜头。
4. **不要使用通用占位句**：禁止出现「场景 N：基于你的故事生成的画面描述」或类似空洞表述；每个 description 必须是该分镜独有的、具体的视觉描述。
5. **适合 5～10 秒短视频**：每个场景描述对应一个短镜头，信息量适中。
6. **只输出 JSON**，不要任何其他文字。格式严格如下：
{"scenes":[{"order_index":1,"description":"该分镜的具体视觉描述，如：森林边缘，一只白兔从树后走出，爪中拿着一张红色福字，面向镜头作揖拜年，背景有雪花和灯笼"},...]}`;

function parseScenesJson(text: string): SceneItem[] {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("未找到 JSON");
  const obj = JSON.parse(match[0]) as { scenes?: SceneItem[] };
  if (!Array.isArray(obj.scenes)) throw new Error("scenes 必须是数组");
  return obj.scenes.map((s) => ({
    order_index: Number(s.order_index) || 0,
    description: String(s.description || "").trim() || "场景描述",
  }));
}

/**
 * 调用 OpenAI 兼容的 chat completions 接口
 */
export async function storyToScenes(
  story: string,
  style?: string
): Promise<SceneItem[]> {
  if (!OPENAI_API_KEY) {
    return mockStoryToScenes(story);
  }
  const userContent = `请根据下面这段故事，**先按情节/动作/场景变化合理拆成 4～8 个镜头**，再为每个镜头写一句具体的、可画面化的场景描述（若故事是一整段话，务必拆成多镜，不要只出一镜）：

故事：
${story}
${style ? `\n整体风格：${style}` : ""}`;
  const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI 调用失败: ${res.status} ${err}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI 未返回内容");
  return parseScenesJson(content);
}

/** 从句/意群分隔：用于把一段话按语义拆成多段 */
const SOFT_SPLIT_RE = /[，,、]|(?:然后|接着|于是|之后|一会儿|突然|这时|最后|首先|随后|于是|便|就|再|又|才)/g;

/**
 * 将一段话按语义和长度合理拆成 4～8 个片段（用于无 API 时的分镜）
 */
function splitParagraphToSegments(text: string): string[] {
  const trimmed = text.trim().slice(0, 1200);
  if (!trimmed) return ["故事内容"];

  // 1) 先按句号、问号、感叹号、换行等强边界拆成句子
  const sentences = trimmed
    .split(/[。！？\n；;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);

  // 2) 若只有一句或很少，按「逗号、顿号、然后/接着…」再拆
  let segments: string[] = [];
  if (sentences.length >= 4) {
    segments = sentences;
  } else if (sentences.length >= 1) {
    const oneBlock = sentences.join("。") || trimmed;
    const bySoft = oneBlock.split(SOFT_SPLIT_RE).map((s) => s.trim()).filter((s) => s.length > 1);
    if (bySoft.length >= 4) {
      segments = bySoft;
    } else {
      // 3) 仍不足：按长度均分，尽量在逗号/顿号处断句
      const targetCount = Math.min(8, Math.max(4, Math.ceil(oneBlock.length / 25)));
      const chunkSize = Math.ceil(oneBlock.length / targetCount);
      for (let i = 0; i < oneBlock.length; ) {
        let end = Math.min(i + chunkSize, oneBlock.length);
        if (end < oneBlock.length) {
          const rest = oneBlock.slice(end);
          const nextComma = rest.search(/[，,、]/);
          if (nextComma >= 0 && nextComma <= 12) end += nextComma + 1;
        }
        const chunk = oneBlock.slice(i, end).trim();
        if (chunk) segments.push(chunk);
        i = end;
      }
    }
  }
  if (segments.length === 0) segments = [trimmed.slice(0, 80)];

  // 4) 控制在 4～8 个：过多则合并，过少则用模板补足
  const want = Math.min(8, Math.max(4, segments.length));
  if (segments.length > want) {
    const merged: string[] = [];
    const step = segments.length / want;
    for (let i = 0; i < want; i++) {
      const start = Math.floor(i * step);
      const end = i === want - 1 ? segments.length : Math.floor((i + 1) * step);
      const part = segments.slice(start, end).join("，").trim();
      const fallback = segments[start];
      merged.push(part ? part : fallback ? fallback : "");
    }
    segments = merged.filter(Boolean);
  } else if (segments.length < 4) {
    const combined = segments.join("，") || trimmed.slice(0, 80);
    const suffixes = ["开场与环境", "角色与动作", "发展与转折", "收尾"];
    segments = suffixes.map((s) => `画面：${combined}（${s}）`);
  }
  return segments.slice(0, 8);
}

/**
 * Mock：无 API Key 时用故事内容按语义和长度拆成 4～8 个分镜，避免通用占位句
 */
function mockStoryToScenes(story: string): SceneItem[] {
  const segments = splitParagraphToSegments(story);
  return segments.map((desc, i) => ({
    order_index: i + 1,
    description: desc.length > 8 ? `画面：${desc}` : `画面：${desc}，镜头表现`,
  }));
}
