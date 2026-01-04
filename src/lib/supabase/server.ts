import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type CookieStore = Awaited<ReturnType<typeof cookies>>;
type CookieSetArgs = Parameters<CookieStore["set"]>[0];
type CookieOptions = Omit<CookieSetArgs, "name" | "value">;

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );
}
