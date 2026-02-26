import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CreateProjectForm } from "@/components/project/CreateProjectForm";
import { Header } from "@/components/layout/Header";

export default async function CreatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-xl">
        <Link href="/projects" className="text-sm text-gray-500 hover:text-white mb-6 inline-block">
          ← 返回项目列表
        </Link>
        <h1 className="text-2xl font-bold mb-4">创建新项目</h1>
        <CreateProjectForm />
      </main>
    </div>
  );
}
