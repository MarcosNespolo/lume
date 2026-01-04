"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function persistGoogleRefreshTokenIfPresent() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);

  const session = data.session;
  if (!session?.user) throw new Error("Not authenticated");

  const refreshToken = session.provider_refresh_token;

  if (!refreshToken) {
    return { saved: false, reason: "no_refresh_token" as const };
  }

  const admin = createSupabaseAdminClient();

  const { error: upsertErr } = await admin.from("calendar_integrations").upsert({
    psychologist_id: session.user.id,
    provider: "google",
    refresh_token: refreshToken,
    updated_at: new Date().toISOString(),
  });

  if (upsertErr) throw new Error(upsertErr.message);

  return { saved: true };
}
