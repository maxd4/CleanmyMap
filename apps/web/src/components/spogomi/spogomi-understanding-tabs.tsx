"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { BookOpen, Globe2, ShieldCheck, Trophy } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { CmmIcon } from "@/components/ui/cmm-icon";

export type SpogomiUnderstandingExample = {
  id: string;
  text: string;
  sourceLabel: string;
  sourceUrl: string;
};

export type SpogomiUnderstandingCopy = {
  presentationTab: string;
  formatsTab: string;
  rulesTab: string;
  worldTab: string;
  presentationTitle: string;
  presentationDescription: string;
  casualTitle: string;
  casualDescription: string;
  worldCupTitle: string;
  worldCupDescription: string;
  rulesDescription: string;
  rulesCasual: string;
  rulesWorldCup: string;
  rulesSafety: string;
  rulesSanctions: string;
  rulesHistoricalExamplesTitle: string;
  rulesPrivacyNote: string;
  examples: SpogomiUnderstandingExample[];
  worldDescription: string;
  cleanMyMapRole: string;
  worldSectionLink: string;
};

type TabId = "presentation" | "formats" | "rules" | "world";

const TAB_IDS: TabId[] = ["presentation", "formats", "rules", "world"];

function tabIcon(tabId: TabId) {
  if (tabId === "presentation") return BookOpen;
  if (tabId === "formats") return Trophy;
  if (tabId === "rules") return ShieldCheck;
  return Globe2;
}

export function SpogomiUnderstandingTabs({ copy }: { copy: SpogomiUnderstandingCopy }) {
  const [activeTab, setActiveTab] = useState<TabId>("presentation");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function selectTab(tabId: TabId) {
    setActiveTab(tabId);
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, tabId: TabId) {
    const currentIndex = TAB_IDS.indexOf(tabId);
    const nextIndex = event.key === "ArrowRight"
      ? (currentIndex + 1) % TAB_IDS.length
      : event.key === "ArrowLeft"
        ? (currentIndex - 1 + TAB_IDS.length) % TAB_IDS.length
        : event.key === "Home"
          ? 0
          : event.key === "End"
            ? TAB_IDS.length - 1
            : -1;

    if (nextIndex < 0) return;

    event.preventDefault();
    const nextTab = TAB_IDS[nextIndex];
    selectTab(nextTab);
    tabRefs.current[nextIndex]?.focus();
  }

  const labels: Record<TabId, string> = {
    presentation: copy.presentationTab,
    formats: copy.formatsTab,
    rules: copy.rulesTab,
    world: copy.worldTab,
  };

  return (
    <div className="space-y-3" data-testid="spogomi-understanding-tabs">
      <div
        className="grid gap-2 rounded-2xl border border-slate-200 bg-white/80 p-2 sm:grid-cols-2 xl:grid-cols-4"
        role="tablist"
        aria-label={copy.presentationTab}
      >
        {TAB_IDS.map((tabId, index) => {
          const Icon = tabIcon(tabId);
          const selected = activeTab === tabId;
          return (
            <CmmButton
              key={tabId}
              ref={(element) => { tabRefs.current[index] = element; }}
              id={`spogomi-understanding-tab-${tabId}`}
              role="tab"
              ariaControls={`spogomi-understanding-panel-${tabId}`}
              ariaSelected={selected}
              tabIndex={selected ? 0 : -1}
              tone={selected ? "primary" : "secondary"}
              variant="pill"
              size="md"
              onClick={() => selectTab(tabId)}
              onKeyDown={(event) => handleTabKeyDown(event, tabId)}
              className="min-w-0 justify-center whitespace-normal text-center"
            >
              <Icon size={17} aria-hidden="true" />
              {labels[tabId]}
            </CmmButton>
          );
        })}
      </div>

      <CmmCard tone="emerald" variant="glass" className="p-5 sm:p-6">
        <div
          id={`spogomi-understanding-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`spogomi-understanding-tab-${activeTab}`}
          tabIndex={0}
          className="min-w-0"
        >
          {activeTab === "presentation" && <PresentationPanel copy={copy} />}
          {activeTab === "formats" && <FormatsPanel copy={copy} />}
          {activeTab === "rules" && <RulesPanel copy={copy} />}
          {activeTab === "world" && <WorldPanel copy={copy} />}
        </div>
      </CmmCard>
    </div>
  );
}

function PresentationPanel({ copy }: { copy: SpogomiUnderstandingCopy }) {
  return (
    <div className="max-w-3xl space-y-2">
      <h3 className="text-xl font-black text-slate-950">{copy.presentationTitle}</h3>
      <p className="cmm-text-body text-slate-950">{copy.presentationDescription}</p>
    </div>
  );
}

function FormatsPanel({ copy }: { copy: SpogomiUnderstandingCopy }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormatBlock title={copy.casualTitle} description={copy.casualDescription} />
      <FormatBlock title={copy.worldCupTitle} description={copy.worldCupDescription} />
    </div>
  );
}

function FormatBlock({ title, description }: { title: string; description: string }) {
  return (
    <article className="min-w-0 rounded-xl border border-slate-200 bg-white/70 p-4">
      <h3 className="text-lg font-black text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-900">{description}</p>
    </article>
  );
}

function RulesPanel({ copy }: { copy: SpogomiUnderstandingCopy }) {
  return (
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
              <a
                href={example.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-bold text-slate-800 underline hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              >
                {example.sourceLabel}
              </a>
            </li>
          ))}
        </ul>
      </CmmDisclosure>
      <p className="text-sm leading-6 text-slate-800">{copy.rulesPrivacyNote}</p>
    </div>
  );
}

function WorldPanel({ copy }: { copy: SpogomiUnderstandingCopy }) {
  return (
    <div className="max-w-3xl space-y-3">
      <div className="flex items-start gap-3">
        <CmmIcon icon={Globe2} className="mt-1 shrink-0 text-emerald-700" />
        <div className="space-y-2">
          <h3 className="text-xl font-black text-slate-950">{copy.worldTab}</h3>
          <p className="cmm-text-body text-slate-950">{copy.worldDescription}</p>
          <p className="text-sm leading-6 text-slate-900">{copy.cleanMyMapRole}</p>
          <CmmButton href="#spogomi-international" tone="secondary" variant="ghost" size="sm" className="px-0 text-left">
            {copy.worldSectionLink}
          </CmmButton>
        </div>
      </div>
    </div>
  );
}
