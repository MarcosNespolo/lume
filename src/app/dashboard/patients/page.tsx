import { listPatients } from "@/lib/patients/actions";
import { NewPatientModal } from "@/components/patients/new-patient-modal";
import { PatientRowActions } from "@/components/patients/patient-row-actions";

export default async function PatientsPage() {
  const patients = await listPatients({ includeArchived: false });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Pacientes</h1>
          <p className="mt-1 text-xs text-neutral-500">
            Cadastre pacientes para conseguir marcar sessões na Agenda.
          </p>
        </div>
        <NewPatientModal />
      </div>

      <div className="rounded-lg border bg-white">
        <div className="border-b p-3 text-sm font-medium text-neutral-700">
          Ativos
        </div>

        {patients.length === 0 ? (
          <div className="p-4 text-sm text-neutral-600">
            Nenhum paciente ainda. Clique em “Novo paciente”.
          </div>
        ) : (
          <ul className="divide-y">
            {patients.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-neutral-900">
                    {p.full_name}
                  </div>
                  <div className="text-xs text-neutral-500">
                    Valor padrão:{" "}
                    {p.default_price_cents == null
                      ? "—"
                      : `R$ ${(p.default_price_cents / 100).toFixed(2)}`}
                  </div>
                </div>

                <PatientRowActions patientId={p.id} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
