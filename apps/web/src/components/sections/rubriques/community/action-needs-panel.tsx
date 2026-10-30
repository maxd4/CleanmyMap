"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createCommunityNeed,
  fetchCommunityNeeds,
  updateCommunityNeed,
  type ActionNeedActionSummary,
  type ActionNeedItem,
  type CreateActionNeedInput,
} from "@/lib/community/needs-http";
import { COMMUNITY_HELP_CATEGORIES, type CommunityHelpCategory } from "@/lib/community/action-needs";

const CATEGORY_LABELS: Record<CommunityHelpCategory, string> = {
  materiel: "Matériel",
  transport: "Transport",
  renfort_benevole: "Renfort bénévole",
  communication: "Communication",
  photo_video: "Photo / vidéo",
  cartographie: "Cartographie",
  expertise: "Expertise",
  logistique: "Logistique",
};

function formatDate(value: string, fr: boolean): string {
  return new Intl.DateTimeFormat(fr ? "fr-FR" : "en-GB", {
    dateStyle: "medium",
    timeZone: "Europe/Paris",
  }).format(new Date(`${value}T12:00:00+01:00`));
}

function formatStatus(item: ActionNeedItem, fr: boolean): string {
  if (item.effectiveStatus === "expired") return fr ? "Expiré" : "Expired";
  if (item.status === "fulfilled") return fr ? "Pourvu" : "Fulfilled";
  if (item.status === "cancelled") return fr ? "Annulé" : "Cancelled";
  return fr ? "Ouvert" : "Open";
}

