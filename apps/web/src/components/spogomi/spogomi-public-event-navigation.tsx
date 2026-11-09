import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import {
  type SpogomiEventDivisionType,
  type SpogomiEventTab,
} from "@/lib/spogomi/navigation-intent";
import { resolvePageFamily } from "@/lib/ui/page-families";

type Division = { id: string; type: SpogomiEventDivisionType };

type Props = {
  baseHref: string;
  name: string;
  locationLabel: string;
  startsAtLabel: string;
  modeLabel: string;
  lifecycleLabel: string;
  resultsLabel: string;
  subtitle?: string;
  divisions: Division[];
  selectedDivisionType?: SpogomiEventDivisionType;
  activeTab: SpogomiEventTab;
  keyFigures: Array<{ label: string; value: string }>;
  synthetic?: boolean;
};

const TAB_LABELS: Record<SpogomiEventTab, string> = {
  overview: "Aperçu",
  teams: "Équipes",
  rankings: "Classements",
  balance: "Bilan",
  information: "Informations",
};

const TAB_ANCHORS: Record<SpogomiEventTab, string> = {
  overview: "spogomi-tab-overview",
  teams: "spogomi-tab-teams",
  rankings: "spogomi-tab-rankings",
  balance: "spogomi-balance",
  information: "spogomi-tab-information",
};

function hrefFor(
  baseHref: string,
  tab: SpogomiEventTab,
  division?: SpogomiEventDivisionType,
) {
  const params = new URLSearchParams({ tab });
  if (division) params.set("division", division);
  return `${baseHref}?${params.toString()}#${TAB_ANCHORS[tab]}`;
}

export function SpogomiPublicEventNavigation({
  baseHref,
  name,
  locationLabel,
  startsAtLabel,
  modeLabel,
  lifecycleLabel,
  resultsLabel,
  subtitle,
  divisions,
  selectedDivisionType,
  activeTab,
  keyFigures,
  synthetic = false,
}: Props) {
  return (
    <>
      <PageHeader
        family={resolvePageFamily(baseHref)}
        tone="emerald"
        title={name}
        subtitle={`${modeLabel} · ${lifecycleLabel} · ${resultsLabel}${subtitle ? ` · ${subtitle}` : ""}`}
      />
      <section
        className="space-y-4"
        aria-labelledby="spogomi-event-summary-title"
      >
        <div className="sr-only">
          <h2 id="spogomi-event-summary-title">Résumé de l’édition</h2>
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-100 bg-white/75 p-3">
            <p className="font-bold text-slate-700">Lieu</p>
            <p className="mt-1 font-black text-slate-950">{locationLabel}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-white/75 p-3">
            <p className="font-bold text-slate-700">Date</p>
            <p className="mt-1 font-black text-slate-950">{startsAtLabel}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-white/75 p-3">
            <p className="font-bold text-slate-700">Résultats</p>
            <p className="mt-1 font-black text-slate-950">{resultsLabel}</p>
          </div>
        </div>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {keyFigures.map((figure) => (
            <div
              key={figure.label}
              className="rounded-xl border border-slate-200 bg-white/70 p-3"
            >
              <dt className="cmm-text-small font-black uppercase tracking-wide text-slate-600">
                {figure.label}
              </dt>
              <dd className="mt-1 text-xl font-black text-slate-950">
                {figure.value}
              </dd>
            </div>
          ))}
        </dl>
        {divisions.length > 1 ? (
          <div
            className="space-y-2"
            aria-labelledby="spogomi-division-selector-title"
          >
            <p
              id="spogomi-division-selector-title"
              className="cmm-text-small font-black uppercase tracking-wide text-slate-600"
            >
              Division affichée
            </p>
            <nav
              className="flex flex-wrap gap-2"
              aria-label="Sélection de division"
            >
              {divisions.map((division) => (
                <Link
                  key={division.id}
                  href={hrefFor(baseHref, activeTab, division.type)}
                  aria-current={
                    division.type === selectedDivisionType ? "page" : undefined
                  }
                  className={`inline-flex min-h-11 items-center rounded-xl px-4 py-2 text-sm font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${division.type === selectedDivisionType ? "bg-emerald-700 text-white" : "border border-slate-300 bg-white text-slate-800 hover:border-emerald-400"}`}
                >
                  {division.type === "world_cup" ? "World Cup" : "Casual"}
                </Link>
              ))}
            </nav>
          </div>
        ) : null}
        {synthetic ? (
          <p className="cmm-text-small font-bold text-amber-900">
            Données synthétiques / non officielles · lecture seule.
          </p>
        ) : null}
      </section>
      <nav
        className="overflow-x-auto border-b border-slate-200"
        aria-label="Navigation de l’édition"
        role="tablist"
      >
        <div className="flex min-w-max gap-1" role="presentation">
          {(Object.keys(TAB_LABELS) as SpogomiEventTab[]).map((tab) => (
            <Link
              key={tab}
              href={hrefFor(baseHref, tab, selectedDivisionType)}
              role="tab"
              aria-selected={activeTab === tab}
              aria-current={activeTab === tab ? "page" : undefined}
              className={`inline-flex min-h-12 items-center border-b-2 px-4 text-sm font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${activeTab === tab ? "border-emerald-700 text-emerald-800" : "border-transparent text-slate-700 hover:border-emerald-300 hover:text-emerald-800"}`}
            >
              {TAB_LABELS[tab]}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

export { TAB_ANCHORS };
