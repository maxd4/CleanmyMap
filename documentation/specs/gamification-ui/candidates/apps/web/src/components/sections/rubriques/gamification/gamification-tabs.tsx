"use client";

import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { Award, Compass, Target, Trophy, Users } from "lucide-react";
import { tabItemClassName, tabStripClassName } from "@/components/ui/cmm-tab-strip.styles";
import type { GamificationSummary } from "@/lib/gamification/progression/gamification-summary";
import { focusGamificationTarget } from "./gamification-focus";

export const GAMIFICATION_TABS = [
  { id: "acquired", fr: "Mes acquis", en: "Achievements", icon: Trophy },
  { id: "active", fr: "En cours", en: "In progress", icon: Target },
  { id: "discover", fr: "À débloquer", en: "To unlock", icon: Compass },
  { id: "community", fr: "Communauté", en: "Community", icon: Users },
  { id: "badges", fr: "Badges", en: "Badges", icon: Award },
] as const;

export type GamificationTab = (typeof GAMIFICATION_TABS)[number]["id"];

export function tabForGamificationTarget(id: string, summary?: GamificationSummary): GamificationTab | null {
  if (id === "gamification-reconciliation-history" || id === "gamification-level-progress" || id.startsWith("acquired-progression-")) return "acquired";
  if (id === "spogomi-collection" || id === "gamification-terrain-specializations") return "badges";
  if (id === "gamification-progressions-new" || id === "gamification-milestones-new") return "discover";
  if (id === "gamification-progressions" || id === "gamification-milestones") return "badges";
  if (id.startsWith("progression-")) {
    const item = summary?.progressions.find((entry) => `progression-${entry.id}` === id);
    if (item?.state === "not_started") return "discover";
    if (item?.state === "in_progress") return "active";
    return null;
  }
  if (id.startsWith("milestone-")) {
    const item = summary?.milestones.find((entry) => `milestone-${entry.id}` === id);
    if (item?.state === "completed") return "acquired";
    if (item?.state === "in_progress") return "active";
    if (item?.state === "not_started") return "discover";
  }
  return null;
}

export function GamificationTabs({ locale, summary, receiptId, renderPanel }: {
  locale: string; summary?: GamificationSummary; receiptId: string | null;
  renderPanel: (tab: GamificationTab) => ReactNode;
}) {
  const [tab, setTab] = useState<GamificationTab>("acquired");
  const [target, setTarget] = useState<string | null>(null);
  const fr = locale === "fr";

  useEffect(() => {
    if (receiptId) setTab("acquired");
  }, [receiptId]);

  useEffect(() => {
    const reveal = () => {
      let id: string;
      try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
      const next = tabForGamificationTarget(id, summary);
      if (!next) return;
      setTab(next);
      setTarget(id);
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, [summary]);

  useEffect(() => {
    if (!target || tabForGamificationTarget(target, summary) !== tab) return;
    const frame = window.requestAnimationFrame(() => {
      focusGamificationTarget(target);
      setTarget(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [target, tab, summary]);

  function select(next: GamificationTab) {
    setTab(next);
    setTarget(null);
    if (window.location.hash) window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
  }

  function onKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % GAMIFICATION_TABS.length;
    else if (event.key === "ArrowLeft") next = (index + GAMIFICATION_TABS.length - 1) % GAMIFICATION_TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = GAMIFICATION_TABS.length - 1;
    else return;
    event.preventDefault();
    const id = GAMIFICATION_TABS[next].id;
    select(id);
    document.getElementById(`gamification-tab-${id}`)?.focus();
  }

  return <div className="space-y-4">
    <div role="tablist" aria-label={fr ? "Progression et récompenses" : "Progress and rewards"} className={tabStripClassName("family", "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5")}>
      {GAMIFICATION_TABS.map(({ id, icon: Icon, fr: labelFr, en }, index) => <button key={id} id={`gamification-tab-${id}`} type="button" role="tab" aria-selected={id === tab} aria-controls={`gamification-panel-${id}`} tabIndex={id === tab ? 0 : -1}
        className={tabItemClassName("family", id === tab)} onClick={() => select(id)} onKeyDown={(event) => onKey(event, index)}>
        <Icon size={19} className="mr-2 shrink-0" aria-hidden="true" />{fr ? labelFr : en}
      </button>)}
    </div>
    {GAMIFICATION_TABS.map(({ id }) => <div key={id} id={`gamification-panel-${id}`} role="tabpanel" aria-labelledby={`gamification-tab-${id}`} hidden={id !== tab} tabIndex={id === tab ? 0 : -1} className="min-w-0 space-y-5">
      {id === tab ? renderPanel(id) : null}
    </div>)}
  </div>;
}
