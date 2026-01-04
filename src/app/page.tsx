import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export default async function HomePage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="p-6">
      {user ? (
        <div>
          <h1 className="text-xl font-semibold">✅ Logado</h1>
          <p className="text-sm text-neutral-600">
            Email: {user.email}
          </p>
        </div>
      ) : (
        <div>
          <h1 className="text-xl font-semibold">❌ Não logado</h1>
          <a href="/auth/login" className="text-blue-600 underline">
            Ir para login
          </a>
        </div>
      )}
    </main>
  );
}
