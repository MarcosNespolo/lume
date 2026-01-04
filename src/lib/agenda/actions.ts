"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  const { error } = await supabase.from("sessions").insert({
    psychologist_id: userData.user.id,
    patient_id: input.patient_id,
    starts_at: input.starts_at,
    ends_at: input.ends_at,
    status: "scheduled",
    payment_status: "pending",
  });

  if (error) throw new Error(error.message);
}
