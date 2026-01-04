"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Patient = {
  id: string;
  full_name: string;
  default_price_cents: number | null;
  archived_at: string | null;
  created_at: string;
};

export type CreatePatientInput = {
  full_name: string;
  default_price_cents?: number | null;
};

export async function listPatients(params?: { includeArchived?: boolean }) {
  const supabase = await createSupabaseServerClient();

  let q = supabase
    .from("patients")
    .select("id, full_name, default_price_cents, archived_at, created_at")
    .order("full_name", { ascending: true });

  if (!params?.includeArchived) q = q.is("archived_at", null);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  return (data ?? []) as Patient[];
}

export async function createPatient(input: CreatePatientInput) {
  const supabase = await createSupabaseServerClient();

  const name = input.full_name.trim();
  if (name.length < 2) throw new Error("Nome muito curto.");

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw new Error("Not authenticated");

  const { error } = await supabase.from("patients").insert({
    psychologist_id: userData.user.id,
    full_name: name,
    default_price_cents: input.default_price_cents ?? null,
  });

  if (error) throw new Error(error.message);
}

export async function archivePatient(patientId: string) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("patients")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", patientId);

  if (error) throw new Error(error.message);
}

export async function unarchivePatient(patientId: string) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("patients")
    .update({ archived_at: null })
    .eq("id", patientId);

  if (error) throw new Error(error.message);
}
