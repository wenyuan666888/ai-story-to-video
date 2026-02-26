"use client";

import { useState } from "react";
import type { ProjectWithScenes } from "@/types/database";

export function ImagesStageView({ project }: { project: ProjectWithScenes }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateAll = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/generate/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || "生成失败");
        setLoading(false);
        return;
      }
      window.location.reload();
    } catch {
      setError("网络错误");
      setLoading(false);
    }
  };

  const handleConfirmAll = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/scenes/confirm-all-images", {
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

  const pending = project.scenes.filter((s) => s.image_status === "pending");
  const completed = project.scenes.filter((s) => s.image_status === "completed");
  const allImagesDone = pending.length === 0 && completed.length > 0;

  function latestImage(scene: (typeof project.scenes)[0]) {
    const list = scene.images ?? [];
    if (list.length === 0) return null;
    const sorted = [...list].sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
    return sorted[0] ?? null;
  }

  return (
    <div className="space-y-6">
      <p className="text-gray-400">
        点击「生成所有图片」会按每个分镜描述生成图片：已配置火山引擎时使用 Seedream 文生图（与描述一致）；否则使用 Unsplash 或占位图。确认全部后进入视频阶段。
      </p>
      <ul className="space-y-4">
        {project.scenes.map((s) => {
          const img = latestImage(s);
          return (
            <li key={s.id} className="rounded-lg border border-gray-700 p-4">
              <span className="text-sm text-gray-500">分镜 {s.order_index}</span>
              <p className="text-gray-300 text-sm mt-1">
                {s.description.length > 80 ? `${s.description.slice(0, 80)}…` : s.description}
              </p>
              {img?.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- external or signed URL
                <img
                  src={img.url}
                  alt=""
                  className="mt-2 rounded w-full max-w-md h-auto"
                />
              ) : (
                <p className="mt-2 text-gray-500 text-sm">待生成</p>
              )}
              {s.image_confirmed && <span className="text-green-500 text-sm">已确认</span>}
            </li>
          );
        })}
      </ul>
      <div className="flex gap-4">
        <button
          onClick={handleGenerateAll}
          disabled={loading || pending.length === 0}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "处理中..." : "生成所有图片"}
        </button>
        {allImagesDone && (
          <button
            onClick={handleConfirmAll}
            disabled={loading}
            className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
          >
            确认所有图片
          </button>
        )}
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
