import Link from "next/link";
import { ChevronDown, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { ActionCard } from "./rejoindre-un-formulaire-section.shared";
import { JoinFormPublicQueue } from "./rejoindre-un-formulaire-section-public-queue";
import { formatCount } from "./rejoindre-un-formulaire-section.format";
import { SpogomiFutureCard } from "@/components/spogomi/spogomi-future-card";
import { JoinCommunityEventsPanel } from "./rejoindre-une-action.community-events";
import type { ExplorerProps } from "./rejoindre-un-formulaire-section.explorer";

type HeaderProps = Pick<ExplorerProps, "fr" | "search" | "statusFilter" | "locationFilter" | "periodFilter" | "sort" | "resetFilters"> & { visibleCount: number };

function JoinFormExplorerHeader({ fr, visibleCount, search, statusFilter, locationFilter, periodFilter, sort, resetFilters }: HeaderProps) {
  const hasActiveFilters = search || statusFilter !== "all" || locationFilter !== "all" || periodFilter !== "all" || sort !== "soonest";
  return <div className="flex items-end justify-between gap-3">
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-[2rem] font-black text-emerald-950 md:text-[2.15rem]">{fr ? "Actions futures" : "Future actions"}</h2>
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">{`${formatCount(visibleCount)} actions`}</span>
      </div>
      <p className="text-sm text-slate-900">{fr ? "Les actions futures sont publiées et ouvertes aux inscriptions. Les résultats restent réservés à l'onglet des actions passées." : "Published future actions are open for registration. Results stay in the past actions tab."}</p>
    </div>
    {hasActiveFilters && <CmmButton tone="secondary" variant="pill" size="sm" onClick={resetFilters}>{fr ? "Réinitialiser" : "Reset"}</CmmButton>}
  </div>;
}

type StateProps = Pick<ExplorerProps, "fr" | "loading" | "error" | "reloadActions" | "hasItems" | "hasVisibleItems" | "noResultsMessage" | "search" | "statusFilter" | "locationFilter" | "periodFilter" | "sort" | "resetFilters">;

function JoinFormExplorerStates({ fr, loading, error, reloadActions, hasItems, hasVisibleItems, noResultsMessage, search, statusFilter, locationFilter, periodFilter, sort, resetFilters }: StateProps) {
  const hasActiveFilters = search || statusFilter !== "all" || locationFilter !== "all" || periodFilter !== "all" || sort !== "soonest";
  return <>
    {loading && <div className="rounded-[1.1rem] border border-emerald-100 bg-white px-4 py-3 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.18)]"><div className="flex items-center gap-3 text-emerald-800"><Loader2 size={16} className="animate-spin" /><p className="text-sm font-semibold">{fr ? "Chargement des actions futures..." : "Loading future actions..."}</p></div></div>}
    {!loading && error && <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-amber-100 bg-white px-4 py-3 text-slate-800 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.16)]"><p className="text-sm font-semibold text-slate-900">{error}</p><CmmButton onClick={reloadActions} tone="secondary" size="sm">{fr ? "Réessayer" : "Retry"}</CmmButton></div>}
    {!loading && !error && !hasItems && <div className="rounded-[1.1rem] border border-dashed border-emerald-200 bg-white px-4 py-4 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.18)]"><p className="text-sm font-bold text-slate-900">{fr ? "Aucune action future rejoignable n'est disponible pour le moment." : "No joinable future action is available right now."}</p><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-900">{fr ? "Créez une pré-déclaration pour préparer une action de groupe avant le départ." : "Create a pre-declaration to prepare a group action before departure."}</p><div className="mt-4 flex flex-wrap gap-2"><CmmButton href="/actions/new" tone="primary" variant="pill">{fr ? "Créer une action" : "Create an action"}</CmmButton></div></div>}
    {!loading && hasItems && !hasVisibleItems && <div className="rounded-[1.1rem] border border-dashed border-emerald-200 bg-white px-4 py-4 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.18)]"><p className="text-sm font-semibold text-slate-900">{noResultsMessage}</p><p className="mt-2 text-sm leading-relaxed text-slate-900">{fr ? "Essayez un autre mot-clé, changez la période ou réinitialisez les filtres." : "Try another keyword, change the period, or reset the filters."}</p></div>}
    {!loading && hasItems && hasVisibleItems && hasActiveFilters && <div className="rounded-[1.1rem] border border-slate-200 bg-white/90 px-4 py-3 text-center shadow-[0_16px_32px_-26px_rgba(15,23,42,0.22)]"><CmmButton tone="secondary" variant="pill" size="sm" onClick={resetFilters}><span className="inline-flex items-center gap-2">{fr ? "Réinitialiser les filtres" : "Reset filters"}<ChevronDown size={16} /></span></CmmButton></div>}
  </>;
}

type ResultsProps = Pick<ExplorerProps, "fr" | "preActionVisibleItems" | "hasItems" | "hasVisibleItems" | "authenticated" | "joiningId" | "leavingId" | "requestJoin" | "requestLeave" | "focusActionId" | "onShareAction">;

function JoinFormExplorerResults({ fr, preActionVisibleItems, hasItems, hasVisibleItems, authenticated, joiningId, leavingId, requestJoin, requestLeave, focusActionId, onShareAction }: ResultsProps) {
  return <>{!hasItems || !hasVisibleItems ? null : <div className="space-y-6"><section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><div className="space-y-1"><h3 className="text-base font-bold text-emerald-900">{fr ? "Actions futures ouvertes" : "Open future actions"}</h3><p className="text-xs leading-relaxed text-slate-900">{fr ? "Ils sont visibles avant la déclaration finale et restent séparés des actions terminées." : "They are visible before the final declaration and stay separate from completed actions."}</p></div><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">{formatCount(preActionVisibleItems.length)}</span></div>{preActionVisibleItems.length > 0 ? <div className="space-y-4">{preActionVisibleItems.map((item, index) => <ActionCard key={item.id} item={item} index={index} fr={fr} authenticated={authenticated} isFocused={focusActionId === item.id} joining={joiningId === item.id} leaving={leavingId === item.id} onRequestJoin={requestJoin} onRequestLeave={requestLeave} onShareAction={onShareAction} />)}</div> : <div className="rounded-[1.1rem] border border-dashed border-emerald-200 bg-white px-4 py-4 text-sm leading-relaxed text-slate-900 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.18)]">{fr ? "Aucune action future n'est ouverte pour le moment." : "No future action is open right now."}</div>}</section></div>}</>;
}

