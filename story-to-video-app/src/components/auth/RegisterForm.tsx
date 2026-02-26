"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("两次密码不一致");
      return;
    }
    if (password.length < 6) {
      setError("密码至少 6 位");
      return;
    }
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signUp({ email, password });
      if (err) {
        setError(err.message);
        setIsLoading(false);
        return;
      }
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 1500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "注册失败";
      if (msg.includes("fetch") || msg.includes("Failed to fetch")) {
        setError("无法连接 Supabase：请检查 .env.local 中填的是否为 anon public 密钥（不要用 secret 或 service_role），并确认 Project URL 正确。");
      } else {
        setError(msg || "注册失败，请重试");
      }
      setIsLoading(false);
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
        <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">邮箱</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white placeholder-gray-500"
          placeholder="请输入邮箱"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-1">密码</label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white placeholder-gray-500"
          placeholder="至少 6 位"
        />
      </div>
      <div>
        <label htmlFor="confirm" className="block text-sm font-medium text-gray-400 mb-1">确认密码</label>
        <input
          id="confirm"
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white placeholder-gray-500"
          placeholder="再次输入密码"
        />
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className={cn("w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50")}
      >
        {isLoading ? "注册中..." : "注册"}
      </button>
      <p className="text-center text-sm text-gray-500">
        已有账号？ <Link href="/login" className="text-blue-400 hover:underline">登录</Link>
      </p>
    </form>
  );
}
