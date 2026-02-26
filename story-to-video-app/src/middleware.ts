import { createClient } from "@/lib/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";

/**
 * 开发流程要点：
 * 1. 先刷新 session（createClient 里 getSession 会刷新）
 * 2. 保护需要登录的路由：/projects, /create
 * 3. 已登录用户访问 /login、/register 时重定向首页
 */
export async function middleware(request: NextRequest) {
  const { supabase, response } = await createClient(request);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const { pathname } = request.nextUrl;

  const protectedRoutes = ["/projects", "/create"];
  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));
  const authRoutes = ["/login", "/register"];
  const isAuth = authRoutes.some((r) => pathname.startsWith(r));

  if (isProtected && !session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }
  if (isAuth && session) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
