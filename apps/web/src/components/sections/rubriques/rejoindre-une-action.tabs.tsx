"use client";

import Link from "next/link";
import { buildJoinActionTabHref } from "@/lib/sections/join-action-routes";
import type { JoinActionTab } from "./rejoindre-une-action.model";

export type ActionTabDefinition = {
  id: string;
  label: string;
  panelId?: string;
};

const DEFAULT_TABS: readonly ActionTabDefinition[] = [
  { id: "future", label: "Action future", panelId: "join-action-panel-future" },
  { id: "past", label: "Action passée", panelId: "join-action-panel-past" },
];

export function getNextActionTabId(
  tabs: readonly ActionTabDefinition[],
  currentTab: string,
  key: string,
): string | null {
  const currentIndex = tabs.findIndex((tab) => tab.id === currentTab);
  if (currentIndex < 0) return null;

  let nextIndex: number | null = null;
  if (key === "ArrowRight" || key === "ArrowDown") nextIndex = (currentIndex + 1) % tabs.length;
  if (key === "ArrowLeft" || key === "ArrowUp") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  if (key === "Home") nextIndex = 0;
  if (key === "End") nextIndex = tabs.length - 1;
  return nextIndex === null ? null : tabs[nextIndex]?.id ?? null;
}

export function JoinActionTabs({
  activeTab,
  focusActionId = null,
  fr = true,
  tabs = DEFAULT_TABS,
  buildHref,
  searchParams,
  ariaLabel,
  idPrefix = "join-action-tab",
}: {
  activeTab: string;
  focusActionId?: string | null;
  fr?: boolean;
  tabs?: readonly ActionTabDefinition[];
  buildHref?: (tab: string) => string;
  searchParams?: string | URLSearchParams;
  ariaLabel?: string;
  idPrefix?: string;
}) {
  function moveWithKeyboard(currentTab: string, key: string) {
    const nextTab = getNextActionTabId(tabs, currentTab, key);
    if (!nextTab) return;
    const nextLink = document.getElementById(`${idPrefix}-${nextTab}`);
    if (!(nextLink instanceof HTMLAnchorElement)) return;

    nextLink.focus();
    const href = nextLink.getAttribute("href");
    if (href) {
      window.setTimeout(() => window.location.assign(href), 0);
    }
  }

  return (
    <nav
      aria-label={ariaLabel ?? (fr ? "Onglets des actions" : "Action tabs")}
      role="tablist"
      className="grid w-full grid-cols-2 gap-2 rounded-2xl border border-emerald-100 bg-white p-2 shadow-sm"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const panelId = tab.panelId ?? `${idPrefix.replace(/-tab$/, "-panel")}-${tab.id}`;
        const tabId = `${idPrefix}-${tab.id}`;
        const label = tab.label;
        const href = buildHref
          ? buildHref(tab.id)
          : buildJoinActionTabHref(tab.id as JoinActionTab, focusActionId, searchParams);

        return (
          <Link
            key={tab.id}
            id={tabId}
            href={href}
            role="tab"
            aria-selected={isActive}
            aria-controls={panelId}
            tabIndex={isActive ? 0 : -1}
            onKeyDown={(event) => {
              if (getNextActionTabId(tabs, tab.id, event.key)) {
                event.preventDefault();
                moveWithKeyboard(tab.id, event.key);
              }
            }}
            className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold tracking-normal transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 md:text-base ${isActive ? "bg-emerald-700 text-white shadow-sm" : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-900"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
