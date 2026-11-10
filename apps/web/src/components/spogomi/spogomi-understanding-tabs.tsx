import { Footprints, Flag, Scale, Timer, Trophy, Users } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { CmmIcon } from "@/components/ui/cmm-icon";

export type SpogomiUnderstandingExample = {
  id: string;
  text: string;
  sourceLabel: string;
  sourceUrl: string;
  additionalSources?: readonly { href: string; label: string }[];
};

export type SpogomiUnderstandingCopy = {
  howItWorksTitle: string;
  howItWorksDescription: string;
  stepTeamsTitle: string;
  stepTeamsDescription: string;
  stepCollectTitle: string;
  stepCollectDescription: string;
  stepReturnTitle: string;
  stepReturnDescription: string;
  stepSortTitle: string;
  stepSortDescription: string;
  stepPointsTitle: string;
  stepPointsDescription: string;
  formatsTitle: string;
  formatsDescription: string;
  compositionLabel: string;
  processLabel: string;
  pointsLabel: string;
  metricTeamSize: string;
  metricCollection: string;
  metricSorting: string;
  metricMinutes: string;
  metricPeople: string;
  formatDifferenceLabel: string;
  formatDetailsLabel: string;
  casualTitle: string;
  casualDescription: string;
  casualComposition: string;
  casualProcess: string;
  casualPoints: string;
  casualTeamSize: string;
  casualCollection: string;
  casualSorting: string;
  casualDifference: string;
  worldCupTitle: string;
  worldCupDescription: string;
  worldCupComposition: string;
  worldCupProcess: string;
  worldCupPoints: string;
  worldCupTeamSize: string;
  worldCupCollection: string;
  worldCupSorting: string;
  worldCupDifference: string;
  commonRulesTitle: string;
  rulesDescription: string;
  rulesCasual: string;
  rulesWorldCup: string;
  rulesSafety: string;
  rulesSanctions: string;
  rulesHistoricalExamplesTitle: string;
  rulesPrivacyNote: string;
  examples: SpogomiUnderstandingExample[];
};

const steps = [
  { titleKey: "stepTeamsTitle", descriptionKey: "stepTeamsDescription", icon: Users },
  { titleKey: "stepCollectTitle", descriptionKey: "stepCollectDescription", icon: Footprints },
  { titleKey: "stepReturnTitle", descriptionKey: "stepReturnDescription", icon: Flag },
  { titleKey: "stepSortTitle", descriptionKey: "stepSortDescription", icon: Scale },
  { titleKey: "stepPointsTitle", descriptionKey: "stepPointsDescription", icon: Trophy },
] as const;

export function SpogomiUnderstandingTabs({ copy }: { copy: SpogomiUnderstandingCopy }) {
  return (
    <div className="space-y-8" data-testid="spogomi-understanding-sections">
      <section id="spogomi-how-it-works" className="scroll-mt-6 space-y-4" aria-labelledby="spogomi-how-it-works-title">
        <div>
          <p className="cmm-text-caption font-black uppercase tracking-[0.16em] text-emerald-700">01</p>
          <h2 id="spogomi-how-it-works-title" className="mt-1 text-2xl font-black text-slate-950">{copy.howItWorksTitle}</h2>
          <p className="cmm-text-body mt-1 max-w-3xl text-slate-950">{copy.howItWorksDescription}</p>
        </div>
        <ol
          className="relative grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
          aria-label={copy.howItWorksTitle}
          data-testid="spogomi-process-timeline"
        >
          <span
            aria-hidden="true"
            className="absolute left-[10%] right-[10%] top-7 hidden h-px bg-emerald-200 xl:block"
          />
          <span
            aria-hidden="true"
            className="absolute bottom-5 left-3 top-5 w-px bg-emerald-200 sm:hidden"
          />
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.titleKey} className="relative min-w-0 pl-8 sm:pl-0" data-testid={`spogomi-process-step-${index + 1}`}>
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-5 size-6 rounded-full border-4 border-white bg-emerald-500 sm:hidden"
                />
                <CmmCard tone="emerald" variant="glass" size="sm" className="relative z-10 flex h-full flex-col gap-3 border-emerald-200/80 bg-white/90 p-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-sm">
                      <CmmIcon icon={Icon} size="lg" />
                    </span>
                    <span className="inline-flex size-7 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-950">
                      {index + 1}
                    </span>
                  </div>
                  <h3 className="font-black text-slate-950">{copy[step.titleKey]}</h3>
                  <p className="text-sm leading-6 text-slate-800">{copy[step.descriptionKey]}</p>
                </CmmCard>
              </li>
            );
          })}
        </ol>
      </section>

      <section id="spogomi-formats-rules" className="scroll-mt-6 space-y-4" aria-labelledby="spogomi-formats-title">
        <div>
          <p className="cmm-text-caption font-black uppercase tracking-[0.16em] text-emerald-700">02</p>
          <h2 id="spogomi-formats-title" className="mt-1 text-2xl font-black text-slate-950">{copy.formatsTitle}</h2>
          <p className="cmm-text-body mt-1 max-w-3xl text-slate-950">{copy.formatsDescription}</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <FormatBlock
            id="casual"
            title={copy.casualTitle}
            description={copy.casualDescription}
            compositionLabel={copy.compositionLabel}
            composition={copy.casualComposition}
            processLabel={copy.processLabel}
            process={copy.casualProcess}
            pointsLabel={copy.pointsLabel}
            points={copy.casualPoints}
            teamSize={copy.casualTeamSize}
            collection={copy.casualCollection}
            sorting={copy.casualSorting}
            difference={copy.casualDifference}
            metricTeamSize={copy.metricTeamSize}
            metricCollection={copy.metricCollection}
            metricSorting={copy.metricSorting}
            metricMinutes={copy.metricMinutes}
            metricPeople={copy.metricPeople}
            differenceLabel={copy.formatDifferenceLabel}
            detailsLabel={copy.formatDetailsLabel}
          />
          <FormatBlock
            id="world-cup"
            title={copy.worldCupTitle}
            description={copy.worldCupDescription}
            compositionLabel={copy.compositionLabel}
            composition={copy.worldCupComposition}
            processLabel={copy.processLabel}
            process={copy.worldCupProcess}
            pointsLabel={copy.pointsLabel}
            points={copy.worldCupPoints}
            teamSize={copy.worldCupTeamSize}
            collection={copy.worldCupCollection}
            sorting={copy.worldCupSorting}
            difference={copy.worldCupDifference}
            metricTeamSize={copy.metricTeamSize}
            metricCollection={copy.metricCollection}
            metricSorting={copy.metricSorting}
            metricMinutes={copy.metricMinutes}
            metricPeople={copy.metricPeople}
            differenceLabel={copy.formatDifferenceLabel}
            detailsLabel={copy.formatDetailsLabel}
          />
        </div>
        <CmmDisclosure summary={copy.commonRulesTitle} tone="slate" size="sm">
          <div className="space-y-4 text-slate-950">
            <p className="cmm-text-body">{copy.rulesDescription}</p>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-6">
              <li>{copy.rulesCasual}</li>
              <li>{copy.rulesWorldCup}</li>
              <li>{copy.rulesSafety}</li>
              <li>{copy.rulesSanctions}</li>
            </ul>
            <CmmDisclosure summary={copy.rulesHistoricalExamplesTitle} tone="slate" size="sm">
              <ul className="list-disc space-y-2 pl-5 text-sm leading-6">
                {copy.examples.map((example) => (
                  <li key={example.id}>
                    <span>{example.text}</span>{" "}
                    <a href={example.sourceUrl} target="_blank" rel="noreferrer" className="font-bold text-slate-800 underline hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500">{example.sourceLabel}</a>
                    {example.additionalSources?.map((source) => (
                      <a key={source.href} href={source.href} target="_blank" rel="noreferrer" className="ml-2 font-bold text-slate-800 underline hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500">{source.label}</a>
                    ))}
                  </li>
                ))}
              </ul>
            </CmmDisclosure>
            <p className="text-sm leading-6 text-slate-800">{copy.rulesPrivacyNote}</p>
          </div>
        </CmmDisclosure>
      </section>
    </div>
  );
}

