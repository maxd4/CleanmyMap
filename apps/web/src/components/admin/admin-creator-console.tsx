import {
  Activity,
  Flame,
  RotateCcw,
  ShieldAlert,
  ShieldHalf,
  Terminal,
  Users,
  Zap,
} from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { PageHeader, PageHeaderBadge } from "@/components/ui/page-header";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { cn } from "@/lib/utils";

type AdminCreatorConsoleProps = {
  displayName: string;
  embedded?: boolean;
  className?: string;
};

export function AdminCreatorConsole({
  displayName,
  embedded = false,
  className,
}: AdminCreatorConsoleProps) {
  const classes = getBlockClasses("pilot");
  const pageFamily = resolvePageFamily("/admin/godmode");
  const rootClassName = embedded
    ? "space-y-10 rounded-[2.5rem] border border-stone-200/80 bg-white/78 p-6 shadow-[0_16px_40px_-32px_rgba(69,45,28,0.26)] backdrop-blur-sm"
    : "w-full space-y-10 min-h-screen pb-20";

  return (
    <section className={cn(rootClassName, className)}>
      <header className="relative flex flex-col justify-between gap-8 overflow-hidden rounded-[2.5rem] border p-10 transition-all duration-700 md:flex-row md:items-end">
        <div className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-slate-400/5 blur-[120px]" />

        <PageHeader
          family={pageFamily}
          eyebrow="Sous-partie cachée"
          title="Administration avancée"
          subtitle="Bloc caché de l'administration pour l'arbitrage, la sécurité et les exécutions sensibles."
          badges={
            <>
              <PageHeaderBadge family={pageFamily}>
                <ShieldHalf size={12} className="mr-2 inline-block align-[-2px]" />
                Accès max
              </PageHeaderBadge>
              <PageHeaderBadge family={pageFamily} muted>
                Rôle normalisé: max
              </PageHeaderBadge>
            </>
          }
          className="relative z-10 max-w-3xl"
        />

        <div className="relative z-10 flex gap-3">
          <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/5 px-6 py-4 backdrop-blur-sm">
            <Activity size={18} className="text-emerald-500 animate-pulse" />
            <div className="space-y-0.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
                Santé API
              </p>
              <p className="text-[11px] font-black tracking-widest text-emerald-500">
                OPÉRATIONNEL
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-3">
        <section className="space-y-8 lg:col-span-2">
          <div className={cn("space-y-8 rounded-[2.5rem] border p-8 transition-all duration-700", classes.surface)}>
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="space-y-1">
                <h3 className="flex items-center gap-3 text-2xl font-black tracking-tight text-white">
                  <Users className="text-slate-400" size={24} />
                  Explorateur des comptes
                </h3>
                <p className="text-xs font-medium text-slate-500">Sessions administratives actives</p>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="ID, email ou nom..."
                  className="w-full rounded-xl border border-white/5 bg-slate-950/50 px-4 py-2.5 text-xs text-white outline-none placeholder:text-slate-600 transition-all backdrop-blur-md focus:border-slate-400 md:w-64"
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/5">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Acteur
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Rôle
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Connexion
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      État
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr className="group transition-colors hover:bg-white/5">
                    <td className="px-6 py-6">
                      <p className="font-bold text-white transition-colors group-hover:text-slate-200">
                        {displayName}
                      </p>
                      <p className="mt-1 text-[10px] italic text-slate-500">Compte super-admin</p>
                    </td>
                    <td className="px-6 py-6">
                      <span className="rounded-full border border-slate-400/20 bg-slate-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Sous-partie cachée
                      </span>
                    </td>
                    <td className="px-6 py-6 text-xs font-medium tracking-tight text-slate-500">
                      Il y a 2 min
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/80">
                          Active
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-center gap-3 rounded-xl border border-white/5 bg-slate-950/30 p-4">
              <Terminal size={14} className="text-slate-600" />
              <p className="text-[10px] font-bold uppercase tracking-widest italic text-slate-600">
                Vue restreinte : session courante uniquement
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-10">
          <div className={cn("group relative overflow-hidden rounded-[2.5rem] border p-8 space-y-8", classes.surface, classes.shadow)}>
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-slate-400/5 blur-3xl transition-all duration-700 group-hover:bg-slate-400/10" />

            <div className="relative z-10 space-y-1">
              <h3 className="flex items-center gap-3 text-xl font-black tracking-tight text-white">
                <ShieldAlert size={20} className="text-slate-400" />
                Supervision du site
              </h3>
              <p className="text-xs font-medium text-slate-500">Pilotage global et arbitrage</p>
            </div>

            <div className="relative z-10 space-y-4">
              <CmmButton
                href="/admin"
                tone="secondary"
                variant="default"
                className="group/btn w-full justify-start gap-4 rounded-2xl p-5 text-left"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-400/10 text-slate-400 transition-all duration-500 group-hover/btn:bg-slate-400 group-hover/btn:text-slate-950">
                  <Zap size={22} className="transition-transform group-hover/btn:scale-110" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-white">Administration</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                    Modération et audit
                  </p>
                </div>
              </CmmButton>

              <CmmButton
                href="/reports"
                tone="primary"
                variant="default"
                className="group/btn w-full justify-start gap-4 rounded-2xl p-5 text-left"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-500 transition-all duration-500 group-hover/btn:bg-red-500 group-hover/btn:text-white">
                  <Flame size={22} className="transition-transform group-hover/btn:scale-110" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-white">Rapports d&apos;impact</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                    Exports décideurs
                  </p>
                </div>
              </CmmButton>

              <CmmButton
                href="/api/health"
                tone="tertiary"
                variant="default"
                className="group/btn w-full justify-start gap-4 rounded-2xl p-5 text-left"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 transition-all duration-500 group-hover/btn:bg-emerald-500 group-hover/btn:text-white">
                  <RotateCcw size={22} className="transition-transform duration-700 group-hover/btn:rotate-180" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-white">Santé du site</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                    État des endpoints
                  </p>
                </div>
              </CmmButton>
            </div>
          </div>

          <div className="relative overflow-hidden space-y-4 rounded-[2rem] border border-red-500/20 bg-red-600/90 p-8 shadow-2xl shadow-red-600/10">
            <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
            <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-white">
              <ShieldAlert size={14} />
              Avertissement sécurité
            </h4>
            <p className="text-xs font-bold leading-relaxed text-white/90">
              Toutes les actions de ce panneau sont journalisées et immuables. Chaque opération sensible impacte directement la supervision du site.
            </p>
          </div>
        </section>
      </div>
    </section>
  );
}
