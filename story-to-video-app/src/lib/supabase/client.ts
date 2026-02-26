import { createBrowserClient } from "@supabase/ssr";

/**
 * 浏览器端 Supabase 客户端
 * 用于：Client Component（"use client"）里的登录、登出、订阅等
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
