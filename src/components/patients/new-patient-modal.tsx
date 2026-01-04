"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPatient } from "@/lib/patients/actions";

export function NewPatientModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [price, setPrice] = useState<string>("");

  function reset() {
    setError(null);
    setFullName("");
    setPrice("");
  }

  function parsePriceToCents(value: string): number | null {
    const v = value.trim();
    if (!v) return null;

    // aceita "150", "150,00", "150.00"
    const normalized = v.replace(/\./g, "").replace(",", ".");
    const num = Number(normalized);
    if (!Number.isFinite(num) || num < 0) return null;

    return Math.round(num * 100);
  }

  async function onSubmit() {
    setError(null);
    const name = fullName.trim();
    if (name.length < 2) {
      setError("Digite o nome completo.");
      return;
    }

    const cents = parsePriceToCents(price);
    if (price.trim() && cents == null) {
      setError("Valor inválido.");
      return;
    }

    startTransition(async () => {
      try {
        await createPatient({
          full_name: name,
          default_price_cents: cents,
        });

        setOpen(false);
        reset();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao criar paciente.");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-800"
      >
        Novo paciente
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
                <div className="text-base font-semibold">Novo paciente</div>
                <div className="mt-1 text-xs text-neutral-500">
                  Apenas o essencial para começar.
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
                  Nome completo
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Ex: Ana Silva"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-700">
                  Valor padrão (opcional)
                </label>
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Ex: 150,00"
                  inputMode="decimal"
                />
                <p className="mt-1 text-xs text-neutral-500">
                  Você poderá ajustar por sessão depois.
                </p>
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
                  disabled={pending}
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
