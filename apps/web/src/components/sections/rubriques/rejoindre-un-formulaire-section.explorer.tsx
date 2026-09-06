
"use client";

import Link from "next/link";
import { ArrowUpDown, CalendarDays, ChevronDown, ExternalLink, Filter, Loader2, MapPin, Search, ShieldCheck } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import type { useJoinFormSectionController } from "./rejoindre-un-formulaire-section.controller";
import { ActionCard, FilterField } from "./rejoindre-un-formulaire-section.shared";
import { JoinFormPublicQueue } from "./rejoindre-un-formulaire-section-public-queue";
import { sortItemsByStatusRank } from "./rejoindre-un-formulaire-section.utils";
import { formatCount } from "./rejoindre-un-formulaire-section.format";
import type { LocationFilter, PeriodFilter, StatusFilter } from "./rejoindre-un-formulaire-section.controller";
import type { JoinableActionSort } from "./rejoindre-un-formulaire-section.utils";

type ControllerState = ReturnType<typeof useJoinFormSectionController>;

type ExplorerProps = Pick<ControllerState,
  | "fr" | "search" | "setSearch" | "locationFilter" | "setLocationFilter"
  | "periodFilter" | "setPeriodFilter" | "statusFilter" | "setStatusFilter"
  | "sort" | "setSort" | "preActionVisibleItems" | "resetFilters"
  | "loading" | "error" | "reloadActions" | "hasItems" | "hasVisibleItems"
  | "completedVisibleItems" | "authenticated" | "joiningId" | "leavingId"
  | "requestJoin" | "requestLeave" | "noResultsMessage" | "notice"
  | "queueRequests" | "queueConfirmedParticipants" | "queueLoading" | "queueError"
  | "queueCanReview" | "reviewingQueueId" | "addingQueueParticipantId"
  | "queueSearchQuery" | "queueSearchResults" | "queueSearchLoading"
  | "queueSearchError" | "setQueueSearchQuery" | "reviewQueueRequest"
  | "addQueueParticipant"
>;

