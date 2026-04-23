import { ArrowRight, Handshake, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";

export default function PartnersNetworkPage() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-10">
      <header className="text-center space-y-4 py-12 bg-slate-900 rounded-[3rem] text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 to-transparent" />
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black tracking-widest uppercase">
            <ShieldCheck size={14} /> Découvrir le réseau
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter">
            Carte, fiches et partenaires.
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Cette vue sert à explorer les structures, lire leurs fiches et
            comprendre rapidement qui agit dans le réseau local.
          </p>
        </div>
      </header>

      <section className="grid md:grid-cols-[1.1fr_0.9fr] gap-8 items-center bg-white/70 backdrop-blur-xl p-8 md:p-12 rounded-[3rem] border border-slate-200/50 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)]">
        <div className="space-y-6">
          <div className="w-16 h-16 rounded-[2rem] bg-rose-50 flex items-center justify-center text-rose-500 shadow-inner">
            <Users size={32} />
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-slate-900 leading-tight tracking-tight">
            Lecture publique
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-400">
              du réseau local.
            </span>
          </h2>
          <p className="text-slate-600 text-lg">
            Ici, on privilégie la découverte. Les cartes et les fiches restent
            lisibles sans compte, tandis que le pilotage se trouve ailleurs.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/sections/annuaire"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Ouvrir la carte et les fiches <ArrowRight size={16} />
            </Link>
            <Link
              href="/partners/onboarding"
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
            >
              Rejoindre le réseau <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-8 bg-gradient-to-br from-emerald-50 to-teal-50/20 rounded-[2.5rem] space-y-5 border border-emerald-100 shadow-sm">
            <h3 className="text-2xl font-black flex items-center gap-3 text-emerald-950">
              <div className="p-3 bg-white rounded-2xl shadow-sm text-emerald-600">
                <Handshake size={24} />
              </div>
              Ce que vous voyez ici
            </h3>
            <ul className="space-y-3 text-sm text-emerald-900/80">
              <li className="rounded-2xl bg-white/70 p-4 border border-emerald-100">
                Les structures locales, commerces engagés, associations et
                collectifs visibles dans un même espace.
              </li>
              <li className="rounded-2xl bg-white/70 p-4 border border-emerald-100">
                Les fiches publiées servent à la lecture, à la mise en relation
                et à la compréhension du territoire.
              </li>
              <li className="rounded-2xl bg-white/70 p-4 border border-emerald-100">
                Pour les arbitrages, les fiches à réviser et les demandes, il
                faut passer par la vue gouvernance.
              </li>
            </ul>
          </div>

          <Link
            href="/partners/dashboard"
            className="block p-6 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100/50 hover:border-indigo-200 rounded-[2rem] text-indigo-900 transition-all duration-300 group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-500 group-hover:scale-110 transition-transform">
                <ShieldCheck size={24} />
              </div>
              <div>
                <p className="text-sm font-black leading-tight mb-1">
                  Besoin de pilotage ou de validation ?
                </p>
                <p className="text-xs text-indigo-600/80 group-hover:underline">
                  Ouvrir la vue gouvernance / pilotage &rarr;
                </p>
              </div>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
