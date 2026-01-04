"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { archivePatient } from "@/lib/patients/actions";

export function PatientRowActions({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await archivePatient(patientId);
          router.refresh();
        });
      }}
      className="rounded-md border px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
    >
      {pending ? "..." : "Arquivar"}
    </button>
  );
}
