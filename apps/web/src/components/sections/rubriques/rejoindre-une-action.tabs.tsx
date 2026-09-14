"use client";

import Link from "next/link";
import { buildJoinActionTabHref } from "@/lib/sections/join-action-routes";
import type { JoinActionTab } from "./rejoindre-une-action.model";

const TABS: readonly JoinActionTab[] = ["future", "past"];

export function JoinActionTabs({
  activeTab,
  focusActionId,
  fr,
}: {
  activeTab: JoinActionTab;
  focusActionId: string | null;
  fr: boolean;
}) {
  function moveWithKeyboard(currentTab: JoinActionTab, key: string) {
    const currentIndex = TABS.indexOf(currentTab);
    let nextIndex: number | null = null;

    if (key === "ArrowRight" || key === "ArrowDown") nextIndex = (currentIndex + 1) % TABS.length;
    if (key === "ArrowLeft" || key === "ArrowUp") nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
    if (key === "Home") nextIndex = 0;
    if (key === "End") nextIndex = TABS.length - 1;
    if (nextIndex === null) return;

    const nextTab = TABS[nextIndex];
    const nextLink = document.getElementById(`join-action-tab-${nextTab}`);
    if (!(nextLink instanceof HTMLAnchorElement)) return;

    nextLink.focus();
    nextLink.click();
  }

  return (
    <nav
      aria-label={fr ? "Onglets des actions" : "Action tabs"}
      role="tablist"
      className="flex flex-wrap gap-2 rounded-2xl border border-emerald-100 bg-white p-2 shadow-sm"
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab;
        const label = tab === "future"
          ? (fr ? "Actions futures" : "Future actions")
          : (fr ? "Actions passées" : "Past actions");

        return (
          <Link
            key={tab}
            id={`join-action-tab-${tab}`}
            href={buildJoinActionTabHref(tab, focusActionId)}
            role="tab"
            aria-selected={isActive}
            aria-controls={`join-action-panel-${tab}`}
            tabIndex={isActive ? 0 : -1}
            onKeyDown={(event) => {
              if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key)) {
                event.preventDefault();
                moveWithKeyboard(tab, event.key);
              }
            }}
            className={`rounded-xl px-4 py-2.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 ${isActive ? "bg-emerald-700 text-white shadow-sm" : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-900"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
