import { currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { 
  ShieldAlert, 
  Users, 
  Terminal, 
  Activity, 
  Database,
  Flame,
  Zap,
  RotateCcw
} from "lucide-react";

export default async function GodModeAdminPage() {
  const user = await currentUser();
  const role = user?.publicMetadata?.role;

  // Sécurité : 404 pour cacher l'existence de la route aux non-admins
  if (role !== "super_admin") {
    return notFound();
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 bg-slate-950 min-h-screen text-slate-200">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2 text-rose-500 font-bold uppercase tracking-widest text-xs">
            <ShieldAlert size={16} />
            Système d'Exploitation Master
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white flex items-center gap-4">
            God Mode. <span className="text-rose-600 px-2 py-1 bg-rose-600/10 rounded-lg text-xs uppercase tracking-widest">SuperAdmin</span>
          </h1>
          <p className="text-slate-400 max-w-xl">
             Accès root aux paramètres de sécurité, à la gestion des rôles et aux exécutions système sensibles.
          </p>
        </div>
        <div className="flex gap-3 relative z-10">
          <div className="flex items-center gap-4 px-6 py-3 bg-slate-800 rounded-2xl border border-slate-700">
            <Activity size={18} className="text-emerald-500 animate-pulse" />
            <div className="text-xs">
              <p className="font-bold text-white uppercase">Santé API</p>
              <p className="text-emerald-500">OPÉRATIONNEL</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* USERS MANAGEMENT */}
        <section className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 space-y-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Users className="text-rose-500" size={20} />
                Explorateur Utilisateurs
              </h3>
              <div className="flex gap-2">
                 <input 
                  type="text" 
                  placeholder="ID, Email ou Nom..." 
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-rose-500 transition-colors"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                    <th className="pb-4 pt-0 px-2">Acteur</th>
                    <th className="pb-4 pt-0 px-2">Rôle Actuel</th>
                    <th className="pb-4 pt-0 px-2">Dernière Connexion</th>
                    <th className="pb-4 pt-0 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  <tr className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 px-2">
                      <p className="font-bold text-white">Maxence D.</p>
                      <p className="text-xs text-slate-500 italic">maxence@cleanmymap.io</p>
                    </td>
                    <td className="py-4 px-2">
                      <span className="px-2 py-0.5 bg-rose-600/20 text-rose-500 rounded-full text-[10px] font-bold uppercase tracking-tighter border border-rose-600/30">
                        Super Admin
                      </span>
                    </td>
                    <td className="py-4 px-2 text-slate-500 text-xs">Il y a 2 min</td>
                    <td className="py-4 px-2">
                      <button className="text-slate-500 hover:text-white transition">Modifier</button>
                    </td>
                  </tr>
                  {/* Mock rows for UI */}
                  {[1, 2, 3].map((i) => (
                    <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-4 px-2">
                        <p className="font-bold text-white">Citoyen_{i}</p>
                        <p className="text-xs text-slate-500 italic">user_{i}@example.com</p>
                      </td>
                      <td className="py-4 px-2">
                        <span className="px-2 py-0.5 bg-sky-600/20 text-sky-500 rounded-full text-[10px] font-bold uppercase tracking-tighter border border-sky-600/30">
                          Bénévole
                        </span>
                      </td>
                      <td className="py-4 px-2 text-slate-500 text-xs">Il y a {i*2}h</td>
                      <td className="py-4 px-2">
                        <button className="text-slate-500 hover:text-white transition">Modifier</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-slate-500 text-center italic">Plus de 1,240 utilisateurs indexés.</p>
          </div>
        </section>

        {/* SANDBOX & TOOLS */}
        <section className="space-y-8">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 space-y-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:rotate-12 transition-transform duration-500">
              <Terminal size={100} />
            </div>
            <h3 className="text-xl font-bold flex items-center gap-2 relative z-10 text-rose-500">
              <Database size={20} />
              Sandbox & Tests
            </h3>
            <div className="space-y-4 relative z-10">
              <button className="w-full flex items-center gap-3 p-4 bg-slate-950 border border-slate-800 rounded-2xl text-left hover:border-emerald-500 transition-all group/btn">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover/btn:bg-emerald-500 group-hover/btn:text-white transition-colors">
                  <Zap size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold">Générer Actions de Test</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Injecte 50 points d'impact IA</p>
                </div>
              </button>

              <button className="w-full flex items-center gap-3 p-4 bg-slate-950 border border-slate-800 rounded-2xl text-left hover:border-amber-500 transition-all group/btn">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover/btn:bg-amber-500 group-hover/btn:text-white transition-colors">
                  <Flame size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold">Simuler Pic Participation</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">+200 RSVP collectives fictifs</p>
                </div>
              </button>

              <button className="w-full flex items-center gap-3 p-4 bg-slate-950 border border-slate-800 rounded-2xl text-left hover:border-rose-500 transition-all group/btn outline-none">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 group-hover/btn:bg-rose-500 group-hover/btn:text-white transition-colors">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold">Reconstruction MatVues</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Force Supabase Refresh</p>
                </div>
              </button>
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-rose-600 text-white space-y-4">
             <h4 className="font-black uppercase tracking-[0.2em] text-[10px]">Avertissement de Sécurité</h4>
             <p className="text-sm leading-relaxed opacity-90">Toutes vos actions sur ce panel sont logguées et immuables. Chaque injection de données affecte directement les KPI de pilotage global.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