function FormatBlock({
  id,
  title,
  description,
  compositionLabel,
  composition,
  processLabel,
  process,
  pointsLabel,
  points,
  teamSize,
  collection,
  sorting,
  difference,
  metricTeamSize,
  metricCollection,
  metricSorting,
  metricMinutes,
  metricPeople,
  differenceLabel,
  detailsLabel,
}: {
  id: string;
  title: string;
  description: string;
  compositionLabel: string;
  composition: string;
  processLabel: string;
  process: string;
  pointsLabel: string;
  points: string;
  teamSize: string;
  collection: string;
  sorting: string;
  difference: string;
  metricTeamSize: string;
  metricCollection: string;
  metricSorting: string;
  metricMinutes: string;
  metricPeople: string;
  differenceLabel: string;
  detailsLabel: string;
}) {
  return (
    <CmmCard
      as="article"
      tone="emerald"
      variant="glass"
      className="flex min-w-0 flex-col gap-4 border-emerald-200/80 p-5"
      data-testid={`spogomi-format-card-${id}`}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
          <CmmIcon icon={id === "casual" ? Timer : Trophy} size="lg" />
        </span>
        <div className="min-w-0">
          <h3 className="text-xl font-black text-emerald-950">{title}</h3>
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-2" data-testid="spogomi-format-metrics">
        <FormatMetric icon={Users} label={metricTeamSize} value={teamSize} suffix={metricPeople} />
        <FormatMetric icon={Footprints} label={metricCollection} value={collection} suffix={metricMinutes} />
        <FormatMetric icon={Scale} label={metricSorting} value={sorting} suffix={metricMinutes} />
      </dl>
      <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-950">
        <span className="font-black">{differenceLabel} :</span> {difference}
      </p>
      <CmmDisclosure summary={detailsLabel} tone="emerald" size="sm" defaultOpen>
        <div className="space-y-3 text-sm leading-6 text-slate-900">
          <p>{description}</p>
          <dl className="space-y-2">
            <div><dt className="font-black text-slate-950">{compositionLabel}</dt><dd>{composition}</dd></div>
            <div><dt className="font-black text-slate-950">{processLabel}</dt><dd>{process}</dd></div>
            <div><dt className="font-black text-slate-950">{pointsLabel}</dt><dd>{points}</dd></div>
          </dl>
        </div>
      </CmmDisclosure>
    </CmmCard>
  );
}

function FormatMetric({
  icon,
  label,
  value,
  suffix,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  suffix: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-emerald-100 bg-white/80 px-2 py-3 text-center">
      <CmmIcon icon={icon} size="sm" className="mx-auto text-emerald-700" />
      <dt className="mt-2 text-xs font-black uppercase tracking-[0.1em] text-slate-600">{label}</dt>
      <dd className="mt-1 whitespace-nowrap text-2xl font-black leading-none text-emerald-950">
        {value}
        <span className="ml-1 text-xs font-bold text-slate-600">{suffix}</span>
      </dd>
    </div>
  );
}
