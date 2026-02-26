"use client";

import { useState } from "react";

export function DraftStageView({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/generate/scenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
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

  return (
    <div className="rounded-lg border border-gray-700 p-6">
      <p className="text-gray-400 mb-4">
        点击下方按钮，AI 将根据项目中的「故事内容」自动拆分为多个分镜描述。
      </p>
      {error && (
        <p className="text-red-400 text-sm mb-4">{error}</p>
      )}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="rounded-lg bg-blue-600 px-4 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "生成中..." : "生成分镜"}
      </button>
    </div>
  );
}
