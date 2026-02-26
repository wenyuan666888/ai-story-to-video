"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateProjectForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");
  const [style, setStyle] = useState("default");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("请填写标题");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, story: story.trim() || undefined, style: style || undefined }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || "创建失败");
        setLoading(false);
        return;
      }
      router.push(`/projects/${json.data.id}`);
      router.refresh();
    } catch {
      setError("网络错误");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-900/30 border border-red-800 p-3 text-sm text-red-300">
          {error}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">项目标题</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white"
          placeholder="例如：森林里的小兔子"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">故事内容</label>
        <textarea
          value={story}
          onChange={(e) => setStory(e.target.value)}
          rows={6}
          className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white"
          placeholder="输入一段故事，AI 会把它拆成多个分镜..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">风格（可选）</label>
        <select
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white"
        >
          <option value="default">默认</option>
          <option value="realistic">写实</option>
          <option value="anime">动漫</option>
          <option value="cartoon">卡通</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "创建中..." : "创建项目"}
      </button>
    </form>
  );
}
