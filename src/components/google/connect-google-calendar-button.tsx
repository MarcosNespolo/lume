"use client";

import { supabase } from "@/lib/supabase/client";

export function ConnectGoogleCalendarButton() {

  const connect = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes: "https://www.googleapis.com/auth/calendar",
        queryParams: {
        access_type: "offline",
        prompt: "consent",
        },
        redirectTo: `${window.location.origin}/dashboard/agenda`,
      },
    });
  };

  return (
    <button
      onClick={connect}
      className="rounded bg-blue-600 px-4 py-2 text-gray-400 cursor-pointer"
    >
      Conectar Google Calendar
    </button>
  );
}
