import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { PageHeader } from "@/components/ui/page-header";
import { SpogomiSyntheticDemoNotice } from "@/components/spogomi/spogomi-synthetic-demo-notice";
import { getSpogomiCachanDemoScenario, SPOGOMI_CACHAN_DEMO_ROUTE } from "@/lib/spogomi/demo-scenario";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata(SPOGOMI_CACHAN_DEMO_ROUTE, {
  title: "Démonstration SPOGOMI Cachan",
  description: "Scénario synthétique SPOGOMI Cachan en lecture seule, non officiel.",
  robots: { index: false, follow: false },
});

function divisionLabel(value: string) {
  return value === "world_cup" ? "World Cup" : "Casual";
}

function measurementLabel(value: string) {
  if (value === "measured") return "mesures synthétiques renseignées";
  if (value === "explicit_zero") return "zéro explicite synthétique";
  return "mesure initiale absente";
}

export default function SpogomiCachanDemonstrationPage() {
  const scenario = getSpogomiCachanDemoScenario();
  return <main className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-emerald-50 px-4 py-10"><div className="cmm-page-width space-y-6"><Link href="/spogomi" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:underline"><ArrowLeft size={16} aria-hidden="true" />Retour au catalogue SPOGOMI</Link><PageHeader family={resolvePageFamily(SPOGOMI_CACHAN_DEMO_ROUTE)} tone="emerald" title={scenario.scenario_name} subtitle="DEMONSTRATION / NON OFFICIEL · lecture seule" /><SpogomiSyntheticDemoNotice><p>Cette page lit directement la fixture canonique du scénario. Elle ne crée aucune édition, action, équipe, mesure, statistique, classement officiel ou progression dans CleanMyMap.</p></SpogomiSyntheticDemoNotice><CmmCard tone="slate" variant="glass" className="space-y-3 p-5"><h2 className="text-xl font-black text-slate-950">Traçabilité du scénario</h2><dl className="grid gap-3 text-sm text-slate-800 sm:grid-cols-2"><div><dt className="font-black text-slate-950">Référence scénario</dt><dd>{scenario.scenario_ref}</dd></div><div><dt className="font-black text-slate-950">Statut</dt><dd>Simulation fictive uniquement</dd></div><div><dt className="font-black text-slate-950">Action parent</dt><dd>{scenario.parent_action_ref} · non persistée</dd></div><div><dt className="font-black text-slate-950">Source</dt><dd>Fixture canonique mixed Cachan</dd></div></dl><p className="text-sm leading-6 text-slate-700">Les références `source_row` conservent un rapprochement historique ; elles ne prouvent pas les masses. Les vecteurs synthétiques portent une provenance `scenario:TEAM-REF`. Les valeurs nulles restent distinctes des zéros explicites.</p></CmmCard><section className="space-y-4" aria-labelledby="cachan-divisions-title"><div><h2 id="cachan-divisions-title" className="text-2xl font-black text-slate-950">Compositions de la simulation</h2><p className="mt-1 text-sm text-slate-700">Les divisions et les onze équipes reproduisent exactement le manifeste publié, sans les convertir en résultats sportifs réels.</p></div><div className="grid gap-5 lg:grid-cols-2">{scenario.divisions.map((division) => { const teams = scenario.teams.filter((team) => team.division_ref === division.division_ref); return <CmmCard key={division.division_ref} tone="emerald" variant="glass" className="space-y-4 p-5"><div><p className="cmm-text-small font-black uppercase tracking-[0.15em] text-emerald-800">{divisionLabel(division.division_type)}</p><h3 className="text-xl font-black text-emerald-950">{division.division_ref}</h3><p className="text-sm text-slate-700">Règlement synthétique : {division.regulation_ref} · {teams.length} équipes</p></div><div className="space-y-3">{teams.map((team) => <article key={team.team_ref} className="rounded-xl border border-emerald-100 bg-white/75 p-3"><div className="flex flex-wrap items-baseline justify-between gap-2"><h4 className="font-black text-slate-950">{team.team_ref}</h4><span className="cmm-text-small font-bold text-slate-700">{measurementLabel(team.initial_measurement_state)}</span></div><p className="mt-1 text-sm text-slate-700">Places : {team.place_ids.join(", ")}</p><p className="cmm-text-small mt-2 text-slate-600">Score attendu de simulation : {team.expected_score === null ? "non renseigné" : team.expected_score} · aucune valeur publiée</p></article>)}</div></CmmCard>; })}</div></section><CmmButton href="/spogomi" tone="secondary" size="sm" variant="pill">Revenir aux compétitions publiées</CmmButton></div></main>;
}
