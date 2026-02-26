import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-2">登录</h1>
        <p className="text-gray-500 text-sm mb-6">登录后即可创建项目、生成分镜与视频</p>
        <Suspense fallback={<p className="text-gray-500">加载中...</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
