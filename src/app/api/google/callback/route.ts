import { NextResponse } from "next/server";
import { googleOAuthClient } from "@/lib/google/oauth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect("/dashboard/agenda?error=google");
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return NextResponse.redirect("/login");
  }

  const userId = data.user.id;
  const oauth = googleOAuthClient();
  const { tokens } = await oauth.getToken(code);

  if (!tokens.refresh_token) {
    return NextResponse.redirect("/dashboard/agenda?error=no_refresh_token");
  }

  const admin = createSupabaseAdminClient();

  await admin.from("calendar_integrations").upsert({
    psychologist_id: userId,
    provider: "google",
    refresh_token: tokens.refresh_token,
    scope: tokens.scope,
    token_updated_at: new Date().toISOString(),
  });

  return NextResponse.redirect("/dashboard/agenda");
}
