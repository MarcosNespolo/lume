import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

type ResponseCookieSetter = Parameters<
  ReturnType<typeof NextResponse.next>["cookies"]["set"]
>[0];
type CookieOptions = Omit<ResponseCookieSetter, "name" | "value">;

const PUBLIC_PATHS = new Set(["/", "/login", "/signup", "/callback"]);

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/auth/")) return true;
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/.well-known/") ||
    /\.[^/]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );

  let userId: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    userId = null;
  }

  const publicRoute = isPublicPath(pathname);

  // ✅ Default privado: se não logado e não é pública → /login
  if (!userId && !publicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  // ✅ Logado não vê login/signup → /dashboard
  if (userId && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|\\.well-known/|.*\\..*).*)"],
};
