import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="flex">
        <Sidebar />

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
            <div className="flex h-12 items-center justify-between px-4">
              <div className="text-sm font-medium text-neutral-700">
                Lume
              </div>
              <div className="text-xs text-neutral-500">
                {/* espaço p/ status leve no futuro */}
              </div>
            </div>
          </header>

          <main className="flex-1 p-4">{children}</main>
        </div>
      </div>
    </div>
  );
}
