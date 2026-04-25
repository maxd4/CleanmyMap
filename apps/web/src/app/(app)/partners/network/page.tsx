import { ArrowRight, Handshake, ShieldCheck, Users, Search, UserPlus, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { NavigationGrid, type NavigationGridItem } from "@/components/ui/navigation-grid";

export default function PartnersNetworkPage() {
  const networkActions: NavigationGridItem[] = [
    {
      icon: Search,
      title: "Explorer le réseau",
      desc: "Ouvrir l'annuaire et la carte des structures locales pour découvrir les acteurs du territoire.",
      iconBg: "bg-emerald-900/50",
      iconColor: "text-emerald-300",
      accent: "from-emerald-900/40 to-emerald-800/10",
      ring: "ring-emerald-700/40",
      dot: "bg-emerald-400",
      href: "/sections/annuaire",
    },
    {
      icon: UserPlus,
      title: "Rejoindre le réseau",
      desc: "Inscrire votre structure (association, commerce, collectif) pour devenir visible sur la carte.",
      iconBg: "bg-rose-900/50",
      iconColor: "text-rose-300",
      accent: "from-rose-900/40 to-rose-800/10",
      ring: "ring-rose-700/40",
      dot: "bg-rose-400",
      href: "/partners/onboarding",
    },
    {
      icon: LayoutDashboard,
      title: "Espace Gouvernance",
      desc: "Accéder au tableau de bord de pilotage, valider les fiches et gérer les demandes du réseau.",
      iconBg: "bg-indigo-900/50",
      iconColor: "text-indigo-300",
      accent: "from-indigo-900/40 to-indigo-800/10",
      ring: "ring-indigo-700/40",
      dot: "bg-indigo-400",
      href: "/partners/dashboard",
    }
  ];

  return (
    <div className="w-full p-4 md:p-8 space-y-12">
      <header className="text-center space-y-4 py-16 bg-slate-900 rounded-[3rem] text-white overflow-hidden relative shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/30 via-slate-900 to-indigo-900/20" />
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")"}} />
        
        <div className="relative z-10 space-y-6 px-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black tracking-widest uppercase">
            <Handshake size={14} /> Réseau Local
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">
            Collaborer et <br /> s&apos;engager localement.
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto font-light">
            Découvrez les structures, consultez les fiches et rejoignez la dynamique de territoire pour un impact durable.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl">
        <NavigationGrid items={networkActions} columns={{ default: 1, md: 3 }} />
      </div>

      <section className="grid md:grid-cols-[1fr_1fr] gap-8 items-stretch bg-white/70 backdrop-blur-xl p-8 md:p-12 rounded-[3rem] border border-slate-200/50 shadow-xl">
        <div className="space-y-6 flex flex-col justify-center">
          <div className="w-16 h-16 rounded-[2rem] bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
            <Users size={32} />
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-slate-900 leading-tight tracking-tight">
            Transparence <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
              et coordination.
            </span>
          </h2>
          <p className="text-slate-600 text-lg leading-relaxed">
            Ici, on privilégie la découverte et la visibilité. Les cartes et les fiches restent
            accessibles à tous, favorisant la mise en relation directe et la compréhension du maillage local.
          </p>
        </div>

        <div className="space-y-6">
          <div className="p-8 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-[2.5rem] space-y-5 border border-slate-200 shadow-sm h-full">
            <h3 className="text-2xl font-black flex items-center gap-3 text-slate-900">
              <div className="p-3 bg-white rounded-2xl shadow-sm text-slate-600">
                <Handshake size={24} />
              </div>
              Ce que vous trouverez
            </h3>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="rounded-2xl bg-white/70 p-4 border border-slate-100 flex items-start gap-3">
                <span className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                Les commerces engagés, associations et collectifs visibles dans un même espace.
              </li>
              <li className="rounded-2xl bg-white/70 p-4 border border-slate-100 flex items-start gap-3">
                <span className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                Des fiches détaillées pour comprendre les missions de chaque acteur du réseau.
              </li>
              <li className="rounded-2xl bg-white/70 p-4 border border-slate-100 flex items-start gap-3">
                <span className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                Un accès direct aux outils de pilotage pour les administrateurs du réseau.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

