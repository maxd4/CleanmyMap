import { notFound } from "next/navigation";
import { 
  ShieldAlert, 
  Users, 
  Terminal, 
  Activity, 
  Database,
  Flame,
  Zap,
  RotateCcw,
  ShieldHalf
} from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { cn } from "@/lib/utils";
import { getCurrentUserIdentity, getCurrentUserRoleLabel } from "@/lib/authz";
import { ADMIN_ROUTE } from "@/lib/accueil-pilotage-routes";

export default async function GodModeAdminPage() {
  const identity = await getCurrentUserIdentity().catch(() => null);
  const role = await getCurrentUserRoleLabel().catch(() => "anonymous");
  const classes = getBlockClasses("pilot");
  const displayName =
    identity?.displayName?.trim() ||
    identity?.firstName?.trim() ||
    identity?.username ||
    identity?.handle ||
    "Créateur du site";

  // Sécurité : 404 pour cacher l'existence de la route aux comptes non autorisés
  if (role !== "max") {
    return notFound();
  }

  return (
    <div className={cn("w-full space-y-10 min-h-screen pb-20")}>
      <header className={cn(
        "flex flex-col md:flex-row md:items-end justify-between gap-8 p-10 rounded-[2.5rem] border transition-all duration-700 relative overflow-hidden",
        classes.surface,
        classes.shadow
      )}>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-slate-400/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="space-y-4 relative z-10">
          <div className="flex items-center gap-3 text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">
            <ShieldHalf size={14} className="text-slate-500" />
            Créateur du site
          </div>
          <div className="space-y-1">
            <h1 className="text-5xl font-black tracking-tighter text-white flex items-center gap-4">
              Créateur du site <span className="text-red-500 text-sm px-3 py-1 bg-red-500/10 rounded-full border border-red-500/20 uppercase tracking-widest font-black">Super-admin</span>
            </h1>
            <p className="max-w-xl text-slate-400 text-sm leading-relaxed">
              Accès racine du site pour l'arbitrage, la sécurité et les exécutions sensibles.
            </p>
          </div>
        </div>

        <div className="flex gap-3 relative z-10">
          <div className="flex items-center gap-4 px-6 py-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
            <Activity size={18} className="text-emerald-500 animate-pulse" />
            <div className="space-y-0.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Santé API</p>
              <p className="text-[11px] font-black text-emerald-500 tracking-tighter">OPÉRATIONNEL</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-10">
        {/* USERS MANAGEMENT */}
        <section className="lg:col-span-2 space-y-8">
          <div className={cn(
            "rounded-[2.5rem] border p-8 space-y-8 transition-all duration-700",
            classes.surface
          )}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-2xl font-black tracking-tight flex items-center gap-3 text-white">
                  <Users className="text-slate-400" size={24} />
                  Explorateur des comptes
                </h3>
                <p className="text-xs text-slate-500 font-medium">Sessions administratives actives</p>
              </div>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="ID, email ou nom..." 
                  className="w-full md:w-64 bg-slate-950/50 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none focus:border-slate-400 transition-all backdrop-blur-md"
                />
              </div>
            </div>
            
            <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/5">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Acteur</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Rôle</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Connexion</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">État</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr className="hover:bg-white/5 transition-colors group">
                    <td className="py-6 px-6">
                      <p className="font-bold text-white group-hover:text-slate-200 transition-colors">{displayName}</p>
                      <p className="text-[10px] text-slate-500 italic mt-1">Compte super-admin</p>
                    </td>
                    <td className="py-6 px-6">
                      <span className="px-3 py-1 bg-slate-400/10 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-400/20">
                        Créateur du site
                      </span>
                    </td>
                    <td className="py-6 px-6 text-slate-500 text-xs font-medium tracking-tight">Il y a 2 min</td>
                    <td className="py-6 px-6">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                        <span className="text-[10px] font-black text-emerald-500/80 uppercase tracking-widest">Active</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-3 justify-center p-4 rounded-xl bg-slate-950/30 border border-white/5">
              <Terminal size={14} className="text-slate-600" />
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest italic">
                Vue restreinte : session courante uniquement
              </p>
            </div>
          </div>
        </section>

        {/* SUPERVISION TOOLS */}
        <section className="space-y-10">
          <div className={cn(
            "rounded-[2.5rem] border p-8 space-y-8 relative overflow-hidden group",
            classes.surface,
            classes.shadow
          )}>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-slate-400/5 rounded-full blur-3xl pointer-events-none group-hover:bg-slate-400/10 transition-all duration-700" />
            
            <div className="space-y-1 relative z-10">
              <h3 className="text-xl font-black tracking-tight flex items-center gap-3 text-white">
                <ShieldAlert size={20} className="text-slate-400" />
                Supervision du site
              </h3>
              <p className="text-xs text-slate-500 font-medium">Pilotage global et arbitrage</p>
            </div>

            <div className="space-y-4 relative z-10">
              <CmmButton href={ADMIN_ROUTE} tone="secondary" variant="default" className="group/btn w-full justify-start gap-4 p-5 rounded-2xl text-left">
                <div className="w-12 h-12 rounded-xl bg-slate-400/10 flex items-center justify-center text-slate-400 group-hover/btn:bg-slate-400 group-hover/btn:text-slate-950 transition-all duration-500">
                  <Zap size={22} className="transition-transform group-hover/btn:scale-110" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-white">Administration du site</p>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Modération et audit</p>
                </div>
              </CmmButton>

              <CmmButton href="/reports" tone="primary" variant="default" className="group/btn w-full justify-start gap-4 p-5 rounded-2xl text-left">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 group-hover/btn:bg-red-500 group-hover/btn:text-white transition-all duration-500">
                  <Flame size={22} className="transition-transform group-hover/btn:scale-110" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-white">Rapports d&apos;impact</p>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Exports décideurs</p>
                </div>
              </CmmButton>

              <CmmButton href="/api/health" tone="tertiary" variant="default" className="group/btn w-full justify-start gap-4 p-5 rounded-2xl text-left">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover/btn:bg-emerald-500 group-hover/btn:text-white transition-all duration-500">
                  <RotateCcw size={22} className="transition-transform group-hover/btn:rotate-180 duration-700" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-white">Santé du site</p>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">État des endpoints</p>
                </div>
              </CmmButton>
            </div>
          </div>

          <div className="p-8 rounded-[2rem] bg-red-600/90 border border-red-500/20 shadow-2xl shadow-red-600/10 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <h4 className="font-black uppercase tracking-[0.25em] text-[10px] text-white flex items-center gap-2">
              <ShieldAlert size={14} />
              Avertissement sécurité
            </h4>
            <p className="text-xs font-bold leading-relaxed text-white/90">
              Toutes les actions de ce panneau sont journalisées et immuables. Chaque opération sensible impacte directement la supervision du site.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
