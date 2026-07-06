"use client";

import Link from "next/link";
import {
  ArrowUpDown,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  ExternalLink,
  Filter,
  Leaf,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  Users2,
  UserRound,
} from "lucide-react";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { CmmButton } from "@/components/ui/cmm-button";
import {
  ActionCard,
  FilterField,
  HelpCard,
  HeroIllustration,
  HeroStatCard,
  PillBadge,
  QueueRow,
  ShortcutsCard,
  getCardDisplayStatus,
  getStatusLabel,
} from "./rejoindre-un-formulaire-section.shared";
import {
  type LocationFilter,
  type PeriodFilter,
  type StatusFilter,
  sortItemsByStatusRank,
  useJoinFormSectionController,
} from "./rejoindre-un-formulaire-section.controller";
import { type JoinableActionSort } from "./rejoindre-un-formulaire-section.utils";
import { formatCount, formatDate } from "./rejoindre-un-formulaire-section.format";
import { JoinFormConfirmationDialog } from "./rejoindre-un-formulaire-section-dialog";

export function JoinFormSection() {
  const {
    fr,
    items,
    loading,
    error,
    joiningId,
    leavingId,
    notice,
    authenticated,
    queueRequests,
    queueConfirmedParticipants,
    queueLoading,
    queueError,
    queueCanReview,
    reviewingQueueId,
    addingQueueParticipantId,
    queueSearchQuery,
    queueSearchResults,
    queueSearchLoading,
    queueSearchError,
    search,
    statusFilter,
    locationFilter,
    periodFilter,
    sort,
    pendingJoinActionId,
    pendingLeaveActionId,
    hasItems,
    hasVisibleItems,
    preActionVisibleItems,
    completedVisibleItems,
    activeParticipationItems,
    sortedHistoryItems,
    pendingRequestsCount,
    volunteersExpectedCount,
    summaryIsCompact,
    noResultsMessage,
    setSearch,
    setStatusFilter,
    setLocationFilter,
    setPeriodFilter,
    setSort,
    setQueueSearchQuery,
    requestJoin,
    requestLeave,
    closePendingActions,
    confirmPendingJoin,
    confirmPendingLeave,
    reviewQueueRequest,
    addQueueParticipant,
    resetFilters,
    reloadActions,
  } = useJoinFormSectionController();

  function renderHistorySection() {
    if (!authenticated) {
      return (
        <p className="rounded-[1rem] border border-dashed border-slate-200 bg-slate-50/60 px-3 py-3 text-sm leading-relaxed text-slate-600">
          {fr
            ? "Connectez-vous pour retrouver vos participations et leur statut."
            : "Sign in to review your participations and their status."}
        </p>
      );
    }

    if (sortedHistoryItems.length === 0) {
      return (
        <div className="rounded-[1rem] border border-dashed border-slate-200 bg-slate-50/60 px-3 py-3 text-sm leading-relaxed text-slate-600">
          {fr
            ? "Aucune participation enregistrée pour le moment."
            : "No participation recorded yet."}
          <CmmButton href="#explorer-actions" tone="secondary" variant="pill" size="sm" className="mt-3">
            {fr ? "Voir les actions" : "See actions"}
          </CmmButton>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {sortedHistoryItems.slice(0, 4).map((item) => {
          const status = getCardDisplayStatus(item);

          return (
            <div key={item.id} className="rounded-[1rem] border border-slate-100 bg-slate-50/70 px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.location_label}</p>
                  <p className="text-xs text-slate-500">{formatDate(item.action_date, fr ? "fr" : "en")}</p>
                </div>
                <PillBadge tone={status === "pending" ? "amber" : status === "closed" || status === "cancelled" ? "slate" : "emerald"}>
                  {getStatusLabel(status, fr)}
                </PillBadge>
              </div>
            </div>
          );
        })}
        <CmmButton href="/actions/history" tone="secondary" variant="pill" size="sm" className="mt-1 w-full">
          <span className="flex items-center gap-2">
            {fr ? "Voir toutes mes participations" : "View all my participations"}
            <ChevronRight size={16} />
          </span>
        </CmmButton>
      </div>
    );
  }

  return (
    <SectionShell id="rejoindre-un-formulaire" hideHeader gradient="from-emerald-500/18 via-emerald-500/6 to-transparent">
      <div className="space-y-6 pt-4 text-slate-900">
        <section className="overflow-hidden rounded-[2.1rem] border border-emerald-100 bg-[linear-gradient(180deg,#f8fbf5_0%,#edf7e6_100%)] shadow-[0_20px_56px_-42px_rgba(15,23,42,0.28)]">
          <div className="grid gap-4 px-5 py-3.5 md:px-6 md:py-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(260px,0.88fr)] lg:items-center">
            <div className="relative z-10 space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <Link href="/sections/route" className="inline-flex items-center gap-2 text-emerald-800 transition hover:text-emerald-900">
                  <Leaf size={16} />
                  {fr ? "Agir" : "Act"}
                </Link>
                <ChevronRight size={14} className="text-slate-300" />
                <span>{fr ? "Formulaire de groupe" : "Group form"}</span>
              </div>

              <div className="space-y-3">
                <h1 className="max-w-3xl text-[2.2rem] font-black tracking-tight text-emerald-950 md:text-[2.95rem]">
                  {fr ? "Rejoindre un formulaire de groupe" : "Join a group form"}
                </h1>
                <p className="max-w-2xl text-sm leading-relaxed text-slate-600 md:text-[1.02rem]">
                  {fr
                    ? "Participez à des pré-formulaires ouverts et consultez séparément les déclarations terminées."
                    : "Join open pre-forms and keep completed declarations separate."}
                </p>
              </div>

              <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/75 px-3.5 py-1.5 text-xs font-semibold text-emerald-900 shadow-sm">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 size={12} />
                </span>
                {fr ? "Pré-formulaires en attente de bénévoles" : "Pre-forms waiting for volunteers"}
              </div>
            </div>

            <div className="min-h-[140px] self-end">
              <HeroIllustration />
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
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

              <div id="file-publique" className="rounded-[1.1rem] border border-slate-200 bg-white shadow-[0_16px_36px_-30px_rgba(15,23,42,0.16)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-black tracking-tight text-emerald-950">
                        {fr ? "File publique des demandes" : "Public request queue"}
                      </h3>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800">
                        {formatCount(queueRequests.length + queueConfirmedParticipants.length)}
                      </span>
                    </div>
                    <p className="max-w-2xl text-xs leading-relaxed text-slate-600">
                      {queueCanReview
                        ? fr
                          ? "Recherche, validation, exclusion et ajout manuel réservés aux admin et élus."
                          : "Search, validation, exclusion and manual addition are reserved for admins and elected users."
                        : fr
                          ? "Seuls les admin et élus peuvent modérer cette file."
                          : "Only admins and elected users can moderate this queue."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <ShieldCheck size={14} className="text-emerald-700" />
                    {queueCanReview
                      ? fr
                        ? "Accès de modération activé"
                        : "Moderation access enabled"
                      : fr
                        ? "Lecture seule"
                        : "Read only"}
                  </div>
                </div>

                <div className="space-y-4 px-4 py-4">
                  {queueCanReview && (
                    <div className="rounded-[1rem] border border-emerald-100 bg-emerald-50/50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-emerald-950">
                            {fr ? "Ajouter un compte" : "Add an account"}
                          </p>
                          <p className="text-xs text-slate-600">
                            {fr
                              ? "Recherchez un compte puis ajoutez-le directement à l'action."
                              : "Search for an account and add it directly to the action."}
                          </p>
                        </div>
                        {queueSearchLoading && <Loader2 size={16} className="animate-spin text-emerald-700" />}
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <div className="relative rounded-xl border border-emerald-200 bg-white px-3 py-2">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="search"
                            value={queueSearchQuery}
                            onChange={(event) => setQueueSearchQuery(event.target.value)}
                            placeholder={fr ? "Nom, pseudo ou identifiant" : "Name, handle or ID"}
                            className="w-full border-0 bg-transparent pl-8 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                          />
                        </div>
                        <CmmButton
                          type="button"
                          tone="secondary"
                          variant="pill"
                          size="sm"
                          onClick={() => setQueueSearchQuery((current) => current.trim())}
                        >
                          {fr ? "Rechercher" : "Search"}
                        </CmmButton>
                      </div>

                      {queueSearchError && (
                        <p className="mt-2 text-xs font-medium text-rose-700">{queueSearchError}</p>
                      )}

                      {queueSearchQuery.trim().length >= 2 && (
                        <div className="mt-3 space-y-2">
                          {queueSearchResults.length > 0 ? (
                            queueSearchResults.map((candidate) => (
                              <div
                                key={candidate.userId}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/80 bg-white px-3 py-2 shadow-sm"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900">{candidate.displayName}</p>
                                  <p className="text-xs text-slate-500">
                                    {candidate.handle ? `@${candidate.handle}` : candidate.userId}
                                  </p>
                                </div>
                                <CmmButton
                                  type="button"
                                  tone="primary"
                                  variant="pill"
                                  size="sm"
                                  disabled={addingQueueParticipantId === candidate.userId}
                                  onClick={() => void addQueueParticipant(candidate.userId)}
                                >
                                  {addingQueueParticipantId === candidate.userId ? (
                                    <>
                                      <Loader2 size={14} className="animate-spin" />
                                      {fr ? "Ajout..." : "Adding..."}
                                    </>
                                  ) : (
                                    fr ? "Ajouter" : "Add"
                                  )}
                                </CmmButton>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-600">
                              {fr ? "Aucun compte ne correspond à cette recherche." : "No account matches this search."}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold text-slate-900">
                        {fr ? "Demandes en attente" : "Pending requests"}
                      </h4>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-800">
                        {formatCount(queueRequests.length)}
                      </span>
                    </div>
                    {queueError ? (
                      <div className="rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-2 text-sm text-rose-700">
                        {queueError}
                      </div>
                    ) : queueLoading ? (
                      <div className="space-y-2.5">
                        <div className="h-9 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40" />
                        <div className="h-9 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40" />
                      </div>
                    ) : queueRequests.length > 0 ? (
                      <div className="divide-y divide-slate-100 rounded-[1rem] border border-slate-100">
                        {queueRequests.map((request) => (
                          <QueueRow
                            key={request.id}
                            request={request}
                            fr={fr}
                            queueCanReview={queueCanReview}
                            reviewingQueueId={reviewingQueueId}
                            onReviewQueueRequest={reviewQueueRequest}
                            displayMode="pending"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-3 text-sm leading-relaxed text-slate-600">
                        {fr
                          ? "Aucune demande en attente sur ce formulaire."
                          : "No requests are waiting on this form."}
                      </div>
                    )}
                  </div>

                  {queueCanReview && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-sm font-semibold text-slate-900">
                          {fr ? "Comptes confirmés" : "Confirmed accounts"}
                        </h4>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-800">
                          {formatCount(queueConfirmedParticipants.length)}
                        </span>
                      </div>
                      {queueConfirmedParticipants.length > 0 ? (
                        <div className="divide-y divide-slate-100 rounded-[1rem] border border-slate-100">
                          {queueConfirmedParticipants.map((request) => (
                            <QueueRow
                              key={request.id}
                              request={request}
                              fr={fr}
                              queueCanReview={queueCanReview}
                              reviewingQueueId={reviewingQueueId}
                              onReviewQueueRequest={reviewQueueRequest}
                              displayMode="confirmed"
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-3 text-sm leading-relaxed text-slate-600">
                          {fr
                            ? "Aucun compte confirmé à afficher."
                            : "No confirmed account to display."}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
                  <span>
                    {queueCanReview
                      ? fr
                        ? "Les admin et élus peuvent accepter, exclure et ajouter un compte."
                        : "Admins and elected users can approve, remove and add an account."
                      : fr
                        ? "La modération des comptes est réservée aux admin et élus."
                        : "Account moderation is reserved for admins and elected users."}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-700">
                    {fr ? "Vue de modération" : "Moderation view"}
                    <ChevronRight size={14} />
                  </span>
                </div>
              </div>

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

          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.18)]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-black tracking-tight text-emerald-950">{fr ? "Résumé" : "Summary"}</h2>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800">
                  {formatCount(preActionVisibleItems.length)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2">
                <HeroStatCard
                  icon={<Users2 size={20} />}
                  value={formatCount(preActionVisibleItems.length)}
                  label={fr ? "Pré-formulaires" : "Pre-forms"}
                  compact={summaryIsCompact}
                />
                <HeroStatCard
                  icon={<Clock3 size={20} />}
                  value={formatCount(pendingRequestsCount)}
                  label={fr ? "Demandes en attente" : "Pending requests"}
                  tone="amber"
                  compact={summaryIsCompact}
                />
                <HeroStatCard
                  icon={<CheckCircle2 size={20} />}
                  value={formatCount(activeParticipationItems.length)}
                  label={fr ? "Participations confirmées" : "Confirmed participations"}
                  compact={summaryIsCompact}
                />
                <HeroStatCard
                  icon={<UserRound size={20} />}
                  value={formatCount(volunteersExpectedCount)}
                  label={fr ? "Bénévoles attendus" : "Expected volunteers"}
                  tone="amber"
                  compact={summaryIsCompact}
                />
              </div>
            </div>

            <ShortcutsCard />

            <div id="mon-suivi" className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.18)]">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-black tracking-tight text-emerald-950">
                  {fr ? "Mon suivi" : "My tracking"}
                </h3>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800">
                  {formatCount(activeParticipationItems.length)}
                </span>
              </div>

              {renderHistorySection()}
            </div>

            <HelpCard />
          </aside>
        </div>
      </div>

      <JoinFormConfirmationDialog
        fr={fr}
        mode={pendingJoinActionId ? "join" : "leave"}
        pendingAction={
          items.find((item) => item.id === (pendingJoinActionId ?? pendingLeaveActionId)) ?? null
        }
        onClose={closePendingActions}
        onConfirm={() => {
          if (pendingJoinActionId) {
            void confirmPendingJoin();
            return;
          }

          void confirmPendingLeave();
        }}
      />
    </SectionShell>
  );
}

