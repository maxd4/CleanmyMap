import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { SpogomiSyntheticDemoNotice } from "@/components/spogomi/spogomi-synthetic-demo-notice";
import {
  SpogomiCachanBalance,
  SpogomiCachanOverview,
  SpogomiCachanRankings,
  SpogomiCachanTeams,
} from "@/components/spogomi/spogomi-cachan-closure-summary";
import { SpogomiPublicEventNavigation } from "@/components/spogomi/spogomi-public-event-navigation";
import { getSpogomiCachanDemoClosureProjection } from "@/lib/spogomi/cachan-closure";
import {
  getSpogomiCachanDemoScenario,
  SPOGOMI_CACHAN_DEMO_ROUTE,
} from "@/lib/spogomi/demo-scenario";
import { buildPageMetadata } from "@/lib/metadata";
import { parseSpogomiEventIntent } from "@/lib/spogomi/navigation-intent";

export const metadata: Metadata = buildPageMetadata(SPOGOMI_CACHAN_DEMO_ROUTE, {
  title: "Démonstration SPOGOMI Cachan",
  description:
    "Scénario synthétique SPOGOMI Cachan en lecture seule, non officiel.",
  robots: { index: false, follow: false },
});

type Props = {
  searchParams?: Promise<{
    focus?: string | string[];
    division?: string | string[];
    tab?: string | string[];
  }>;
};

export default async function SpogomiCachanDemonstrationPage({
  searchParams,
}: Props) {
  const scenario = getSpogomiCachanDemoScenario();
  const closure = getSpogomiCachanDemoClosureProjection();
  const intent = parseSpogomiEventIntent(await searchParams);
  const selectedDivision = closure.divisions.find(
    (division) => division.divisionType === intent.division,
  );
  const selectedDivisionType = selectedDivision?.divisionType ?? "casual";
  const visibleTeams = selectedDivision
    ? scenario.teams.filter(
        (team) => team.division_ref === selectedDivision.divisionRef,
      )
    : scenario.teams;
  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-emerald-50 px-4 py-10">
      <div className="cmm-page-width space-y-6">
        <Link
          href="/spogomi"
          className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:underline"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Retour au catalogue SPOGOMI
        </Link>
        <SpogomiPublicEventNavigation
          baseHref={SPOGOMI_CACHAN_DEMO_ROUTE}
          name={scenario.scenario_name}
          locationLabel={closure.edition.locationLabel}
          startsAtLabel={`${closure.edition.date} · ${closure.edition.timezone}`}
          modeLabel="Casual & World Cup — deux classements séparés"
          lifecycleLabel="Terminée"
          resultsLabel="Classement final simulé, non officiel"
          divisions={closure.divisions.map((division) => ({
            id: division.divisionRef,
            type: division.divisionType,
          }))}
          selectedDivisionType={selectedDivisionType}
          activeTab={intent.tab}
          synthetic
          keyFigures={[
            { label: "Places", value: String(closure.placesCount) },
            {
              label: "Équipes",
              value: String(
                selectedDivision?.teams.length ?? closure.teamCount,
              ),
            },
            {
              label: "Présents vérifiés",
              value: String(
                selectedDivision
                  ? selectedDivision.teams.reduce(
                      (sum, team) => sum + team.presentParticipants,
                      0,
                    )
                  : closure.presentParticipants,
              ),
            },
            { label: "Divisions", value: String(closure.divisionCount) },
          ]}
        />
        <SpogomiSyntheticDemoNotice>
          <p>
            Cette page lit directement les fixtures canoniques du scénario et de
            sa clôture synthétique. Elle ne crée aucune édition, action, équipe,
            mesure, statistique, classement officiel ou progression dans
            CleanMyMap.
          </p>
        </SpogomiSyntheticDemoNotice>
        <section
          id="spogomi-tab-overview"
          className="scroll-mt-6 space-y-4"
          aria-labelledby="cachan-overview-title"
        >
          <h2 id="cachan-overview-title" className="sr-only">
            Aperçu de la simulation
          </h2>
          <SpogomiCachanOverview projection={closure} />
        </section>
        <SpogomiCachanTeams projection={closure} teams={visibleTeams} />
        <SpogomiCachanRankings
          projection={closure}
          divisionFilter={selectedDivision?.divisionType}
        />
        <SpogomiCachanBalance
          projection={closure}
          divisionFilter={selectedDivision?.divisionType}
        />
        <section
          id="spogomi-tab-information"
          className="scroll-mt-6"
          aria-labelledby="cachan-information-title"
        >
          <CmmCard tone="slate" variant="glass" className="space-y-3 p-5">
            <h2
              id="cachan-information-title"
              className="text-xl font-black text-slate-950"
            >
              Informations et traçabilité
            </h2>
            <dl className="grid gap-3 text-sm text-slate-800 sm:grid-cols-2">
              <div>
                <dt className="font-black text-slate-950">
                  Référence scénario
                </dt>
                <dd>{scenario.scenario_ref}</dd>
              </div>
              <div>
                <dt className="font-black text-slate-950">
                  Extension de clôture
                </dt>
                <dd>{closure.extensionRef}</dd>
              </div>
              <div>
                <dt className="font-black text-slate-950">Action parent</dt>
                <dd>{scenario.parent_action_ref} · non persistée</dd>
              </div>
              <div>
                <dt className="font-black text-slate-950">Règlements</dt>
                <dd>{closure.edition.regulationsUsed.join(", ")}</dd>
              </div>
            </dl>
            <p className="text-sm leading-6 text-slate-900">
              Lieu générique, déroulement et mesures fictifs. Les références
              `source_row` conservent un rapprochement historique ; elles ne
              prouvent pas les masses. Les valeurs nulles restent distinctes des
              zéros explicites.
            </p>
          </CmmCard>
        </section>
        <CmmButton href="/spogomi" tone="secondary" size="sm" variant="pill">
          Revenir aux compétitions publiées
        </CmmButton>
      </div>
    </main>
  );
}