export function JoinFormExplorer(props: ExplorerProps) {
  const {
    fr, search, setSearch, locationFilter, setLocationFilter, periodFilter,
    setPeriodFilter, statusFilter, setStatusFilter, sort, setSort,
    preActionVisibleItems, resetFilters, loading, error, reloadActions, hasItems,
    hasVisibleItems, completedVisibleItems, authenticated, joiningId, leavingId,
    requestJoin, requestLeave, noResultsMessage, notice, queueRequests,
    queueConfirmedParticipants, queueLoading, queueError, queueCanReview,
    reviewingQueueId, addingQueueParticipantId, queueSearchQuery,
    queueSearchResults, queueSearchLoading, queueSearchError, setQueueSearchQuery,
    reviewQueueRequest, addQueueParticipant,
  } = props;

  return (
  <div className="space-y-5">
    <div className="grid gap-2.5 lg:grid-cols-[minmax(0,2.1fr)_repeat(4,minmax(0,1fr))]">
      <FilterField label={fr ? "Rechercher une action, un lieu..." : "Search an action or location..."} icon={<Search size={13} />}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={fr ? "Rechercher une action, un lieu..." : "Search an action or location..."}
          className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
      </FilterField>

      <FilterField label={fr ? "Localisation" : "Location"} icon={<MapPin size={13} />}>
        <div className="relative">
          <select
            value={locationFilter}
            onChange={(event) => setLocationFilter(event.target.value as LocationFilter)}
            className="w-full appearance-none border-0 bg-transparent pr-7 text-sm font-semibold text-slate-900 outline-none"
          >
            <option value="all">{fr ? "Toutes" : "All"}</option>
            <option value="ile-de-france">{fr ? "Île-de-France" : "Île-de-France"}</option>
            <option value="autres">{fr ? "Autres régions" : "Other regions"}</option>
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </FilterField>

      <FilterField label={fr ? "Période" : "Period"} icon={<CalendarDays size={13} />}>
        <div className="relative">
          <select
            value={periodFilter}
            onChange={(event) => setPeriodFilter(event.target.value as PeriodFilter)}
            className="w-full appearance-none border-0 bg-transparent pr-7 text-sm font-semibold text-slate-900 outline-none"
          >
            <option value="all">{fr ? "Toutes" : "All"}</option>
            <option value="seven-days">{fr ? "7 prochains jours" : "Next 7 days"}</option>
            <option value="thirty-days">{fr ? "30 prochains jours" : "Next 30 days"}</option>
            <option value="ninety-days">{fr ? "90 prochains jours" : "Next 90 days"}</option>
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </FilterField>

      <FilterField label={fr ? "Statut" : "Status"} icon={<Filter size={13} />}>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="w-full appearance-none border-0 bg-transparent pr-7 text-sm font-semibold text-slate-900 outline-none"
          >
            <option value="all">{fr ? "Tous" : "All"}</option>
            <option value="open">{fr ? "Ouverte" : "Open"}</option>
            <option value="pending">{fr ? "En attente" : "Pending"}</option>
            <option value="closed">{fr ? "Fermée" : "Closed"}</option>
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </FilterField>

      <FilterField label={fr ? "Trier par" : "Sort by"} icon={<ArrowUpDown size={13} />}>
        <div className="relative">
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as JoinableActionSort)}
            className="w-full appearance-none border-0 bg-transparent pr-7 text-sm font-semibold text-slate-900 outline-none"
          >
            <option value="soonest">{fr ? "Date (plus récente)" : "Date (soonest)"}</option>
            <option value="latest">{fr ? "Date (plus lointaine)" : "Date (latest)"}</option>
            <option value="participants-desc">{fr ? "Plus de bénévoles" : "Most volunteers"}</option>
            <option value="participants-asc">{fr ? "Moins de bénévoles" : "Fewest volunteers"}</option>
            <option value="location-asc">{fr ? "Lieu A → Z" : "Location A → Z"}</option>
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </FilterField>
    </div>

    <div className="flex items-end justify-between gap-3">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-[2rem] font-black tracking-tight text-emerald-950 md:text-[2.15rem]">
            {fr ? "Pré-formulaires de groupe" : "Group pre-forms"}
          </h2>
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800">
            {`${formatCount(preActionVisibleItems.length)} pré-formulaires`}
          </span>
        </div>
        <p className="text-sm text-slate-500">
          {fr
            ? "Les pré-formulaires restent séparés des déclarations terminées. Les bénévoles rejoignent ici les actions à venir."
            : "Pre-forms stay separate from completed declarations. Volunteers join upcoming actions here."}
        </p>
      </div>
      {(search || statusFilter !== "all" || locationFilter !== "all" || periodFilter !== "all" || sort !== "soonest") && (
        <CmmButton
          tone="secondary"
          variant="pill"
          size="sm"
          onClick={resetFilters}
        >
          {fr ? "Réinitialiser" : "Reset"}
        </CmmButton>
      )}
    </div>

    <div className="space-y-4">
      {loading && (
        <div className="rounded-[1.1rem] border border-emerald-100 bg-white px-4 py-3 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.18)]">
          <div className="flex items-center gap-3 text-emerald-800">
            <Loader2 size={16} className="animate-spin" />
            <p className="text-sm font-semibold">
              {fr ? "Chargement des pré-formulaires..." : "Loading pre-forms..."}
            </p>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-amber-100 bg-white px-4 py-3 text-slate-800 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.16)]">
          <p className="text-sm font-semibold text-slate-700">{error}</p>
          <CmmButton
            onClick={reloadActions}
            tone="secondary"
            size="sm"
          >
            {fr ? "Réessayer" : "Retry"}
          </CmmButton>
        </div>
      )}

      {!loading && !error && !hasItems && (
        <div className="rounded-[1.1rem] border border-dashed border-emerald-200 bg-white px-4 py-4 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.18)]">
          <p className="text-sm font-bold text-slate-900">
            {fr
              ? "Aucun pré-formulaire n'est disponible pour le moment."
              : "No pre-form is available right now."}
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            {fr
              ? "Créez une pré-déclaration pour préparer une action de groupe avant le départ."
              : "Create a pre-declaration to prepare a group action before departure."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <CmmButton href="/actions/new" tone="primary" variant="pill">
              {fr ? "Créer un pré-formulaire" : "Create a pre-form"}
            </CmmButton>
            <CmmButton href="/actions/new" tone="secondary" variant="pill">
              {fr ? "Déclarer avant l'action" : "Declare before action"}
            </CmmButton>
          </div>
        </div>
      )}

      {!loading && hasItems && hasVisibleItems && (
        <div className="space-y-6">
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-emerald-900">
                  {fr ? "Pré-formulaires ouverts" : "Open pre-forms"}
                </h3>
                <p className="text-xs leading-relaxed text-slate-500">
                  {fr
                    ? "Ils sont visibles avant la déclaration finale et restent séparés des actions terminées."
                    : "They are visible before the final declaration and stay separate from completed actions."}
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800">
                {formatCount(preActionVisibleItems.length)}
              </span>
            </div>

            {preActionVisibleItems.length > 0 ? (
              <div className="space-y-4">
                {sortItemsByStatusRank(preActionVisibleItems).map((item, index) => (
                  <ActionCard
                    key={item.id}
                    item={item}
                    index={index}
                    fr={fr}
                    authenticated={authenticated}
                    joining={joiningId === item.id}
                    leaving={leavingId === item.id}
                    onRequestJoin={requestJoin}
                    onRequestLeave={requestLeave}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[1.1rem] border border-dashed border-emerald-200 bg-white px-4 py-4 text-sm leading-relaxed text-slate-600 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.18)]">
                {fr
                  ? "Aucun pré-formulaire n'est ouvert pour le moment."
                  : "No pre-form is open right now."}
              </div>
            )}
          </section>

          {completedVisibleItems.length > 0 ? (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-700">
                    {fr ? "Déclarations complétées" : "Completed declarations"}
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-500">
                    {fr
                      ? "Ces formulaires ont déjà été passés au flux complet."
                      : "These forms have already moved to the complete flow."}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">
                  {formatCount(completedVisibleItems.length)}
                </span>
              </div>

              <div className="space-y-4">
                {sortItemsByStatusRank(completedVisibleItems).map((item, index) => (
                  <ActionCard
                    key={item.id}
                    item={item}
                    index={index}
                    fr={fr}
                    authenticated={authenticated}
                    joining={joiningId === item.id}
                    leaving={leavingId === item.id}
                    onRequestJoin={requestJoin}
                    onRequestLeave={requestLeave}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {(search || statusFilter !== "all" || locationFilter !== "all" || periodFilter !== "all" || sort !== "soonest") && (
            <div className="rounded-[1.1rem] border border-slate-200 bg-white/90 px-4 py-3 text-center shadow-[0_16px_32px_-26px_rgba(15,23,42,0.22)]">
              <CmmButton
                tone="secondary"
                variant="pill"
                size="sm"
                onClick={resetFilters}
              >
                <span className="inline-flex items-center gap-2">
                  {fr ? "Réinitialiser les filtres" : "Reset filters"}
                  <ChevronDown size={16} />
                </span>
              </CmmButton>
            </div>
          )}
        </div>
      )}

      {!loading && hasItems && !hasVisibleItems && (
        <div className="rounded-[1.1rem] border border-dashed border-emerald-200 bg-white px-4 py-4 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.18)]">
          <p className="text-sm font-semibold text-slate-900">{noResultsMessage}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {fr
              ? "Essayez un autre mot-clé, changez la période ou réinitialisez les filtres."
              : "Try another keyword, change the period, or reset the filters."}
          </p>
        </div>
      )}

      {notice && (
        <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          {notice}
        </div>
      )}

      <JoinFormPublicQueue
        fr={fr}
        queueRequests={queueRequests}
        queueConfirmedParticipants={queueConfirmedParticipants}
        queueLoading={queueLoading}
        queueError={queueError}
        queueCanReview={queueCanReview}
        reviewingQueueId={reviewingQueueId}
        addingQueueParticipantId={addingQueueParticipantId}
        queueSearchQuery={queueSearchQuery}
        queueSearchResults={queueSearchResults}
        queueSearchLoading={queueSearchLoading}
        queueSearchError={queueSearchError}
        setQueueSearchQuery={setQueueSearchQuery}
        onReviewQueueRequest={reviewQueueRequest}
        onAddQueueParticipant={addQueueParticipant}
      />

      <div className="rounded-[1rem] border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-[0_16px_32px_-26px_rgba(15,23,42,0.22)]">
        <div className="flex items-start gap-3">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-700" />
          <p>
            {fr
              ? "En participant, vous vous engagez à respecter la charte des bénévoles et les consignes de sécurité."
              : "By participating, you agree to follow the volunteer charter and safety instructions."}
          </p>
          <Link href="/charte" className="ml-auto inline-flex shrink-0 items-center gap-2 font-semibold text-emerald-800">
            {fr ? "Voir la charte" : "View charter"}
            <ExternalLink size={14} />
          </Link>
        </div>
      </div>
    </div>
  </div>
  );
}
