const STAGES = [
  { key: "draft", label: "草稿" },
  { key: "scenes", label: "分镜" },
  { key: "images", label: "图片" },
  { key: "videos", label: "视频" },
  { key: "completed", label: "完成" },
] as const;

type Stage = (typeof STAGES)[number]["key"];

export function StageIndicator({ currentStage }: { currentStage: Stage }) {
  const idx = STAGES.findIndex((s) => s.key === currentStage);
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {STAGES.map((s, i) => {
        const isDone = i < idx;
        const isCurrent = s.key === currentStage;
        return (
          <span
            key={s.key}
            className={
              isCurrent
                ? "px-3 py-1 rounded-full bg-blue-600 text-white text-sm"
                : isDone
                  ? "px-3 py-1 rounded-full bg-gray-700 text-gray-300 text-sm"
                  : "px-3 py-1 rounded-full bg-gray-800 text-gray-500 text-sm"
            }
          >
            {isDone ? "✓ " : ""}
            {s.label}
          </span>
        );
      })}
    </div>
  );
}
