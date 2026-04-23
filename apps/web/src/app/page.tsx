import { ArrowRight, Leaf, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { PunchySlogan } from "@/components/ui/punchy-slogan";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadPilotageOverview } from "@/lib/pilotage/overview";

async function loadLandingOverview() {
  const supabase = getSupabaseServerClient();
  return loadPilotageOverview({
    supabase,
    periodDays: 365,
    limit: 5000,
  });
}

export default async function HomePage() {
  const overview = await loadLandingOverview().catch(() => null);
  const heroStats = overview
    ? [
        {
          value: overview.summary.kpis[0].value,
          label: overview.summary.kpis[0].label,
        },
        {
          value: overview.summary.kpis[1].value,
          label: overview.summary.kpis[1].label,
        },
        {
          value: overview.summary.kpis[2].value,
          label: overview.summary.kpis[2].label,
        },
      ]
    : [
        { value: "n/a", label: "Impact terrain" },
        { value: "n/a", label: "Mobilisation" },
        { value: "n/a", label: "Qualité data" },
      ];

  return (
    <div className="min-h-screen overflow-hidden bg-slate-50 font-sans">
      <header className="relative overflow-hidden rounded-b-[3rem] bg-slate-900 pb-10 pt-14 sm:pb-12 sm:pt-16 lg:rounded-b-[6rem] lg:pb-24 lg:pt-32">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/30 to-blue-900/60 mix-blend-multiply" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-900 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <div className="order-2 space-y-5 text-center lg:order-1 lg:pt-10 lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-400 animate-in fade-in slide-in-from-bottom-5 duration-700 sm:px-4 sm:py-2 sm:text-xs">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                La Plateforme de Nettoyage Citoyen
              </div>

              <h1 className="animate-in fade-in slide-in-from-bottom-6 text-3xl font-black leading-[0.95] tracking-tighter text-white duration-700 delay-100 sm:text-4xl md:text-6xl lg:text-8xl">
                Reprenez le Contrôle <br />
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  de Votre Territoire.
                </span>
              </h1>

              <p className="mx-auto max-w-3xl animate-in fade-in slide-in-from-bottom-7 text-sm leading-relaxed text-slate-300 duration-700 delay-200 sm:text-base md:text-xl lg:mx-0">
                Navigue librement, découvre les ressources publiques et génère
                un livrable sans compte. La connexion Clerk n&apos;intervient
                que pour les fonctionnalités qui utilisent ton profil.
              </p>

              <div className="flex flex-col items-center justify-center gap-3 pt-1 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 sm:flex-row lg:justify-start">
                <Link
                  href="#visiter-le-site"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)] transition-all hover:scale-105 hover:bg-emerald-400 sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
                >
                  Visiter le site <ArrowRight size={20} />
                </Link>
                <Link
                  href="/sign-in"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20 sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
                >
                  Se connecter
                </Link>
              </div>
            </div>

            <article className="relative order-1 overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 p-4 text-white shadow-[0_24px_80px_-24px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-6 lg:order-2 lg:rounded-[2.5rem] lg:p-8">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/20 blur-2xl" />
              <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />
              <div className="relative space-y-4 sm:space-y-5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300 sm:text-xs">
                  Formulaire bénévole
                </p>
                <h2 className="text-xl font-black tracking-tight sm:text-2xl md:text-4xl">
                  Commencer par l&apos;action la plus utilisée.
                </h2>
                <p className="text-xs leading-relaxed text-slate-300 sm:text-sm md:text-base">
                  Le formulaire bénévole est la fonctionnalité prioritaire du
                  site. Elle demande Clerk uniquement au moment de déclarer une
                  action.
                </p>

                <div className="grid gap-2 rounded-[1.5rem] border border-white/10 bg-slate-950/30 p-3 sm:gap-3 sm:p-4">
                  <div className="flex items-center gap-3 text-xs font-semibold text-white sm:text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-black text-white sm:h-7 sm:w-7 sm:text-xs">
                      1
                    </span>
                    Ouvrir le formulaire
                  </div>
                  <div className="flex items-center gap-3 text-xs font-semibold text-white sm:text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-black text-white sm:h-7 sm:w-7 sm:text-xs">
                      2
                    </span>
                    Se connecter si besoin
                  </div>
                  <div className="flex items-center gap-3 text-xs font-semibold text-white sm:text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-black text-white sm:h-7 sm:w-7 sm:text-xs">
                      3
                    </span>
                    Déclarer l&apos;action
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <Link
                    href="/actions/new"
                    className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-400 sm:px-4 sm:py-3 sm:text-sm"
                  >
                    Ouvrir le formulaire
                  </Link>
                  <Link
                    href="/sign-in"
                    className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/10 sm:px-4 sm:py-3 sm:text-sm"
                  >
                    Se connecter pour déclarer
                  </Link>
                </div>
              </div>
            </article>
          </div>
        </div>
      </header>

      <div className="-mt-8 relative z-20 mx-auto max-w-6xl px-4 sm:px-6">
        <div className="hidden grid-cols-1 gap-8 rounded-[2rem] border border-white bg-white/70 p-8 text-center shadow-2xl backdrop-blur-xl md:grid md:grid-cols-3 md:divide-x md:divide-y-0 divide-y divide-slate-200">
          {heroStats.map((stat) => (
            <div key={stat.label} className="space-y-2 pt-4 md:pt-0">
              <h3 className="text-4xl font-black text-emerald-600 md:text-5xl">
                {stat.value}
              </h3>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-[10px] uppercase tracking-[0.2em] text-slate-400">
          Agrégat réel du dernier rapport public
        </p>
      </div>

      <section id="visiter-le-site" className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
        <div className="rounded-[3rem] border border-slate-200 bg-white/85 p-6 shadow-[0_24px_80px_-24px_rgba(15,23,42,0.28)] backdrop-blur-xl lg:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">
                Visiter le site
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                Découvrir librement, puis se connecter seulement pour les
                fonctionnalités qui utilisent ton profil.
              </h2>
              <p className="mt-3 text-base text-slate-600 md:text-lg">
                La rubrique Apprendre, le dashboard public et les livrables
                restent ouverts. Le formulaire bénévole et les espaces
                personnalisés demandent Clerk uniquement au moment utile.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/learn/hub"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Apprendre
              </Link>
              <Link
                href="/reports"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Générer un livrable
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <article className="relative overflow-hidden rounded-[2.25rem] bg-slate-900 p-6 text-white lg:p-8">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/20 blur-2xl" />
              <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />
              <div className="relative space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                  Aperçu dashboard
                </div>
                <h3 className="text-2xl font-black tracking-tight md:text-3xl">
                  Le cockpit public donne les repères, le compte ouvre les
                  détails personnalisés.
                </h3>
                <p className="max-w-2xl text-sm text-slate-300 md:text-base">
                  Tu vois les signaux principaux tout de suite: impact terrain,
                  mobilisation et qualité des données. Le tableau complet reste
                  à portée si tu veux te connecter ensuite.
                </p>

                <div className="grid gap-3 sm:grid-cols-3">
                  {heroStats.map((stat) => (
                    <div
                      key={`dashboard-${stat.label}`}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm"
                    >
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                        {stat.label}
                      </p>
                      <p className="mt-2 text-2xl font-black text-white">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-400"
                  >
                    Ouvrir le dashboard
                  </Link>
                  <Link
                    href="/reports"
                    className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                  >
                    Lire le livrable
                  </Link>
                </div>
              </div>
            </article>

            <article className="rounded-[2.25rem] border border-emerald-200 bg-emerald-50 p-6 shadow-sm lg:p-8">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
                Formulaire bénévole
              </p>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                Connexion requise uniquement pour déclarer une action.
              </h3>
              <p className="mt-3 text-sm text-slate-700 md:text-base">
                Le formulaire bénévole utilise ton profil Clerk pour
                préremplir les informations utiles et rattacher proprement la
                déclaration à ton compte.
              </p>

              <ul className="mt-5 space-y-3 text-sm text-slate-700">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-black text-emerald-700">
                    1
                  </span>
                  <span>Découvrir le site et les ressources publiques: sans compte.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-black text-emerald-700">
                    2
                  </span>
                  <span>
                    Lire l&apos;apprentissage et générer un livrable: sans
                    compte.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-black text-emerald-700">
                    3
                  </span>
                  <span>
                    Déclarer une action: connexion Clerk au moment du passage à
                    l&apos;acte.
                  </span>
                </li>
              </ul>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/sign-in"
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
                >
                  Se connecter pour déclarer
                </Link>
                <Link
                  href="/actions/new"
                  className="inline-flex items-center justify-center rounded-2xl border border-emerald-300 bg-white px-4 py-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100"
                >
                  Voir le formulaire
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-32">
        <div className="text-center space-y-4">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
            Comment ça marche ?
          </h2>
          <p className="text-lg text-slate-600">
            Une mécanique simple pour un impact territorial massif.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3 mt-12">
          {[
            {
              icon: ShieldCheck,
              title: "Signaler",
              desc: "Marquez les hotspots de pollution sur la carte pour déclencher des interventions.",
              color: "text-rose-500",
              bg: "bg-rose-50",
            },
            {
              icon: Trash2,
              title: "Collecter",
              desc: "Rejoignez ou organisez des événements de ramassage. Identifiez les types de déchets.",
              color: "text-emerald-500",
              bg: "bg-emerald-50",
            },
            {
              icon: Leaf,
              title: "Valoriser",
              desc: "Générez des certificats d'impact et participez à l'intelligence environnementale.",
              color: "text-amber-500",
              bg: "bg-amber-50",
            },
          ].map((feat, i) => (
            <div
              key={i}
              className="group rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:border-emerald-200 hover:shadow-2xl"
            >
              <div
                className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${feat.bg} text-3xl ${feat.color} transition-transform group-hover:scale-110`}
              >
                <feat.icon size={32} />
              </div>
              <h3 className="mb-3 text-xl font-black text-slate-900">
                {feat.title}
              </h3>
              <p className="leading-relaxed text-slate-600">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="rounded-t-[3rem] bg-slate-900 py-12 text-center text-slate-400">
        <PunchySlogan />
        <p className="mt-4 text-sm">
          © 2026 CleanMyMap. Le futur de l&apos;engagement environnemental.
        </p>
      </footer>
    </div>
  );
}
