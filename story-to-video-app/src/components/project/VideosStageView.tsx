"use client";

import { useState, useEffect, useCallback } from "react";
import type { ProjectWithScenes } from "@/types/database";

type TaskItem = { sceneId: string; taskId: string; videoId: string };

function pollTask(
  taskId: string,
  sceneId: string,
  projectId: string,
  videoId: string
): Promise<{ status: string }> {
  const url = `/api/generate/video/task/${taskId}?sceneId=${encodeURIComponent(sceneId)}&projectId=${encodeURIComponent(projectId)}&videoId=${encodeURIComponent(videoId)}`;
  return fetch(url).then((r) => r.json()).then((j) => ({ status: j?.data?.status ?? j?.status ?? "processing" }));
}

export function VideosStageView({ project }: { project: ProjectWithScenes }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startPolling = useCallback((results: TaskItem[]) => {
    if (results.length === 0) return undefined;
    const interval = setInterval(async () => {
      const statuses = await Promise.all(
        results.map((r) =>
          pollTask(r.taskId, r.sceneId, project.id, r.videoId)
        )
      );
      const allDone = statuses.every(
        (s) => s.status === "completed" || s.status === "failed"
      );
      if (allDone) {
        clearInterval(interval);
        window.location.reload();
      }
    }, 5000);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      window.location.reload();
    }, 600000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [project.id]);

  useEffect(() => {
    const processing = project.scenes.filter((s) => s.video_status === "processing");
    const results: TaskItem[] = [];
    for (const s of processing) {
      const list = [...(s.videos ?? [])].sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
      const v = list[0];
      if (v?.task_id) results.push({ sceneId: s.id, taskId: v.task_id, videoId: v.id });
    }
    if (results.length > 0) {
      return startPolling(results);
    }
  }, [project.id, project.scenes, startPolling]);

  const handleGenerateAll = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/generate/videos", {
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
      const results = (json.data?.results ?? []) as TaskItem[];
      if (results.length > 0) {
        startPolling(results);
      } else {
        setLoading(false);
        window.location.reload();
      }
    } catch {
      setError("网络错误");
      setLoading(false);
    }
  };

  const handleConfirmAll = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/scenes/confirm-all-videos", {
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

  const pending = project.scenes.filter((s) => s.video_status === "pending");
  const completed = project.scenes.filter((s) => s.video_status === "completed");
  const needGenerate = project.scenes.filter(
    (s) => s.image_confirmed && s.video_status === "pending"
  ).length;
  const allVideosDone = pending.length === 0 && completed.length > 0;

  function latestVideo(scene: (typeof project.scenes)[0]) {
    const list = scene.videos ?? [];
    if (list.length === 0) return null;
    const sorted = [...list].sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
    return sorted[0] ?? null;
  }

  return (
    <div className="space-y-6">
      <p className="text-gray-400">
        已配置火山引擎时，将按分镜图片与描述生成与内容相关的短视频；未配置或未开通 Seedance 时使用免费示例视频。确认全部后项目完成。
      </p>
      <ul className="space-y-4">
        {project.scenes.map((s) => {
          const video = latestVideo(s);
          return (
            <li key={s.id} className="rounded-lg border border-gray-700 p-4">
              <span className="text-sm text-gray-500">分镜 {s.order_index}</span>
              {s.video_status === "processing" && (
                <p className="mt-2 text-amber-400 text-sm">生成中…（约 1～3 分钟）</p>
              )}
              {video?.url ? (
                <video
                  src={video.url}
                  controls
                  playsInline
                  className="mt-2 rounded w-full max-w-md"
                  preload="metadata"
                />
              ) : s.video_status !== "processing" ? (
                <p className="mt-2 text-gray-500 text-sm">待生成</p>
              ) : null}
              {s.video_confirmed && <span className="text-green-500 text-sm">已确认</span>}
            </li>
          );
        })}
      </ul>
      <div className="flex gap-4">
        <button
          onClick={handleGenerateAll}
          disabled={loading || needGenerate === 0}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "处理中..." : "生成所有视频"}
        </button>
        {allVideosDone && (
          <button
            onClick={handleConfirmAll}
            disabled={loading}
            className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
          >
            确认所有视频 · 完成项目
          </button>
        )}
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
