import { listActivePatients, listUpcomingSessions } from "@/lib/agenda/actions";
import { NewSessionModal } from "@/components/agenda/new-session-modal";
import type { UpcomingSession } from "@/lib/agenda/actions";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function dayLabel(d: Date) {
  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (isSameDay(d, today)) return "";
  if (isSameDay(d, tomorrow)) return "Amanhã";

  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function paymentBadge(status: UpcomingSession["payment_status"]) {
  // sem cores fortes no MVP (clínico); só texto/forma
  const base =
    "inline-flex items-center rounded-md border px-2 py-1 text-[11px] text-neutral-700";
  if (status === "paid") return { className: `${base} bg-white`, label: "Pago" };
  if (status === "courtesy")
    return { className: `${base} bg-white`, label: "Cortesia" };
  return { className: `${base} bg-white`, label: "Pendente" };
}

function groupByDay(sessions: UpcomingSession[]) {
  const map = new Map<string, { date: Date; items: UpcomingSession[] }>();

  for (const s of sessions) {
    const d = new Date(s.starts_at);
    const k = dayKey(d);
    const existing = map.get(k);
    if (existing) existing.items.push(s);
    else map.set(k, { date: startOfDay(d), items: [s] });
  }

  return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

export default async function AgendaPage() {
  const [sessions, patients] = await Promise.all([
    listUpcomingSessions(),
    listActivePatients(80),
  ]);

  const today = startOfDay(new Date());
  const todayItems = sessions.filter((s) => isSameDay(new Date(s.starts_at), today));
  const upcomingItems = sessions.filter((s) => !isSameDay(new Date(s.starts_at), today));

  const todayGroups = groupByDay(todayItems);
  const upcomingGroups = groupByDay(upcomingItems);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Agenda</h1>
          <p className="mt-1 text-xs text-neutral-500">
            Hoje e próximos 7 dias.
          </p>
        </div>
        <NewSessionModal patients={patients} />
      </div>

      {/* HOJE */}
      <section className="rounded-lg border bg-white">
        <header className="border-b px-3 py-2">
          <div className="text-sm font-medium text-neutral-800">Hoje</div>
        </header>

        {todayGroups.length === 0 ? (
          <div className="p-4 text-sm text-neutral-600">Nada para hoje.</div>
        ) : (
          <div className="divide-y">
            {todayGroups.map((g) => (
              <DayBlock key={dayKey(g.date)} date={g.date} items={g.items} />
            ))}
          </div>
        )}
      </section>

      {/* PRÓXIMOS 7 DIAS */}
      <section className="rounded-lg border bg-white">
        <header className="border-b px-3 py-2">
          <div className="text-sm font-medium text-neutral-800">Próximos 7 dias</div>
        </header>

        {upcomingGroups.length === 0 ? (
          <div className="p-4 text-sm text-neutral-600">
            Nenhuma sessão nos próximos 7 dias.
          </div>
        ) : (
          <div className="divide-y">
            {upcomingGroups.map((g) => (
              <DayBlock key={dayKey(g.date)} date={g.date} items={g.items} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DayBlock({ date, items }: { date: Date; items: UpcomingSession[] }) {
  return (
    <div className="p-3">
     {!!dayLabel(date) && <div className="mb-2 text-xs font-medium text-neutral-600">
        {dayLabel(date)}
      </div>}

      <ul className="space-y-2">
        {items.map((s) => {
          const start = new Date(s.starts_at);
          const end = new Date(s.ends_at);

          const time = `${start.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}–${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

          const patientName = s.patient?.full_name ?? "Paciente";
          const badge = paymentBadge(s.payment_status);

          return (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-neutral-900 mb-0.5">
                  {time} • {patientName}
                </div>
                <div className="text-xs text-neutral-500">
                  {s.status === "canceled" ? "Cancelada" : "Agendada"}
                </div>
              </div>

              <div className={badge.className}>{badge.label}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
