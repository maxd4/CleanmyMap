"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import useSWR from "swr";
import { fetchActions } from "@/lib/actions/http";
import { evaluateActionQuality } from "@/lib/actions/quality";
import { fetchActionOperationAudit } from "@/lib/actions/operation-audit";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { isAdminLikeProfile, normalizeProfileRole } from "@/lib/profiles";
import {
  getActionOperationalContext,
  mapItemCigaretteButts,
  mapItemWasteKg,
} from "@/lib/actions/data-contract";
import type {
  ActionListItem,
  ActionMapItem,
  ActionQualityGrade,
  ActionStatus,
} from "@/lib/actions/types";
import type { AdminOperationAuditEntry } from "@/lib/admin/operation-audit";
import type { ActionParticipationReviewItem } from "@/lib/actions/group-participation";
import { swrRecentViewOptions } from "@/lib/swr-config";
import { RubriquePdfExportButton } from "@/components/ui/rubrique-pdf-export-button";
import {
  canManageGroupJoin,
  formatDate,
  formatRecordType,
} from "./actions-history-list.helpers";
import { ActionsHistoryListDetails } from "./actions-history-list-details";
import { ActionsHistoryListTable } from "./actions-history-list-table";

function readProfileRole(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const candidate = metadata as Record<string, unknown>;
  const roleValue = candidate.role ?? candidate.profile;
  return typeof roleValue === "string" ? roleValue : null;
}

