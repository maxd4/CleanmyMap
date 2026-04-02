import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

type NavItem = {
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/actions/new", label: "Déclarer" },
  { href: "/actions/history", label: "Historique" },
  { href: "/actions/map", label: "Vue terrain" },
  { href: "/reports", label: "Reporting" },
];

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">CleanMyMap</p>
          <h1 className="text-lg font-semibold text-slate-900">Espace bénévole</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            Accueil migration
          </Link>
          <UserButton />
        </div>
      </header>

      <nav className="mt-4 flex flex-wrap gap-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <main className="mt-4 flex-1">{children}</main>
    </div>
  );
}
