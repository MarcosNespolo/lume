import { NextResponse } from "next/server";
import { googleOAuthClient } from "@/lib/google/oauth";

export async function GET() {
  const oauth = googleOAuthClient();

  const url = oauth.generateAuthUrl({
    scope: ["https://www.googleapis.com/auth/calendar"],
    access_type: "offline",
    prompt: "consent",
    state: "lume_google_calendar", 
  });

  return NextResponse.redirect(url);
}
