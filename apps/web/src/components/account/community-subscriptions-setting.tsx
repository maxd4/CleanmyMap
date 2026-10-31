"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { getSupportedChatTerritoryOptions } from "@/lib/chat/channels";
import {
  COMMUNITY_SUBSCRIPTION_CADENCES,
  COMMUNITY_SUBSCRIPTION_TOPIC_IDS,
  type CommunitySubscriptionCadence,
  type CommunitySubscriptionRow,
  type CommunitySubscriptionTopicId,
} from "@/lib/community/subscriptions";
import type { Locale } from "@/lib/ui/preferences";

const TOPIC_LABELS: Record<CommunitySubscriptionTopicId, { fr: string; en: string }> = {
  future_actions: { fr: "Actions à venir", en: "Upcoming actions" },
  needs: { fr: "Besoins de la communauté", en: "Community needs" },
  results: { fr: "Résultats d’actions", en: "Action results" },
};

const CADENCE_LABELS: Record<CommunitySubscriptionCadence, { fr: string; en: string }> = {
  daily: { fr: "Chaque jour", en: "Daily" },
  weekly: { fr: "Chaque semaine", en: "Weekly" },
};

type SubscriptionsResponse = { items?: CommunitySubscriptionRow[] };

async function createSubscriptionRequest(body: {
  kind: "territory" | "topic";
  territoryZoneName?: string;
  topicId?: CommunitySubscriptionTopicId;
  cadence: CommunitySubscriptionCadence;
}): Promise<CommunitySubscriptionRow> {
  const response = await fetch("/api/community/subscriptions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => null) as { item?: CommunitySubscriptionRow } | null;
  if (!response.ok || !payload?.item) throw new Error("subscription creation failed");
  return payload.item;
}

async function updateSubscriptionRequest(itemId: string, patch: { cadence?: CommunitySubscriptionCadence; enabled?: boolean }): Promise<CommunitySubscriptionRow> {
  const response = await fetch(`/api/community/subscriptions/${itemId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
  const payload = await response.json().catch(() => null) as { item?: CommunitySubscriptionRow } | null;
  if (!response.ok || !payload?.item) throw new Error("subscription update failed");
  return payload.item;
}

async function deleteSubscriptionRequest(itemId: string): Promise<void> {
  const response = await fetch(`/api/community/subscriptions/${itemId}`, { method: "DELETE" });
  if (!response.ok) throw new Error("subscription deletion failed");
}

function getSubscriptionCopy(fr: boolean) {
  return fr
    ? { title: "Suivis communautaires", description: "Choisissez explicitement les territoires et thèmes que vous souhaitez suivre. Aucun suivi n’est créé par la navigation ou le profil.", cadence: "Cadence des nouveaux suivis", territory: "Territoires suivis", chooseTerritory: "Choisir un territoire", follow: "Suivre", unfollow: "Ne plus suivre", topics: "Thèmes suivis", disable: "Désactiver", enable: "Réactiver", unavailable: "Les suivis communautaires ne sont pas disponibles pour le moment.", loading: "Chargement des suivis…", emptyTerritory: "Aucun territoire suivi.", emptyTopic: "Aucun thème suivi." }
    : { title: "Community follows", description: "Explicitly choose the territories and topics you want to follow. Browsing and profile changes never create a follow.", cadence: "Cadence for new follows", territory: "Followed territories", chooseTerritory: "Choose a territory", follow: "Follow", unfollow: "Unfollow", topics: "Followed topics", disable: "Disable", enable: "Enable", unavailable: "Community follows are temporarily unavailable.", loading: "Loading follows…", emptyTerritory: "No territory followed.", emptyTopic: "No topic followed." };
}

export function CommunitySubscriptionsSetting({ locale }: { locale: Locale }) {
  const fr = locale === "fr";
  const [items, setItems] = useState<CommunitySubscriptionRow[]>([]);
  const [selectedTerritory, setSelectedTerritory] = useState("");
  const [newCadence, setNewCadence] = useState<CommunitySubscriptionCadence>("weekly");
  const [loading, setLoading] = useState(true);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const pendingKeyRef = useRef<string | null>(null);

  const territoryOptions = useMemo(() => getSupportedChatTerritoryOptions(), []);

  useEffect(() => {
    let active = true;
    fetch("/api/community/subscriptions")
      .then(async (response) => {
        if (!response.ok) throw new Error("subscriptions unavailable");
        return response.json() as Promise<SubscriptionsResponse>;
      })
      .then((payload) => {
        if (active) setItems(payload.items ?? []);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .then(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function createSubscription(body: {
    kind: "territory" | "topic";
    territoryZoneName?: string;
    topicId?: CommunitySubscriptionTopicId;
  }) {
    const key = body.kind === "territory" ? `territory:${body.territoryZoneName}` : `topic:${body.topicId}`;
    if (pendingKeyRef.current !== null) return;
    pendingKeyRef.current = key;
    setPendingKey(key);
    setError(false);
    try {
      const created = await createSubscriptionRequest({ ...body, cadence: newCadence });
      setItems((current) => [...current.filter((item) => item.id !== created.id), created]);
      if (body.kind === "territory") setSelectedTerritory("");
    } catch {
      setError(true);
    } finally {
      pendingKeyRef.current = null;
      setPendingKey(null);
    }
  }

  async function updateSubscription(item: CommunitySubscriptionRow, patch: { cadence?: CommunitySubscriptionCadence; enabled?: boolean }) {
    if (pendingKeyRef.current !== null) return;
    pendingKeyRef.current = item.id;
    setPendingKey(item.id);
    setError(false);
    try {
      const updated = await updateSubscriptionRequest(item.id, patch);
      setItems((current) => current.map((candidate) => candidate.id === item.id ? updated : candidate));
    } catch {
      setError(true);
    } finally {
      pendingKeyRef.current = null;
      setPendingKey(null);
    }
  }

  async function deleteSubscription(item: CommunitySubscriptionRow) {
    if (pendingKeyRef.current !== null) return;
    pendingKeyRef.current = item.id;
    setPendingKey(item.id);
    setError(false);
    try {
      await deleteSubscriptionRequest(item.id);
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
    } catch {
      setError(true);
    } finally {
      pendingKeyRef.current = null;
      setPendingKey(null);
    }
  }

  const topics = items.filter((item) => item.kind === "topic");
  const territories = items.filter((item) => item.kind === "territory");
  const subscribedTopicIds = new Set(topics.map((item) => item.topic_id));

  const copy = getSubscriptionCopy(fr);

  return (
    <section className="rounded-2xl border border-sky-200/70 bg-sky-50/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <h3 className="font-bold text-slate-900">{copy.title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-800">{copy.description}</p>
      {error ? <p className="mt-3 text-sm font-semibold text-rose-700" role="alert">{copy.unavailable}</p> : null}
      {loading ? <p className="mt-4 text-sm text-slate-700" role="status">{copy.loading}</p> : (
        <div className="mt-4 space-y-5">
          <label className="block text-sm font-semibold text-slate-800">
            {copy.cadence}
            <select value={newCadence} onChange={(event) => setNewCadence(event.target.value as CommunitySubscriptionCadence)} className="cmm-input mt-1 w-full sm:max-w-xs">
              {COMMUNITY_SUBSCRIPTION_CADENCES.map((cadence) => <option key={cadence} value={cadence}>{CADENCE_LABELS[cadence][fr ? "fr" : "en"]}</option>)}
            </select>
          </label>

          <div>
            <h4 className="text-sm font-bold text-slate-900">{copy.territory}</h4>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="block flex-1 text-sm text-slate-700">
                <span className="sr-only">{copy.chooseTerritory}</span>
                <select value={selectedTerritory} onChange={(event) => setSelectedTerritory(event.target.value)} className="cmm-input w-full">
                  <option value="">{copy.chooseTerritory}</option>
                  {territoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <CmmButton type="button" tone="secondary" variant="pill" disabled={!selectedTerritory || pendingKey !== null} onClick={() => { createSubscription({ kind: "territory", territoryZoneName: selectedTerritory }).catch(() => setError(true)); }}>
                {copy.follow}
              </CmmButton>
            </div>
            <div className="mt-3 space-y-2">
              {territories.length === 0 ? <p className="text-sm text-slate-700">{copy.emptyTerritory}</p> : territories.map((item) => (
                <SubscriptionRow key={item.id} item={item} fr={fr} pending={pendingKey === item.id} copy={copy} onUpdate={updateSubscription} onDelete={deleteSubscription} onError={() => setError(true)} />
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900">{copy.topics}</h4>
            <div className="mt-2 space-y-2">
              {COMMUNITY_SUBSCRIPTION_TOPIC_IDS.map((topicId) => {
                const item = topics.find((candidate) => candidate.topic_id === topicId);
                return item ? (
                  <SubscriptionRow key={item.id} item={item} fr={fr} pending={pendingKey === item.id} copy={copy} onUpdate={updateSubscription} onDelete={deleteSubscription} onError={() => setError(true)} />
                ) : (
                  <div key={topicId} className="flex flex-col gap-2 rounded-xl border border-sky-100 bg-white/80 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-semibold text-slate-900">{TOPIC_LABELS[topicId][fr ? "fr" : "en"]}</span>
                    <CmmButton type="button" tone="secondary" variant="pill" disabled={pendingKey !== null || subscribedTopicIds.has(topicId)} onClick={() => { createSubscription({ kind: "topic", topicId }).catch(() => setError(true)); }}>
                      {copy.follow}
                    </CmmButton>
                  </div>
                );
              })}
              {topics.length === 0 ? <p className="text-sm text-slate-700">{copy.emptyTopic}</p> : null}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function SubscriptionRow({
  item,
  fr,
  pending,
  copy,
  onUpdate,
  onDelete,
  onError,
}: {
  item: CommunitySubscriptionRow;
  fr: boolean;
  pending: boolean;
  copy: { unfollow: string; disable: string; enable: string };
  onUpdate: (item: CommunitySubscriptionRow, patch: { cadence?: CommunitySubscriptionCadence; enabled?: boolean }) => Promise<void>;
  onDelete: (item: CommunitySubscriptionRow) => Promise<void>;
  onError: () => void;
}) {
  const label = item.kind === "topic" && item.topic_id
    ? TOPIC_LABELS[item.topic_id][fr ? "fr" : "en"]
    : item.territory_zone_name ?? "";
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-sky-100 bg-white/80 p-3 sm:flex-row sm:items-center sm:justify-between">
      <span className={item.enabled ? "text-sm font-semibold text-slate-900" : "text-sm font-semibold text-slate-500"}>{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-semibold text-slate-700">
          <span className="sr-only">{label}</span>
          <select aria-label={`${label} cadence`} value={item.cadence} disabled={pending} onChange={(event) => { onUpdate(item, { cadence: event.target.value as CommunitySubscriptionCadence }).catch(onError); }} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">
            {COMMUNITY_SUBSCRIPTION_CADENCES.map((cadence) => <option key={cadence} value={cadence}>{CADENCE_LABELS[cadence][fr ? "fr" : "en"]}</option>)}
          </select>
        </label>
        <CmmButton type="button" tone="tertiary" variant="pill" disabled={pending} onClick={() => { onUpdate(item, { enabled: !item.enabled }).catch(onError); }}>
          {item.enabled ? copy.disable : copy.enable}
        </CmmButton>
        <CmmButton type="button" tone="tertiary" variant="pill" disabled={pending} onClick={() => { onDelete(item).catch(onError); }}>
          {copy.unfollow}
        </CmmButton>
      </div>
    </div>
  );
}