function toIsoDateTime(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function NeedCard({
  item,
  fr,
  onEdit,
  onFulfill,
  onCancel,
  busy,
}: {
  item: ActionNeedItem;
  fr: boolean;
  onEdit: () => void;
  onFulfill: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const terminal = item.effectiveStatus !== "open";
  return (
    <article className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{CATEGORY_LABELS[item.category]}</p>
          <h3 className="mt-1 text-lg font-black text-slate-900">{item.title}</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
          {formatStatus(item, fr)}
        </span>
      </div>
      <div className="mt-3 grid gap-1 text-sm text-slate-600 sm:grid-cols-3">
        <span>{item.action.title}</span>
        <span>{formatDate(item.action.actionDate, fr)}</span>
        <span>{item.action.locationLabel}</span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{item.description}</p>
      {item.quantityLabel ? <p className="mt-2 text-sm font-semibold text-slate-700">{fr ? "Quantité :" : "Quantity:"} {item.quantityLabel}</p> : null}
      {item.expiresAt ? <p className="mt-2 text-xs text-slate-500">{fr ? "Échéance :" : "Due:"} {new Intl.DateTimeFormat(fr ? "fr-FR" : "en-GB", { dateStyle: "medium", timeZone: "Europe/Paris" }).format(new Date(item.expiresAt))}</p> : null}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <Link className="font-bold text-emerald-800 underline-offset-4 hover:underline" href={`/sections/rejoindre-une-action?tab=needs&actionId=${encodeURIComponent(item.actionId)}`}>
          {fr ? "Voir les besoins de l’action" : "View this action’s needs"}
        </Link>
        <Link className="font-bold text-slate-700 underline-offset-4 hover:underline" href="/sections/messagerie?tab=discussions&channel=community&topicId=besoin_ressources">
          {fr ? "En parler dans la communauté" : "Discuss in the community"}
        </Link>
      </div>
      {item.canManage ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50" disabled={busy || terminal} onClick={onEdit}>
            {fr ? "Modifier" : "Edit"}
          </button>
          <button type="button" className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50" disabled={busy || terminal} onClick={onFulfill}>
            {fr ? "Accomplir" : "Fulfill"}
          </button>
          <button type="button" className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50" disabled={busy || terminal} onClick={onCancel}>
            {fr ? "Annuler" : "Cancel"}
          </button>
        </div>
      ) : null}
    </article>
  );
}

export function ActionNeedsPanel({ fr, focusActionId }: { fr: boolean; focusActionId: string | null }) {
  const [items, setItems] = useState<ActionNeedItem[]>([]);
  const [managerActions, setManagerActions] = useState<ActionNeedActionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateActionNeedInput>({
    actionId: "",
    category: COMMUNITY_HELP_CATEGORIES[0],
    title: "",
    description: "",
    quantityLabel: "",
    expiresAt: null,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCommunityNeeds({ actionId: focusActionId, limit: 50 });
      setItems(result.items);
      setManagerActions(result.managerActions);
      setCreateForm((previous) => ({
        ...previous,
        actionId: previous.actionId || result.managerActions[0]?.id || "",
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : (fr ? "Les besoins sont indisponibles." : "Needs are unavailable."));
    } finally {
      setLoading(false);
    }
  }, [focusActionId, fr]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const editingItem = useMemo(() => items.find((item) => item.id === editingId) ?? null, [editingId, items]);

  async function mutate(item: ActionNeedItem, operation: "fulfill" | "cancel") {
    setBusyId(item.id);
    setNotice(null);
    try {
      await updateCommunityNeed(item.id, { operation });
      setNotice(fr ? "Besoin mis à jour." : "Need updated.");
      await load();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : (fr ? "La mise à jour a échoué." : "The update failed."));
    } finally {
      setBusyId(null);
    }
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyId("create");
    setError(null);
    try {
      await createCommunityNeed({ ...createForm, quantityLabel: createForm.quantityLabel || null, expiresAt: createForm.expiresAt ? toIsoDateTime(createForm.expiresAt) : null });
      setNotice(fr ? "Besoin créé." : "Need created.");
      setCreateForm((previous) => ({ ...previous, title: "", description: "", quantityLabel: "", expiresAt: null }));
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : (fr ? "La création a échoué." : "Creation failed."));
    } finally {
      setBusyId(null);
    }
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingItem) return;
    const form = new FormData(event.currentTarget);
    setBusyId(editingItem.id);
    setError(null);
    try {
      await updateCommunityNeed(editingItem.id, {
        operation: "update",
        category: String(form.get("category")) as CommunityHelpCategory,
        title: String(form.get("title")),
        description: String(form.get("description")),
        quantityLabel: String(form.get("quantityLabel") || "") || null,
        expiresAt: String(form.get("expiresAt") || "") ? toIsoDateTime(String(form.get("expiresAt"))) : null,
      });
      setEditingId(null);
      setNotice(fr ? "Besoin modifié." : "Need edited.");
      await load();
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : (fr ? "La modification a échoué." : "Edit failed."));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <div role="status" className="rounded-2xl border border-emerald-100 bg-white px-4 py-6 text-sm font-semibold text-emerald-900">{fr ? "Chargement des besoins…" : "Loading needs…"}</div>;

  return (
    <section aria-labelledby="community-needs-title" className="space-y-5">
      <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <h2 id="community-needs-title" className="text-xl font-black text-slate-900">{fr ? "Besoins de la communauté" : "Community needs"}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-800">{fr ? "Trouvez une aide concrète pour les actions publiées. Les besoins annulés et les informations privées restent masqués." : "Find concrete ways to help public actions. Cancelled needs and private information stay hidden."}</p>
        <Link className="mt-3 inline-block text-sm font-bold text-emerald-800 underline-offset-4 hover:underline" href="/sections/messagerie?tab=discussions&channel=community&topicId=besoin_ressources">
          {fr ? "Ouvrir le topic conversationnel besoin_ressources" : "Open the besoin_ressources conversation topic"}
        </Link>
      </div>

      {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800"><p>{error}</p><button type="button" className="mt-3 font-bold underline" onClick={() => { void load(); }}>{fr ? "Réessayer" : "Retry"}</button></div> : null}
      {notice ? <p role="status" className="text-sm font-semibold text-emerald-800">{notice}</p> : null}

      {managerActions.length > 0 ? (
        <form onSubmit={(event) => { void submitCreate(event); }} className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="text-lg font-black text-slate-900">{fr ? "Créer un besoin" : "Create a need"}</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-sm font-bold text-slate-700">{fr ? "Action" : "Action"}<select className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3" value={createForm.actionId} onChange={(event) => setCreateForm((previous) => ({ ...previous, actionId: event.target.value }))}>{managerActions.map((action) => <option key={action.id} value={action.id}>{action.title} — {formatDate(action.actionDate, fr)}</option>)}</select></label>
            <label className="text-sm font-bold text-slate-700">{fr ? "Catégorie" : "Category"}<select className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3" value={createForm.category} onChange={(event) => setCreateForm((previous) => ({ ...previous, category: event.target.value as CommunityHelpCategory }))}>{COMMUNITY_HELP_CATEGORIES.map((category) => <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>)}</select></label>
            <label className="text-sm font-bold text-slate-700 md:col-span-2">{fr ? "Titre" : "Title"}<input required minLength={3} maxLength={80} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3" value={createForm.title} onChange={(event) => setCreateForm((previous) => ({ ...previous, title: event.target.value }))} /></label>
            <label className="text-sm font-bold text-slate-700 md:col-span-2">{fr ? "Description" : "Description"}<textarea required maxLength={500} className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" value={createForm.description} onChange={(event) => setCreateForm((previous) => ({ ...previous, description: event.target.value }))} /></label>
            <label className="text-sm font-bold text-slate-700">{fr ? "Quantité" : "Quantity"}<input maxLength={80} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3" value={createForm.quantityLabel ?? ""} onChange={(event) => setCreateForm((previous) => ({ ...previous, quantityLabel: event.target.value }))} /></label>
            <label className="text-sm font-bold text-slate-700">{fr ? "Échéance (facultative)" : "Due date (optional)"}<input type="datetime-local" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3" value={createForm.expiresAt ?? ""} onChange={(event) => setCreateForm((previous) => ({ ...previous, expiresAt: event.target.value || null }))} /></label>
          </div>
          <button type="submit" disabled={busyId === "create" || !createForm.actionId} className="mt-4 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50">{busyId === "create" ? (fr ? "Création…" : "Creating…") : (fr ? "Créer le besoin" : "Create need")}</button>
        </form>
      ) : null}

      {editingItem ? (
        <form onSubmit={(event) => { void submitEdit(event); }} className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
          <h3 className="text-lg font-black text-slate-900">{fr ? "Modifier le besoin" : "Edit need"}</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-sm font-bold text-slate-700">{fr ? "Catégorie" : "Category"}<select name="category" defaultValue={editingItem.category} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3">{COMMUNITY_HELP_CATEGORIES.map((category) => <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>)}</select></label>
            <label className="text-sm font-bold text-slate-700">{fr ? "Titre" : "Title"}<input name="title" required minLength={3} maxLength={80} defaultValue={editingItem.title} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3" /></label>
            <label className="text-sm font-bold text-slate-700 md:col-span-2">{fr ? "Description" : "Description"}<textarea name="description" required maxLength={500} defaultValue={editingItem.description} className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
            <label className="text-sm font-bold text-slate-700">{fr ? "Quantité" : "Quantity"}<input name="quantityLabel" maxLength={80} defaultValue={editingItem.quantityLabel ?? ""} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3" /></label>
            <label className="text-sm font-bold text-slate-700">{fr ? "Échéance ISO" : "ISO due date"}<input name="expiresAt" defaultValue={editingItem.expiresAt ? editingItem.expiresAt.slice(0, 16) : ""} type="datetime-local" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3" /></label>
          </div>
          <div className="mt-4 flex gap-2"><button type="submit" disabled={busyId === editingItem.id} className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{fr ? "Enregistrer" : "Save"}</button><button type="button" className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold" onClick={() => setEditingId(null)}>{fr ? "Fermer" : "Close"}</button></div>
        </form>
      ) : null}

      {items.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">{fr ? "Aucun besoin à afficher pour le moment." : "No needs to display yet."}</div> : <div className="grid gap-4">{items.map((item) => <NeedCard key={item.id} item={item} fr={fr} busy={busyId === item.id} onEdit={() => setEditingId(item.id)} onFulfill={() => { void mutate(item, "fulfill"); }} onCancel={() => { void mutate(item, "cancel"); }} />)}</div>}
    </section>
  );
}
