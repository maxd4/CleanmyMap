"use client";

import { SOURCE_FILTERS, STATUS_FILTERS } from "./inbox-constants";
import type { CreatorInboxCopy } from "./creator-inbox-copy";
import type { CreatorInboxSource, CreatorInboxStatus } from "@/lib/community/creator-inbox";

type InboxFilterBarProps = {
  copy: CreatorInboxCopy;
  query: string;
  onQueryChange: (value: string) => void;
  sourceFilter: "all" | CreatorInboxSource;
  onSourceFilterChange: (value: "all" | CreatorInboxSource) => void;
  statusFilter: "all" | CreatorInboxStatus;
  onStatusFilterChange: (value: "all" | CreatorInboxStatus) => void;
  partnerConfirm: string;
  onPartnerConfirmChange: (value: string) => void;
  refreshing: boolean;
  filteredCount: number;
  onRefresh: () => void;
};

export function InboxFilterBar({
  copy,
  query,
  onQueryChange,
  sourceFilter,
  onSourceFilterChange,
  statusFilter,
  onStatusFilterChange,
  partnerConfirm,
  onPartnerConfirmChange,
  refreshing,
  filteredCount,
  onRefresh,
}: InboxFilterBarProps) {
  return (
    <>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <label className="space-y-1 md:col-span-2">
          <span className="cmm-text-caption font-semibold cmm-text-secondary">
            {copy.filters.searchLabel}
          </span>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={copy.filters.searchPlaceholder}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary focus:border-emerald-500 focus:outline-none"
          />
        </label>
        <label className="space-y-1">
          <span className="cmm-text-caption font-semibold cmm-text-secondary">
            {copy.filters.sourceLabel}
          </span>
          <select
            value={sourceFilter}
            onChange={(event) => onSourceFilterChange(event.target.value as typeof sourceFilter)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary focus:border-emerald-500 focus:outline-none"
          >
            {SOURCE_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="cmm-text-caption font-semibold cmm-text-secondary">
            {copy.filters.statusLabel}
          </span>
          <select
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value as typeof statusFilter)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary focus:border-emerald-500 focus:outline-none"
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 cmm-text-caption text-slate-500">
          <span>
            {filteredCount} {copy.panel.itemCountSuffix}
          </span>
          <span>•</span>
          <span>
            {copy.filters.loadingLabel}: {refreshing ? copy.filters.yesLabel : copy.filters.noLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="space-y-1">
            <span className="cmm-text-caption font-semibold cmm-text-secondary">
              {copy.filters.partnerPhraseLabel}
            </span>
            <input
              value={partnerConfirm}
              onChange={(event) => onPartnerConfirmChange(event.target.value)}
              placeholder={copy.filters.partnerPhrasePlaceholder}
              className="w-[240px] rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary focus:border-emerald-500 focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 cmm-text-caption font-semibold cmm-text-secondary hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? copy.filters.refreshingLabel : copy.filters.refreshLabel}
          </button>
        </div>
      </div>
    </>
  );
}
