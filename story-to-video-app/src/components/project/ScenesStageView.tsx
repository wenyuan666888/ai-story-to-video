"use client";

import { useState } from "react";
import type { ProjectWithScenes } from "@/types/database";

export function ScenesStageView({ project }: { project: ProjectWithScenes }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirmAll = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/scenes/confirm-all-descriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || "确认失败");
        setLoading(false);
        return;
      }
      window.location.reload();
    } catch {
      setError("网络错误");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-gray-400">
        请确认各分镜描述，可编辑后保存。确认全部后进入「图片生成」阶段。
      </p>
      <ul className="space-y-4">
        {project.scenes.map((s) => (
          <li
            key={s.id}
            className="rounded-lg border border-gray-700 p-4 flex flex-col gap-2"
          >
            <span className="text-sm text-gray-500">分镜 {s.order_index}</span>
            <p className="text-white">{s.description}</p>
            {s.description_confirmed && (
              <span className="text-green-500 text-sm">已确认</span>
            )}
          </li>
        ))}
      </ul>
      <div className="flex gap-4">
        <button
          onClick={handleConfirmAll}
          disabled={loading}
          className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "处理中..." : "确认全部分镜"}
        </button>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
