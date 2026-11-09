import { CmmCard } from "@/components/ui/cmm-card";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";

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
  casualTitle: string;
  casualDescription: string;
  casualComposition: string;
  casualProcess: string;
  casualPoints: string;
  worldCupTitle: string;
  worldCupDescription: string;
  worldCupComposition: string;
  worldCupProcess: string;
  worldCupPoints: string;
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
  ["stepTeamsTitle", "stepTeamsDescription"],
  ["stepCollectTitle", "stepCollectDescription"],
  ["stepReturnTitle", "stepReturnDescription"],
  ["stepSortTitle", "stepSortDescription"],
  ["stepPointsTitle", "stepPointsDescription"],
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
        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label={copy.howItWorksTitle}>
          {steps.map(([titleKey, descriptionKey], index) => (
            <li key={titleKey} className="min-w-0 rounded-2xl border border-emerald-100 bg-white/80 p-4 shadow-sm">
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-900">{index + 1}</span>
              <h3 className="mt-3 font-black text-slate-950">{copy[titleKey]}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-800">{copy[descriptionKey]}</p>
            </li>
          ))}
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
            title={copy.casualTitle}
            description={copy.casualDescription}
            compositionLabel={copy.compositionLabel}
            composition={copy.casualComposition}
            processLabel={copy.processLabel}
            process={copy.casualProcess}
            pointsLabel={copy.pointsLabel}
            points={copy.casualPoints}
          />
          <FormatBlock
            title={copy.worldCupTitle}
            description={copy.worldCupDescription}
            compositionLabel={copy.compositionLabel}
            composition={copy.worldCupComposition}
            processLabel={copy.processLabel}
            process={copy.worldCupProcess}
            pointsLabel={copy.pointsLabel}
            points={copy.worldCupPoints}
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
  title,
  description,
  compositionLabel,
  composition,
  processLabel,
  process,
  pointsLabel,
  points,
}: {
  title: string;
  description: string;
  compositionLabel: string;
  composition: string;
  processLabel: string;
  process: string;
  pointsLabel: string;
  points: string;
}) {
  return (
    <CmmCard tone="emerald" variant="glass" className="min-w-0 space-y-4 p-5">
      <div>
        <h3 className="text-xl font-black text-emerald-950">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-900">{description}</p>
      </div>
      <dl className="space-y-3 text-sm leading-6 text-slate-900">
        <div><dt className="font-black text-slate-950">{compositionLabel}</dt><dd>{composition}</dd></div>
        <div><dt className="font-black text-slate-950">{processLabel}</dt><dd>{process}</dd></div>
        <div><dt className="font-black text-slate-950">{pointsLabel}</dt><dd>{points}</dd></div>
      </dl>
    </CmmCard>
  );
}
