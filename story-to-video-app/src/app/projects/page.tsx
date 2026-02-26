import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import * as db from "@/lib/db/projects";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { projects } = await db.getProjects(user.id, { limit: 50 });
  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">我的项目</h1>
          <Link
            href="/create"
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            创建项目
          </Link>
        </div>
        {projects.length === 0 ? (
          <p className="text-gray-500">暂无项目，去创建一个吧。</p>
        ) : (
          <ul className="space-y-3">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="block rounded-lg border border-gray-700 p-4 hover:bg-gray-800/50"
                >
                  <span className="font-medium">{p.title}</span>
                  <span className="ml-2 text-sm text-gray-500">
                    {p.stage} · {new Date(p.updated_at).toLocaleDateString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
