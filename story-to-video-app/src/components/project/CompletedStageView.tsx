"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ProjectWithScenes } from "@/types/database";

function latestVideo(scene: ProjectWithScenes["scenes"][0]) {
  const list = scene.videos ?? [];
  if (list.length === 0) return null;
  const sorted = [...list].sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
  return sorted[0] ?? null;
}

export function CompletedStageView({ project }: { project: ProjectWithScenes }) {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [continuousIndex, setContinuousIndex] = useState(0);
  const [resolvedFinalUrl, setResolvedFinalUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const sceneUrls = project.scenes
    .map((s) => latestVideo(s)?.url)
    .filter((u): u is string => !!u);
  const proj = project as { final_video_path?: string | null; final_video_url?: string | null };
  const hasFinalVideo = !!proj.final_video_path || !!proj.final_video_url;
  const finalVideoUrl =
    proj.final_video_url ?? resolvedFinalUrl ?? null;

  useEffect(() => {
    if (!hasFinalVideo || proj.final_video_url) return;
    if (!proj.final_video_path) return;
    let cancelled = false;
    fetch(`/api/projects/${project.id}/final-video-url`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.ok && data?.url) setResolvedFinalUrl(data.url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [hasFinalVideo, proj.final_video_path, proj.final_video_url, project.id]);

  const handleExportFinal = useCallback(async () => {
    setExportError(null);
    setExporting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/export-final-video`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setExportError(data?.error ?? "导出失败");
        return;
      }
      router.refresh();
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "请求失败");
    } finally {
      setExporting(false);
    }
  }, [project.id, router]);

  const handleContinuousEnded = useCallback(() => {
    if (continuousIndex < sceneUrls.length - 1) {
      setContinuousIndex((i) => i + 1);
    } else {
      setContinuousIndex(0);
    }
  }, [continuousIndex, sceneUrls.length]);

  return (
    <div className="space-y-8">
      <p className="text-green-500 font-medium">项目已完成！</p>
      <p className="text-gray-400 text-sm">
        所有分镜已生成视频。可「连续播放」整条故事，或导出为一条总视频。
      </p>

      {/* 连续播放：单播放器按顺序播各分镜 */}
      {sceneUrls.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-gray-300 mb-2">连续播放</h3>
          <div className="rounded-lg border border-gray-700 p-4 bg-gray-800/30">
            <video
              ref={videoRef}
              key={continuousIndex}
              src={sceneUrls[continuousIndex]}
              controls
              playsInline
              className="w-full max-w-2xl rounded"
              preload="metadata"
              onEnded={handleContinuousEnded}
            />
            <p className="text-gray-500 text-xs mt-2">
              分镜 {continuousIndex + 1} / {sceneUrls.length} · 播完后自动播下一段
            </p>
          </div>
        </section>
      )}

      {/* 生成总视频 + 总视频展示 */}
      <section>
        <h3 className="text-sm font-medium text-gray-300 mb-2">总视频</h3>
        {hasFinalVideo ? (
          <div className="rounded-lg border border-gray-700 p-4 bg-gray-800/30 space-y-2">
            <video
              src={finalVideoUrl ?? undefined}
              controls
              playsInline
              className="w-full max-w-2xl rounded"
              preload="metadata"
            />
            <p className="text-gray-500 text-xs">
              已导出为一条完整视频，可直接下载或分享。
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-700 p-4 bg-gray-800/30">
            <p className="text-gray-400 text-sm mb-3">
              将全部分镜拼接成一条视频（需服务器安装 ffmpeg）。
            </p>
            <button
              type="button"
              onClick={handleExportFinal}
              disabled={exporting}
              className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm"
            >
              {exporting ? "生成中…" : "生成总视频"}
            </button>
            {exportError && (
              <p className="text-red-400 text-sm mt-2">{exportError}</p>
            )}
          </div>
        )}
      </section>

      {/* 分镜列表（原有） */}
      <section>
        <h3 className="text-sm font-medium text-gray-300 mb-2">分镜列表</h3>
        <ul className="space-y-6">
          {project.scenes.map((s) => {
            const video = latestVideo(s);
            return (
              <li key={s.id} className="rounded-lg border border-gray-700 p-4">
                <span className="text-sm text-gray-500">分镜 {s.order_index}</span>
                <p className="text-gray-300 text-sm mt-1">
                  {s.description.length > 100
                    ? `${s.description.slice(0, 100)}…`
                    : s.description}
                </p>
                {video?.url ? (
                  <video
                    src={video.url}
                    controls
                    playsInline
                    className="mt-2 rounded w-full max-w-md"
                    preload="metadata"
                  />
                ) : (
                  <p className="text-gray-500 text-sm mt-2">暂无视频</p>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
