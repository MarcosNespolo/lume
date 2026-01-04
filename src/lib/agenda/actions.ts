"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureLumeCalendar, createGoogleEvent } from "@/lib/google/calendar";

export type CreateSessionInput = {
  patient_id: string;
  starts_at: string; // ISO
  ends_at: string; // ISO
};

export type PatientOption = {
  id: string;
  full_name: string;
};

export type UpcomingSession = {
  id: string;
  patient_id: string;
  starts_at: string;
  ends_at: string;
  status: "scheduled" | "canceled";
  payment_status: "pending" | "paid" | "courtesy";
  price_cents: number | null;
  patient: { full_name: string } | null;
};

export async function listActivePatients(limit = 50): Promise<PatientOption[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("patients")
    .select("id, full_name")
    .is("archived_at", null)
    .order("full_name", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as PatientOption[];
}


export async function listUpcomingSessions(): Promise<UpcomingSession[]> {
  const supabase = await createSupabaseServerClient();

  const from = new Date();
  from.setHours(0, 0, 0, 0);

  const to = new Date(from);
  to.setDate(to.getDate() + 8);

  const { data, error } = await supabase
    .from("sessions")
    .select(`
      id,
      patient_id,
      starts_at,
      ends_at,
      status,
      payment_status,
      price_cents,
      patient:patients ( full_name )
    `)
    .gte("starts_at", from.toISOString())
    .lt("starts_at", to.toISOString())
    .order("starts_at", { ascending: true })
    .returns<UpcomingSession[]>();

  if (error) throw new Error(error.message);
  console.log("Upcoming sessions data:", data);
  return (data ?? []) as UpcomingSession[];
}

export async function createSession(input: CreateSessionInput) {
  const supabase = await createSupabaseServerClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw new Error("Not authenticated");

  const userId = userData.user.id;

  const { data: created, error: insertErr } = await supabase
    .from("sessions")
    .insert({
      psychologist_id: userId,
      patient_id: input.patient_id,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      status: "scheduled",
      payment_status: "pending",
      gcal_sync_status: "pending",
    })
    .select("id")
    .single();

  if (insertErr) throw new Error(insertErr.message);

  const sessionId = created.id as string;

  const { data: patient, error: patientErr } = await supabase
    .from("patients")
    .select("full_name")
    .eq("id", input.patient_id)
    .single();

  if (patientErr) {
    const admin = createSupabaseAdminClient();
    await admin
      .from("sessions")
      .update({
        gcal_sync_status: "error",
        gcal_error: `Failed to load patient: ${patientErr.message}`,
        gcal_last_sync_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("psychologist_id", userId);

    return { session_id: sessionId };
  }

  const admin = createSupabaseAdminClient();

  try {
    const { data: integration, error: integErr } = await admin
      .from("calendar_integrations")
      .select("refresh_token, calendar_id")
      .eq("psychologist_id", userId)
      .eq("provider", "google")
      .maybeSingle();

    if (integErr) throw new Error(integErr.message);
    if (!integration) throw new Error("Google Calendar não conectado");

    const { calendar, calendarId } = await ensureLumeCalendar(
      admin,
      {
        psychologist_id: userId,
        provider: "google",
        calendar_id: integration.calendar_id,
        refresh_token: integration.refresh_token,
      }
    );

    if (!integration.calendar_id || integration.calendar_id !== calendarId) {
      const { error: updErr } = await admin
        .from("calendar_integrations")
        .update({
          calendar_id: calendarId,
          token_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("psychologist_id", userId)
        .eq("provider", "google");

      if (updErr) throw new Error(updErr.message);
    }

    const { data: existingMap, error: mapErr } = await admin
      .from("calendar_event_map")
      .select("google_event_id")
      .eq("psychologist_id", userId)
      .eq("session_id", sessionId)
      .eq("provider", "google")
      .maybeSingle();

    if (mapErr) throw new Error(mapErr.message);

    let googleEventId = existingMap?.google_event_id as string | undefined;

    if (!googleEventId) {
      googleEventId = await createGoogleEvent(
        admin,
        calendar,
        calendarId,
        {
          id: sessionId,
          psychologist_id: userId,
          starts_at: input.starts_at,
          ends_at: input.ends_at,
          patient_name: patient.full_name,
        }
      );
    }

    const { error: syncUpdErr } = await admin
      .from("sessions")
      .update({
        gcal_sync_status: "synced",
        gcal_error: null,
        gcal_last_sync_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("psychologist_id", userId);

    if (syncUpdErr) throw new Error(syncUpdErr.message);

  } catch (err: any) {
    await admin
      .from("sessions")
      .update({
        gcal_sync_status: "error",
        gcal_error: String(err?.message ?? err),
        gcal_last_sync_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("psychologist_id", userId);
  }

  return { session_id: sessionId };
}
