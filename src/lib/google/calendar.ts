import { google } from "googleapis";
import { googleOAuthClient } from "./oauth";
import type { SupabaseClient } from "@supabase/supabase-js";

type IntegrationRow = {
  psychologist_id: string;
  provider: string;
  calendar_id: string | null;
  refresh_token: string;
};

type SessionRow = {
  id: string;
  psychologist_id: string;
  starts_at: string; // ISO
  ends_at: string;   // ISO
  patient_name: string;
  payment_status?: "paid" | "pending" | "courtesy";
};

export async function ensureLumeCalendar(
  sb: SupabaseClient,
  integration: IntegrationRow
) {
  const oauth = googleOAuthClient();
  oauth.setCredentials({ refresh_token: integration.refresh_token });

  const calendar = google.calendar({ version: "v3", auth: oauth });

  if (integration.calendar_id) {
    try {
      await calendar.calendars.get({ calendarId: integration.calendar_id });
      return { calendar, calendarId: integration.calendar_id };
    } catch (err: any) {
        console.error("ensureLumeCalendar: calendars.get failed", {
        code: err?.code,
        status: err?.response?.status,
        data: err?.response?.data,
      });

      const code = err?.code || err?.response?.status;
      if (code !== 404 && code !== 410) throw err;
    }
  }

  const created = await calendar.calendars.insert({
    requestBody: {
      summary: "Sessões — Lume",
      description: "Calendário gerenciado pelo Lume (não inserir conteúdo clínico).",
      timeZone: "America/Sao_Paulo",
    },
  });

  const calendarId = created.data.id!;

  const { error } = await sb
    .from("calendar_integrations")
    .update({ calendar_id: calendarId, updated_at: new Date().toISOString() })
    .eq("psychologist_id", integration.psychologist_id)
    .eq("provider", "google");

  if (error) throw error;

  return { calendar, calendarId };
}

export async function createGoogleEvent(
  sb: SupabaseClient,
  calendar: ReturnType<typeof google.calendar>,
  calendarId: string,
  session: SessionRow
) {
  const { data: map } = await sb
    .from("calendar_event_map")
    .select("google_event_id")
    .eq("psychologist_id", session.psychologist_id)
    .eq("session_id", session.id)
    .eq("provider", "google")
    .maybeSingle();

  const start = new Date(session.starts_at);
  const end = new Date(session.ends_at);

  const summary = `Sessão - ${session.patient_name}`;
  const description = `Lume ID: ${session.id}`;

  const requestBody = {
    summary,
    description,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    extendedProperties: {
      private: { lumeSessionId: session.id },
    },
  };

  if (map?.google_event_id) {
    const updated = await calendar.events.patch({
      calendarId,
      eventId: map.google_event_id,
      requestBody,
    });

    await sb
      .from("calendar_event_map")
      .update({ calendar_id: calendarId, updated_at: new Date().toISOString() })
      .eq("psychologist_id", session.psychologist_id)
      .eq("session_id", session.id)
      .eq("provider", "google");

    return updated.data.id!;
  }

  const created = await calendar.events.insert({
    calendarId,
    requestBody,
  });

  const googleEventId = created.data.id!;

  const { error } = await sb.from("calendar_event_map").insert({
    psychologist_id: session.psychologist_id,
    session_id: session.id,
    provider: "google",
    google_event_id: googleEventId,
    calendar_id: calendarId,
  });

  if (error && error.code !== "23505") {
    // 23505 = unique_violation
    throw error;
    }

  return googleEventId;
}
