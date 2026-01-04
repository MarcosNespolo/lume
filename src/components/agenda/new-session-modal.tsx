"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PatientOption } from "@/lib/agenda/actions";
import { createSession } from "@/lib/agenda/actions";

type Props = {
  patients: PatientOption[];
};

function toLocalDateInputValue(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

export function NewSessionModal({ patients }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);
  const defaultDate = useMemo(() => toLocalDateInputValue(now), [now]);
  const defaultTime = useMemo(() => {
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }, [now]);

  const [patientId, setPatientId] = useState<string>(patients[0]?.id ?? "");
  const [date, setDate] = useState<string>(defaultDate);
  const [time, setTime] = useState<string>(defaultTime);
  const [durationMin, setDurationMin] = useState<number>(50);

  function reset() {
    setError(null);
    setPatientId(patients[0]?.id ?? "");
    setDate(defaultDate);
    setTime(defaultTime);
    setDurationMin(50);
  }

  async function onSubmit() {
    setError(null);

    if (!patientId) {
      setError("Selecione um paciente.");
      return;
    }
    if (!date || !time) {
      setError("Preencha data e horário.");
      return;
    }
    if (!Number.isFinite(durationMin) || durationMin <= 0 || durationMin > 240) {
      setError("Duração inválida.");
      return;
    }

    // Monta Date no fuso local do browser (MVP)
    const [y, m, d] = date.split("-").map((v) => Number(v));
    const [hh, mm] = time.split(":").map((v) => Number(v));

    const startsAt = new Date(y, m - 1, d, hh, mm, 0, 0);
    const endsAt = addMinutes(startsAt, durationMin);

    startTransition(async () => {
      try {
        await createSession({
          patient_id: patientId,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
        });

        setOpen(false);
        reset();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao criar sessão.");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-800"
      >
        Marcar sessão
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-label="Fechar"
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
          />

          <div className="relative w-full max-w-md rounded-xl border bg-white p-4 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold">Marcar sessão</div>
                <div className="mt-1 text-xs text-neutral-500">
                  Cria uma sessão no Lume (depois sincronizamos com o Google).
                </div>
              </div>

              <button
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
                className="rounded-md px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-neutral-700">
                  Paciente
                </label>
                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                >
                  {patients.length === 0 ? (
                    <option value="">Sem pacientes</option>
                  ) : (
                    patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))
                  )}
                </select>
                {patients.length === 0 ? (
                  <p className="mt-1 text-xs text-neutral-500">
                    Você precisa cadastrar um paciente antes.
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-neutral-700">
                    Data
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-700">
                    Horário
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-700">
                  Duração (min)
                </label>
                <input
                  type="number"
                  min={10}
                  max={240}
                  step={5}
                  value={durationMin}
                  onChange={(e) => setDurationMin(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>

              {error ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  disabled={pending}
                  onClick={() => {
                    setOpen(false);
                    setError(null);
                  }}
                  className="rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  disabled={pending || patients.length === 0}
                  onClick={onSubmit}
                  className="rounded-md bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-60"
                >
                  {pending ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