type FooterProps = Pick<ExplorerProps, "fr" | "notice" | "focusActionId" | "queueCanReview" | "queueRequests" | "queueConfirmedParticipants" | "queueLoading" | "queueError" | "reviewingQueueId" | "addingQueueParticipantId" | "queueSearchQuery" | "queueSearchResults" | "queueSearchLoading" | "queueSearchError" | "setQueueSearchQuery" | "reviewQueueRequest" | "addQueueParticipant" | "communityUpcomingEvents" | "communityEventsLoading" | "communityEventsError" | "communityEventsRetry" | "focusCommunityEventId" | "communityRsvpLoadingEventId" | "onCommunityRsvp" | "communityMutationError" | "communitySuccessMessage">;

function JoinFormExplorerFooter({ fr, notice, focusActionId, queueCanReview, queueRequests, queueConfirmedParticipants, queueLoading, queueError, reviewingQueueId, addingQueueParticipantId, queueSearchQuery, queueSearchResults, queueSearchLoading, queueSearchError, setQueueSearchQuery, reviewQueueRequest, addQueueParticipant, communityUpcomingEvents = [], communityEventsLoading = false, communityEventsError = null, communityEventsRetry, focusCommunityEventId = null, communityRsvpLoadingEventId = null, onCommunityRsvp, communityMutationError = null, communitySuccessMessage = null }: FooterProps) {
  return <>
    <JoinCommunityEventsPanel fr={fr} events={communityUpcomingEvents} loading={communityEventsLoading} error={communityEventsError} focusedEventId={focusCommunityEventId} rsvpLoadingEventId={communityRsvpLoadingEventId} onRsvp={onCommunityRsvp} onRetry={communityEventsRetry} mutationError={communityMutationError} successMessage={communitySuccessMessage} tab="future" />
    {notice && <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">{notice}</div>}
    {focusActionId && queueCanReview ? <JoinFormPublicQueue fr={fr} queueRequests={queueRequests} queueConfirmedParticipants={queueConfirmedParticipants} queueLoading={queueLoading} queueError={queueError} queueCanReview={queueCanReview} reviewingQueueId={reviewingQueueId} addingQueueParticipantId={addingQueueParticipantId} queueSearchQuery={queueSearchQuery} queueSearchResults={queueSearchResults} queueSearchLoading={queueSearchLoading} queueSearchError={queueSearchError} setQueueSearchQuery={setQueueSearchQuery} onReviewQueueRequest={reviewQueueRequest} onAddQueueParticipant={addQueueParticipant} /> : null}
    <div className="rounded-[1rem] border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm leading-relaxed text-slate-900 shadow-[0_16px_32px_-26px_rgba(15,23,42,0.22)]"><div className="flex items-start gap-3"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-700" /><p>{fr ? "En participant, vous vous engagez à respecter la charte des bénévoles et les consignes de sécurité." : "By participating, you agree to follow the volunteer charter and safety instructions."}</p><Link href="/docs/legal/charte-benevole.md" className="ml-auto inline-flex shrink-0 items-center gap-2 font-semibold text-emerald-800">{fr ? "Voir la charte" : "View charter"}<ExternalLink size={14} /></Link></div></div>
  </>;
}

export function JoinFormExplorerContent(props: ExplorerProps) {
  const { fr, search, statusFilter, locationFilter, periodFilter, sort, resetFilters } = props;
  return <div className="space-y-5">
    <JoinFormExplorerHeader fr={fr} visibleCount={props.preActionVisibleItems.length} search={search} statusFilter={statusFilter} locationFilter={locationFilter} periodFilter={periodFilter} sort={sort} resetFilters={resetFilters} />
    <div className="space-y-4"><SpogomiFutureCard /><JoinFormExplorerStates {...props} /><JoinFormExplorerResults {...props} /><JoinFormExplorerFooter {...props} /></div>
  </div>;
}
