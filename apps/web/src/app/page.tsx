import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { getProfileEntryPath, toProfile } from "@/lib/profiles";
import Link from "next/link";
import { ArrowRight, Leaf, ShieldCheck, Trash2 } from "lucide-react";
import { PunchySlogan } from "@/components/ui/punchy-slogan";

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) {
    const role = await getCurrentUserRoleLabel();
    const profile = toProfile(role);
    redirect(getProfileEntryPath(profile));
  }

  // Public Landing Page Design (Ultra Premium)
  return (
    <div className="min-h-screen bg-slate-50 overflow-hidden font-sans">
      
      {/* HEADER HERO */}
      <header className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-slate-900 rounded-b-[4rem] md:rounded-b-[6rem]">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/30 to-blue-900/60 mix-blend-multiply" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-900 to-transparent" />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black tracking-widest uppercase animate-in fade-in slide-in-from-bottom-5 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            La Plateforme de Nettoyage Citoyen
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter leading-tight animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            Reprenez le Contrôle <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              de Votre Territoire.
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-7 duration-700 delay-200">
            Signalez les zones polluées, organisez des collectes citoyennes, et transformez vos kilos de déchets en impact mesurable avec CleanMyMap.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <Link 
              href="/sign-up" 
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-emerald-500 text-white font-bold text-lg shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)] hover:bg-emerald-400 hover:scale-105 transition-all"
            >
              Créer mon compte <ArrowRight size={20} />
            </Link>
            <Link 
              href="/sign-in" 
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white/10 text-white font-bold text-lg hover:bg-white/20 transition-all backdrop-blur-sm"
            >
              Me connecter
            </Link>
          </div>
        </div>
      </header>

      {/* METRICS STRIP */}
      <div className="max-w-6xl mx-auto px-6 -mt-16 relative z-20">
        <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2rem] p-8 shadow-2xl grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-slate-200">
          <div className="space-y-2 pt-4 md:pt-0">
            <h3 className="text-5xl font-black text-emerald-600">8M</h3>
            <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">Tonnes de déchets</p>
          </div>
          <div className="space-y-2 pt-4 md:pt-0">
            <h3 className="text-5xl font-black text-emerald-600">450+</h3>
            <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">Points Noirs Signalés</p>
          </div>
          <div className="space-y-2 pt-4 md:pt-0">
            <h3 className="text-5xl font-black text-emerald-600">12k</h3>
            <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">Bénévoles Actifs</p>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <section className="py-32 max-w-7xl mx-auto px-6 space-y-20">
        <div className="text-center space-y-4">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Comment ça marche ?</h2>
          <p className="text-lg text-slate-600">Une mécanique simple pour un impact territorial massif.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: ShieldCheck,
              title: "Signaler",
              desc: "Marquez les hotspots de pollution sur la carte pour déclencher des interventions.",
              color: "text-rose-500",
              bg: "bg-rose-50"
            },
            {
              icon: Trash2,
              title: "Collecter",
              desc: "Rejoignez ou organisez des événements de ramassage. Identifiez les types de déchets.",
              color: "text-emerald-500",
              bg: "bg-emerald-50"
            },
            {
              icon: Leaf,
              title: "Valoriser",
              desc: "Générez des certificats d'impact et participez à l'intelligence environnementale.",
              color: "text-amber-500",
              bg: "bg-amber-50"
            }
          ].map((feat, i) => (
             <div key={i} className="group p-8 bg-white rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:border-emerald-200 transition-all duration-300">
               <div className={`w-16 h-16 rounded-2xl ${feat.bg} flex items-center justify-center text-3xl ${feat.color} mb-6 group-hover:scale-110 transition-transform`}>
                 <feat.icon size={32} />
               </div>
               <h3 className="text-xl font-black text-slate-900 mb-3">{feat.title}</h3>
               <p className="text-slate-600 leading-relaxed">{feat.desc}</p>
             </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-12 text-center rounded-t-[3rem]">
         <PunchySlogan />
         <p className="text-sm mt-4">© 2026 CleanMyMap. Le futur de l'engagement environnemental.</p>
      </footer>
    </div>
  );
}
