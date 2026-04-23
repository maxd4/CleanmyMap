import { ArrowRight, Leaf, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { PunchySlogan } from "@/components/ui/punchy-slogan";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
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
  const nowMs = Date.now();
  const currentFloorMs = nowMs - 365 * 24 * 60 * 60 * 1000;
  const currentContracts = overview
    ? overview.contracts.filter((record) => {
        const observedMs = Date.parse(record.dates.observedAt);
        return (
          record.status === "approved" &&
          Number.isFinite(observedMs) &&
          observedMs >= currentFloorMs &&
          observedMs <= nowMs
        );
      })
    : [];

  const totalButts = currentContracts.reduce(
    (acc, contract) => acc + Number(contract.metadata.cigaretteButts || 0),
    0,
  );
  const totalVolunteers = currentContracts.reduce(
    (acc, contract) => acc + Number(contract.metadata.volunteersCount || 0),
    0,
  );
  const wasteKg = overview?.comparison.current.impactVolumeKg ?? 0;
  const co2AvoidedKg = wasteKg * IMPACT_PROXY_CONFIG.factors.co2KgPerWasteKg;
  const waterSavedLiters = Math.round(
    totalButts * IMPACT_PROXY_CONFIG.factors.waterLitersPerCigaretteButt,
  );
  const euroSaved = Math.round(
    wasteKg * IMPACT_PROXY_CONFIG.factors.euroSavedPerWasteKg,
  );

  const heroStats = overview
    ? [
        {
          value: `${wasteKg.toFixed(1)} kg`,
          label: "Masse de déchets récoltés",
        },
        {
          value: `${totalButts.toLocaleString()} mégots`,
          label: "Mégots retirés",
        },
        {
          value: `${totalVolunteers.toLocaleString()} bénévoles`,
          label: "Bénévoles mobilisés",
        },
        {
          value: `${co2AvoidedKg.toFixed(1)} kg CO2`,
          label: "CO2 évité",
        },
        {
          value: `${waterSavedLiters.toLocaleString()} L`,
          label: "Eau préservée",
        },
        {
          value: `${euroSaved.toLocaleString()} €`,
          label: "Économie de voirie",
        },
      ]
    : [
        { value: "n/a", label: "Masse de déchets récoltés" },
        { value: "n/a", label: "Mégots retirés" },
        { value: "n/a", label: "Bénévoles mobilisés" },
        { value: "n/a", label: "CO2 évité" },
        { value: "n/a", label: "Eau préservée" },
        { value: "n/a", label: "Économie de voirie" },
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

              <div className="grid gap-3 pt-1 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 sm:grid-cols-2 lg:max-w-3xl lg:grid-cols-4 lg:justify-start">
                <Link
                  href="/sign-in"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-white/20 sm:px-6 sm:py-4"
                >
                  Se connecter
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)] transition-all hover:scale-105 hover:bg-emerald-400 sm:px-6 sm:py-4"
                >
                  Visiter le site en tant qu&apos;invité <ArrowRight size={18} />
                </Link>
                <Link
                  href="/actions/new"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-white/20 sm:px-6 sm:py-4"
                >
                  Déclarer une action
                </Link>
                <Link
                  href="/reports"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-900 transition-all hover:bg-emerald-50 sm:px-6 sm:py-4"
                >
                  Générer un rapport d&apos;impact
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
        <div className="grid grid-cols-1 gap-4 rounded-[2rem] border border-white bg-white/70 p-6 text-center shadow-2xl backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {heroStats.map((stat) => (
            <div key={stat.label} className="space-y-2 rounded-[1.5rem] border border-slate-200 bg-slate-950/10 p-5">
              <h3 className="text-3xl font-black text-emerald-600 sm:text-4xl">
                {stat.value}
              </h3>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
            Agrégat réel du dernier rapport public
          </p>
          <Link
            href="/methodologie"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            Voir méthodologie
          </Link>
        </div>
      </div>

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
