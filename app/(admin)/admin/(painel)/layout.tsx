import type { Metadata } from "next";
import Link from "next/link";
import { logoutAction } from "@/lib/admin/actions";

export const metadata: Metadata = { title: { default: "Painel", template: "%s · Painel do professor" } };

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper-sunken/50">
      <header className="bg-ink text-on-ink">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/admin" className="flex items-baseline gap-2 rounded-sm">
            <span className="font-display text-lg font-bold">Provas</span>
            <span className="text-sm text-on-ink-muted">Professor</span>
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="min-h-10 rounded-control px-3 text-sm font-medium text-on-ink-muted transition-colors hover:bg-white/10 hover:text-on-ink"
            >
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
