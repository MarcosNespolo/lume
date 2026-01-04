"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useEffect } from "react";

type NavItem = {
  label: string;
  href: string;
};

const NAV: NavItem[] = [
  { label: "Início", href: "/dashboard" },
  { label: "Pacientes", href: "/dashboard/patients" },
  { label: "Agenda", href: "/dashboard/agenda" },
  { label: "Financeiro", href: "/dashboard/finance" },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

    async function handleSignOut() {
        try {
            await supabase.auth.signOut();
        } finally {
            router.replace("/login");
            router.refresh();
        }
    }

    useEffect(() => {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event) => {
            if (event === "SIGNED_OUT") {
            router.replace("/login");
            router.refresh();
            }
        });

        return () => subscription.unsubscribe();
    }, [router])

  return (
    <aside className="hidden w-60 shrink-0 border-r bg-neutral-900 text-neutral-200 md:block">
      <div className="flex h-12 items-center px-4">
        <div className="text-sm font-semibold tracking-wide">LUME</div>
      </div>

      <nav className="px-2 py-2">
        <div className="space-y-1">
          {NAV.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center rounded-md px-3 py-2 text-sm transition",
                  active
                    ? "bg-white/10 text-white"
                    : "text-neutral-300 hover:bg-white/5 hover:text-white",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="mt-auto border-t border-white/10 p-2">
        <button
          onClick={handleSignOut}
          className="cursor-pointer w-full rounded-md px-3 py-2 text-left text-sm text-neutral-300 hover:bg-white/5 hover:text-white"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
