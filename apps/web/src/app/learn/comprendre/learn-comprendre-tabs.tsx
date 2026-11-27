"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { BookOpen, Calculator, Globe, Landmark, Palette, Target } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { EnvironmentalPolicyExplorer } from "@/components/learn/environmental-policy-explorer";
import { tabItemClassName, tabStripClassName } from "@/components/ui/cmm-tab-strip.styles";
import type { EnvironmentalPolicyRecord } from "@/lib/learning/policies/environmental-policy-registry";
import type { PresidentialPublicArchive } from "@/lib/learning/policies/presidential-environmental-corpus";
import type { Locale } from "@/lib/ui/preferences";
import {
  LearnDeepDiveSection,
  LearnReadingFlowSection,
  LearnClimateSection,
  LearnGoalsSection,
  LearnScaleSection,
} from "./learn-comprendre-sections";

const THEMES = [
  { id: "reperes", icon: BookOpen, label: { fr: "Repères", en: "Essentials" } },
  { id: "ordres-de-grandeur", icon: Calculator, label: { fr: "Ordres de grandeur", en: "Orders of magnitude" } },
  { id: "climat-planete", icon: Globe, label: { fr: "Climat et planète", en: "Climate and planet" } },
  { id: "odd", icon: Target, label: { fr: "Objectifs mondiaux", en: "Global goals" } },
  { id: "politiques", icon: Landmark, label: { fr: "Politiques publiques", en: "Public policies" } },
  { id: "art", icon: Palette, label: { fr: "Art et environnement", en: "Art and environment" } },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];
type Props = {
  locale: Locale;
  publishedPolicies: EnvironmentalPolicyRecord[];
  presidentialArchive: PresidentialPublicArchive;
};

export function LearnComprendreTabs({ locale, publishedPolicies, presidentialArchive }: Props) {
  const baseId = useId();
  const [active, setActive] = useState<ThemeId>("reperes");

  function selectFromKeyboard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown": next = (index + 1) % THEMES.length; break;
      case "ArrowLeft":
      case "ArrowUp": next = (index + THEMES.length - 1) % THEMES.length; break;
      case "Home": next = 0; break;
      case "End": next = THEMES.length - 1; break;
      default: return;
    }
    event.preventDefault();
    const theme = THEMES[next];
    if (!theme) return;
    setActive(theme.id);
    document.getElementById(`${baseId}-tab-${theme.id}`)?.focus();
  }

  function renderPanel(theme: ThemeId) {
    switch (theme) {
      case "reperes": return <LearnReadingFlowSection locale={locale} />;
      case "ordres-de-grandeur": return <LearnScaleSection locale={locale} />;
      case "climat-planete": return <LearnClimateSection locale={locale} />;
      case "odd": return <LearnGoalsSection locale={locale} />;
      case "politiques": return <>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label={locale === "fr" ? "Couverture documentaire" : "Documentary coverage"}>
          {[
            [publishedPolicies.length, locale === "fr" ? "Fiches publiques" : "Published records"],
            [presidentialArchive.candidates.length, locale === "fr" ? "Candidatures répertoriées" : "Listed candidacies"],
            [presidentialArchive.validatedCommitments.length, locale === "fr" ? "Engagements publics validés" : "Validated public commitments"],
          ].map(([count, label]) => <CmmCard key={label} tone="family"><p className="text-3xl font-bold tabular-nums cmm-text-primary">{count}</p><p className="cmm-text-body">{label}</p></CmmCard>)}
        </div>
        <EnvironmentalPolicyExplorer publishedPolicies={publishedPolicies} presidentialArchive={presidentialArchive} />
      </>;
      case "art": return <LearnDeepDiveSection locale={locale} />;
    }
  }

  return (
    <div className="space-y-5 md:space-y-6" data-testid="learn-comprendre-themes">
      <div role="tablist" aria-label={locale === "fr" ? "Thèmes de vulgarisation" : "Environmental science themes"}
        className={tabStripClassName("family", "grid-cols-2 md:grid-cols-3 xl:grid-cols-6")}>
        {THEMES.map(({ id, icon: Icon, label }, index) => (
          <button key={id} type="button" id={`${baseId}-tab-${id}`} role="tab"
            aria-controls={`${baseId}-panel-${id}`} aria-selected={active === id}
            tabIndex={active === id ? 0 : -1} onClick={() => setActive(id)}
            onKeyDown={(event) => selectFromKeyboard(event, index)}
            className={tabItemClassName("family", active === id)}>
            <Icon className="mr-2 h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{label[locale]}</span>
          </button>
        ))}
      </div>
      {/* Keep panels mounted so inputs and filters survive tab switches. Hidden
          panels leave the accessibility tree; deferred modules load near the viewport. */}
      {THEMES.map(({ id }) => (
        <div key={id} role="tabpanel" id={`${baseId}-panel-${id}`} aria-labelledby={`${baseId}-tab-${id}`}
          hidden={active !== id} tabIndex={0} className="space-y-5 md:space-y-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
          {renderPanel(id)}
        </div>
      ))}
    </div>
  );
}
