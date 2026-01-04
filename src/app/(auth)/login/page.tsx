"use client";

import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/callback`,
      },
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <button
        onClick={signInWithGoogle}
        className="rounded bg-black px-4 py-2 text-white"
      >
        Entrar com Google
      </button>
    </div>
  );
}
