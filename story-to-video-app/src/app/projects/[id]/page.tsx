import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import * as db from "@/lib/db/projects";
import { Header } from "@/components/layout/Header";
import { StageIndicator } from "@/components/project/StageIndicator";
import { DraftStageView } from "@/components/project/DraftStageView";
import { ScenesStageView } from "@/components/project/ScenesStageView";
import { ImagesStageView } from "@/components/project/ImagesStageView";
import { VideosStageView } from "@/components/project/VideosStageView";
import { CompletedStageView } from "@/components/project/CompletedStageView";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { id } = await params;
  let project: Awaited<ReturnType<typeof db.getProjectById>>;
  try {
    project = await db.getProjectById(id, user.id);
  } catch (e) {
    if (e instanceof db.ProjectError && e.code === "not_found") notFound();
    throw e;
  }
  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/projects" className="text-sm text-gray-500 hover:text-white mb-4 inline-block">
          ← 返回项目列表
        </Link>
        <h1 className="text-2xl font-bold mb-2">{project.title}</h1>
        <p className="text-gray-500 text-sm mb-4">
          阶段：{project.stage} · 更新于 {new Date(project.updated_at).toLocaleString()}
        </p>
        {project.story && (
          <div className="rounded-lg bg-gray-800/50 p-4 mb-6">
            <p className="text-sm text-gray-400 whitespace-pre-wrap">{project.story}</p>
          </div>
        )}
        <StageIndicator currentStage={project.stage} />
        <div className="mt-8">
          {project.stage === "draft" && (
            <DraftStageView projectId={project.id} />
          )}
          {project.stage === "scenes" && (
            <ScenesStageView project={project} />
          )}
          {project.stage === "images" && (
            <ImagesStageView project={project} />
          )}
          {project.stage === "videos" && (
            <VideosStageView project={project} />
          )}
          {project.stage === "completed" && (
            <CompletedStageView project={project} />
          )}
        </div>
      </main>
    </div>
  );
}
