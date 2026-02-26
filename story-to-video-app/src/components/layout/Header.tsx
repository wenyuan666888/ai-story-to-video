import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { LogoutButton } from "@/components/auth/LogoutButton";

export function Header({ user }: { user: User | null }) {
  return (
    <header className="border-b border-gray-800 py-4">
      <div className="container mx-auto px-4 flex items-center justify-between max-w-4xl">
        <Link href="/" className="text-xl font-semibold">
          故事转视频
        </Link>
        <nav className="flex items-center gap-4">
          {user ? (
            <>
              <Link href="/projects" className="text-gray-400 hover:text-white">
                我的项目
              </Link>
              <Link href="/create" className="text-gray-400 hover:text-white">
                创建项目
              </Link>
              <span className="text-sm text-gray-500">{user.email}</span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-400 hover:text-white">
                登录
              </Link>
              <Link href="/register" className="text-gray-400 hover:text-white">
                注册
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