export function ActionsHistoryList() {
 const { user } = useUser();
 const { locale } = useSitePreferences();
 const currentUserId = user?.id ?? null;
 const fr = locale === "fr";
 const [statusFilter, setStatusFilter] = useState<ActionStatus |"all">(
"approved",
 );
 const [qualityFilter, setQualityFilter] = useState<
 ActionQualityGrade |"all"
 >("all");
 const [toFixOnly, setToFixOnly] = useState<boolean>(false);
 const [limit, setLimit] = useState<number>(25);
 const [search, setSearch] = useState<string>("");
 const [selectedId, setSelectedId] = useState<string | null>(null);
 const [groupJoinActionId, setGroupJoinActionId] = useState<string | null>(null);
 const [groupJoinNotice, setGroupJoinNotice] = useState<string | null>(null);
 const [pendingGroupJoinRequests, setPendingGroupJoinRequests] = useState<
  ActionParticipationReviewItem[]
 >([]);
 const [pendingGroupJoinLoading, setPendingGroupJoinLoading] = useState(false);
 const [pendingGroupJoinError, setPendingGroupJoinError] = useState<string | null>(null);
 const [reviewingParticipantId, setReviewingParticipantId] = useState<string | null>(null);
 const currentProfileRole = normalizeProfileRole(readProfileRole(user?.publicMetadata));
 const isAdminLikeUser = currentProfileRole ? isAdminLikeProfile(currentProfileRole) : false;

 const swrKey = useMemo(
 () => [
"actions",
 statusFilter,
 qualityFilter,
 String(toFixOnly),
 String(limit),
 ],
 [statusFilter, qualityFilter, toFixOnly, limit],
 );
 const {
 data,
 error,
 isLoading,
 isValidating,
 mutate: reload,
 } = useSWR(
 swrKey,
 () =>
 fetchActions({
 status: statusFilter,
 qualityGrade: qualityFilter ==="all" ? undefined : qualityFilter,
 toFixPriority: toFixOnly ? true : undefined,
 limit,
 types:"all",
 }),
 swrRecentViewOptions,
 );

 const items = useMemo(() => data?.items ?? [], [data?.items]);
 const failedSources = data?.sourceHealth?.failedSources ?? [];
 const partialSourcesLabel =
 failedSources.length > 0 ? failedSources.join(",") :"inconnues";
 const filteredItems = useMemo(() => {
 const query = search.trim().toLowerCase();
 if (!query) {
 return items;
 }

 return items.filter((item: ActionListItem) => {
 const actor = (item.actor_name ??"").toLowerCase();
 const location = (item.location_label ??"").toLowerCase();
 return actor.includes(query) || location.includes(query);
 });
 }, [items, search]);

 const qualityById = useMemo(() => {
 const output = new Map<string, ReturnType<typeof evaluateActionQuality>>();
 for (const item of filteredItems) {
 if (typeof item.quality_score ==="number" && item.quality_grade) {
 output.set(item.id, {
 score: item.quality_score,
 grade: item.quality_grade,
 breakdown:
 item.quality_breakdown ?? evaluateActionQuality(item).breakdown,
 flags: item.quality_flags ?? [],
 });
 } else {
 output.set(item.id, evaluateActionQuality(item));
 }
 }
 return output;
 }, [filteredItems]);
 const approvedFilteredItems = useMemo(
 () => filteredItems.filter((item) => item.status ==="approved"),
 [filteredItems],
 );

 const selectedItem = useMemo(
 () =>
 filteredItems.find((item) => item.id === selectedId) ??
 filteredItems[0] ??
 null,
 [filteredItems, selectedId],
 );
 const selectedQuality = selectedItem
 ? (qualityById.get(selectedItem.id) ?? null)
 : null;
 const selectedOperational = selectedItem?.contract
 ? getActionOperationalContext(selectedItem.contract)
 : null;
 const selectedActionId = selectedItem?.id ?? null;
 const selectedCanModerateGroupJoin = Boolean(
 selectedItem && canManageGroupJoin(selectedItem, currentUserId, isAdminLikeUser),
 );
 const selectedCanViewActionAudit = Boolean(
  selectedItem &&
   (isAdminLikeUser || selectedItem.created_by_clerk_id === currentUserId),
 );
 const actionAudit = useSWR<{ items?: AdminOperationAuditEntry[] }>(
  selectedActionId && selectedCanViewActionAudit
   ? ["action-operation-audit", selectedActionId]
   : null,
  () => fetchActionOperationAudit(selectedActionId ?? "", 12),
  swrRecentViewOptions,
 );
  const pdfRows = useMemo(
    () =>
      approvedFilteredItems.map((item: ActionListItem) => {
 const quality = qualityById.get(item.id);
 const operational = item.contract ? getActionOperationalContext(item.contract) : null;
 return {
 Date: item.action_date,
 Bénévole: item.actor_name ||"Anonyme",
 Lieu: item.location_label,
 Type: formatRecordType(item),
 Kg: mapItemWasteKg(item as ActionMapItem) ?? 0,
 Mégots: mapItemCigaretteButts(item as ActionMapItem) ?? 0,
 Statut: item.status,
 Qualité: quality ? `${quality.grade} (${quality.score}/100)` :"n/a",
 Contexte: operational?.placeTypeLabel ??"n/a",
 };
 }),
 [approvedFilteredItems, qualityById],
 );
 const pdfData = useMemo(
 () => ({
 title:"Rapport historique terrain",
 summary: [
 `Statut filtré: ${statusFilter}.`,
 `Grade qualité: ${qualityFilter}.`,
 toFixOnly ? "Vue limitée aux enregistrements à corriger." : "Vue complète selon filtres actifs.",
 search.trim() ? `Recherche active: ${search.trim()}.` : "Aucune recherche texte active.",
 ],
 stats: [
 { label:"Actions validées exportées", value: approvedFilteredItems.length },
 { label:"Qualité A", value: approvedFilteredItems.filter((item) => qualityById.get(item.id)?.grade ==="A").length },
 { label:"Qualité B", value: approvedFilteredItems.filter((item) => qualityById.get(item.id)?.grade ==="B").length },
 { label:"Qualité C", value: approvedFilteredItems.filter((item) => qualityById.get(item.id)?.grade ==="C").length },
 ],
 rows: pdfRows,
 columns: [
 { key:"Date", label:"Date" },
 { key:"Bénévole", label:"Bénévole" },
 { key:"Lieu", label:"Lieu" },
 { key:"Type", label:"Type" },
 { key:"Kg", label:"Kg" },
 { key:"Mégots", label:"Mégots" },
 { key:"Statut", label:"Statut" },
 { key:"Qualité", label:"Qualité" },
 { key:"Contexte", label:"Contexte" },
 ],
 }),
 [approvedFilteredItems, pdfRows, qualityById, qualityFilter, search, statusFilter, toFixOnly],
 );
 const selectedLostPoints = selectedQuality
 ? Math.max(0, 100 - selectedQuality.score)
 : 0;
 const correctiveAction = selectedQuality
 ? selectedQuality.breakdown.geoloc < 70
 ?"Renforcer geo-tracabilite (coordonnees + trace/polygone)."
 : selectedQuality.breakdown.traceability < 80
 ?"Completer les champs de traçabilite (auteur/source/dates)."
 : selectedQuality.breakdown.freshness < 70
 ?"Prioriser moderation rapide pour reduire la staleness."
 :"Corriger les champs incomplets et valeurs incoherentes."
 : null;

 const loadPendingGroupJoinRequests = useCallback(
  async (actionId: string, signal?: AbortSignal) => {
   if (!selectedCanModerateGroupJoin) {
    setPendingGroupJoinRequests([]);
    setPendingGroupJoinError(null);
    return;
   }

   setPendingGroupJoinLoading(true);
   setPendingGroupJoinError(null);

   try {
    const response = await fetch(
     `/api/actions/${encodeURIComponent(actionId)}/group-join`,
     {
      signal,
     },
    );

    const payload = (await response.json()) as
     | {
       status: "ok";
       actionId: string;
       count: number;
       pendingRequests: ActionParticipationReviewItem[];
       canReview: boolean;
      }
     | { error?: string };

    if (!response.ok) {
     const message =
      typeof payload === "object" && payload && "error" in payload && payload.error
       ? payload.error
       : fr
        ? "Impossible de charger la file d'attente."
        : "Unable to load the waitlist.";
     setPendingGroupJoinRequests([]);
     setPendingGroupJoinError(message);
     return;
    }

    const successPayload = payload as {
      status: "ok";
      actionId: string;
      count: number;
      pendingRequests: ActionParticipationReviewItem[];
      canReview: boolean;
    };

    setPendingGroupJoinRequests(successPayload.pendingRequests ?? []);
   } catch (error) {
    if ((error as { name?: string }).name === "AbortError") {
     return;
    }
    setPendingGroupJoinRequests([]);
    setPendingGroupJoinError(
     fr
      ? "Impossible de charger la file d'attente."
      : "Unable to load the waitlist.",
    );
   } finally {
    setPendingGroupJoinLoading(false);
   }
  },
  [fr, selectedCanModerateGroupJoin],
 );

 useEffect(() => {
  if (!selectedActionId || !selectedCanModerateGroupJoin) {
   setPendingGroupJoinRequests([]);
   setPendingGroupJoinError(null);
   setPendingGroupJoinLoading(false);
   return undefined;
  }

  const controller = new AbortController();
  void loadPendingGroupJoinRequests(selectedActionId, controller.signal);

  return () => controller.abort();
 }, [loadPendingGroupJoinRequests, selectedActionId, selectedCanModerateGroupJoin]);

 async function handleToggleGroupJoin(
 item: ActionListItem,
 nextEnabled: boolean,
 ) {
 if (!canManageGroupJoin(item, currentUserId, isAdminLikeUser)) {
  setGroupJoinNotice(
   fr
    ? "Vous devez être organisateur principal ou admin pour modifier ce formulaire."
    : "You must be the primary organizer or an admin to change this form.",
  );
  return;
 }

 setGroupJoinActionId(item.id);
 setGroupJoinNotice(null);

 try {
  const response = await fetch(
   `/api/actions/${encodeURIComponent(item.id)}/group-join`,
   {
    method: "PATCH",
    headers: {
     "Content-Type": "application/json",
    },
    body: JSON.stringify({ groupJoinEnabled: nextEnabled }),
   },
  );

  const payload = (await response.json()) as
   | { status: "ok"; groupJoinEnabled: boolean }
   | { error?: string };

  if (!response.ok) {
   const message =
    typeof payload === "object" && payload && "error" in payload && payload.error
     ? payload.error
     : fr
      ? "Impossible de modifier l'ouverture du formulaire."
      : "Unable to change the form opening state.";
   setGroupJoinNotice(message);
   return;
  }

  setGroupJoinNotice(
   nextEnabled
    ? fr
     ? "Créer un formulaire rouvert."
     : "Create form reopened."
    : fr
     ? "Créer un formulaire fermé."
     : "Create form closed.",
  );
  await reload();
 } catch {
  setGroupJoinNotice(
   fr
    ? "Impossible de modifier l'ouverture du formulaire."
    : "Unable to change the form opening state.",
  );
 } finally {
  setGroupJoinActionId(null);
 }
 }

 async function handleReviewGroupJoin(
  request: ActionParticipationReviewItem,
  decision: "accept" | "reject",
 ) {
  if (!selectedItem) {
   return;
  }

  setReviewingParticipantId(request.id);
  setGroupJoinNotice(null);
  setPendingGroupJoinError(null);

  try {
   const response = await fetch(
    `/api/actions/${encodeURIComponent(selectedItem.id)}/group-join`,
    {
     method: "POST",
     headers: {
      "Content-Type": "application/json",
     },
     body: JSON.stringify({ participantId: request.id, decision }),
    },
   );

   const payload = (await response.json()) as
    | {
      status: "ok";
      actionId: string;
      participantId: string;
      decision: "accept" | "reject";
      participationStatus: "pending" | "confirmed" | "cancelled";
      participationSource: "group_form" | "admin" | "import";
      joinedAt: string;
      updatedAt: string | null;
     }
    | { error?: string };

   if (!response.ok) {
    const message =
     typeof payload === "object" && payload && "error" in payload && payload.error
      ? payload.error
      : fr
       ? "Impossible de traiter la demande."
       : "Unable to review the request.";
    setPendingGroupJoinError(message);
    return;
   }

   setPendingGroupJoinRequests((previous) =>
    previous.filter((item) => item.id !== request.id),
   );
   setGroupJoinNotice(
    decision === "accept"
     ? fr
      ? "Demande acceptée."
      : "Request accepted."
     : fr
      ? "Demande refusée."
      : "Request rejected.",
   );
   await reload();
  } catch {
   setPendingGroupJoinError(
    fr
     ? "Impossible de traiter la demande."
     : "Unable to review the request.",
   );
  } finally {
   setReviewingParticipantId(null);
  }
 }

 return (
 <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
 <div className="flex flex-wrap items-start justify-between gap-3">
 <div>
 {data?.partialSource ? (
 <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 cmm-text-caption font-semibold uppercase tracking-wide text-amber-900">
 Sources partielles: {partialSourcesLabel}
 </span>
 ) : null}
 <h2 className="text-xl font-semibold cmm-text-primary">
 Historique des actions
 </h2>
 <p className="mt-1 cmm-text-small cmm-text-secondary">
 Vue filtrable avec score qualite par action (A/B/C).
 </p>
 </div>
 <button
 onClick={() => void reload()}
 className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small font-semibold cmm-text-secondary transition hover:bg-slate-100"
 >
 {isValidating ?"Actualisation..." :"Rafraichir"}
 </button>
 </div>

 <div className="mt-4">
 <RubriquePdfExportButton
  rubrique="historique_terrain"
 periode={`filtre_${statusFilter}_${new Date().getFullYear()}`}
 organizationType="profil"
 defaultTitle="Rapport historique terrain"
 data={pdfData}
  disabled={isLoading || Boolean(error) || approvedFilteredItems.length === 0}
 />
 </div>

 {groupJoinNotice && (
 <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-900">
  {groupJoinNotice}
 </div>
 )}

 <div className="mt-4 grid gap-3 md:grid-cols-3">
 <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
 Statut
 <select
 value={statusFilter}
 onChange={(event) =>
 setStatusFilter(event.target.value as ActionStatus |"all")
 }
 className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
 >
 <option value="all">Tous</option>
 <option value="pending">Pending</option>
 <option value="approved">Approved</option>
 <option value="rejected">Rejected</option>
 </select>
 </label>

 <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
 Grade qualite
 <select
 value={qualityFilter}
 onChange={(event) =>
 setQualityFilter(event.target.value as ActionQualityGrade |"all")
 }
 className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
 >
 <option value="all">Tous</option>
 <option value="A">A</option>
 <option value="B">B</option>
 <option value="C">C</option>
 </select>
 </label>

 <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
 Priorite correction
 <button
 type="button"
 onClick={() => setToFixOnly((prev) => !prev)}
 className={`rounded-lg border px-3 py-2 text-left cmm-text-small font-semibold transition ${
 toFixOnly
 ?"border-rose-300 bg-rose-50 text-rose-800"
 :"border-slate-300 bg-white cmm-text-secondary hover:bg-slate-100"
 }`}
 >
 {toFixOnly ?"Actif: a corriger" :"Tous les enregistrements"}
 </button>
 </label>

 <label className="md:col-span-2 flex flex-col gap-2 cmm-text-small cmm-text-secondary">
 Recherche rapide
 <input
 value={search}
 onChange={(event) => setSearch(event.target.value)}
 placeholder="Nom ou lieu"
 className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
 />
 </label>
 </div>

 {selectedItem && selectedQuality ? (
  <ActionsHistoryListDetails
    selectedItem={selectedItem}
    selectedQuality={selectedQuality}
    selectedOperational={selectedOperational}
    selectedLostPoints={selectedLostPoints}
    correctiveAction={correctiveAction}
    selectedCanModerateGroupJoin={selectedCanModerateGroupJoin}
    selectedCanViewActionAudit={selectedCanViewActionAudit}
    pendingGroupJoinRequests={pendingGroupJoinRequests}
    pendingGroupJoinLoading={pendingGroupJoinLoading}
    pendingGroupJoinError={pendingGroupJoinError}
    reviewingParticipantId={reviewingParticipantId}
    actionAudit={{
      data: actionAudit.data,
      isLoading: actionAudit.isLoading,
      error: actionAudit.error,
    }}
    fr={fr}
    onRefreshPending={() => {
      if (selectedActionId) {
        void loadPendingGroupJoinRequests(selectedActionId);
      }
    }}
    onReviewGroupJoin={(request, decision) => void handleReviewGroupJoin(request, decision)}
  />
 ) : null}

      <ActionsHistoryListTable
        filteredItems={filteredItems}
        qualityById={qualityById}
        limit={limit}
        isLoading={isLoading}
        error={error}
        isValidating={isValidating}
        currentUserId={currentUserId}
        isAdminLikeUser={isAdminLikeUser}
        groupJoinActionId={groupJoinActionId}
        onSelectItem={(itemId) => setSelectedId(itemId)}
        onLoadMore={() => setLimit((prev) => prev + 25)}
        onToggleGroupJoin={(item, nextEnabled) =>
          void handleToggleGroupJoin(item, nextEnabled)
        }
      />
    </section>
  );
}
