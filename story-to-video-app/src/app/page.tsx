import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-2xl">
        <h1 className="text-3xl font-bold mb-4">故事转视频</h1>
        <p className="text-gray-400 mb-8">
          输入一段故事，系统会拆成多个分镜 → 为每个分镜生成图片 → 再生成视频。本示例用于理解「从零到上线」的完整开发流程。
        </p>
        {user ? (
          <div className="flex flex-col gap-4">
            <Link
              href="/create"
              className="inline-flex justify-center rounded-lg bg-blue-600 px-4 py-3 text-white hover:bg-blue-700"
            >
              创建新项目
            </Link>
            <Link
              href="/projects"
              className="inline-flex justify-center rounded-lg border border-gray-600 px-4 py-3 text-gray-300 hover:bg-gray-800"
            >
              我的项目
            </Link>
          </div>
        ) : (
          <div className="flex gap-4">
            <Link
              href="/login"
              className="rounded-lg bg-blue-600 px-4 py-3 text-white hover:bg-blue-700"
            >
              登录
            </Link>
            <Link
              href="/register"
              className="rounded-lg border border-gray-600 px-4 py-3 text-gray-300 hover:bg-gray-800"
            >
              注册
            </Link>
          </div>
        )}
        <p className="mt-12 text-sm text-gray-500">
          开发流程说明见项目根目录 <code className="bg-gray-800 px-1 rounded">docs/开发流程详解.md</code>
        </p>
      </main>
    </div>
  );
}
