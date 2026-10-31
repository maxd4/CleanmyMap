"use client";

import { useRef, useState } from "react";
import type { AdminOperationAuditEntry } from "@/lib/admin/audit/operation-audit";
import { AdminPanelShell } from "./admin-panel-shell";

export function AdminOperationsAuditPanel({
  entries,
}: {
  entries: AdminOperationAuditEntry[];
}) {
  const [items, setItems] = useState(entries);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const [actorUserId, setActorUserId] = useState("");
  const [operation, setOperation] = useState("");
  const [operationType, setOperationType] = useState("");
  const [outcome, setOutcome] = useState("");
  const [targetId, setTargetId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = async (append: boolean) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const search = new URLSearchParams({ limit: "50" });
      if (actorUserId.trim()) search.set("actorUserId", actorUserId.trim());
      if (operation.trim()) search.set("operation", operation.trim());
      if (operationType) search.set("operationType", operationType);
      if (outcome) search.set("outcome", outcome);
      if (targetId.trim()) search.set("targetId", targetId.trim());
      if (from) search.set("from", new Date(`${from}T00:00:00.000Z`).toISOString());
      if (to) search.set("to", new Date(`${to}T23:59:59.999Z`).toISOString());
      if (append && cursor) search.set("cursor", cursor);
      const response = await fetch(`/api/admin/operations?${search.toString()}`);
      if (!response.ok) throw new Error("audit load failed");
      const payload = await response.json() as { items?: AdminOperationAuditEntry[]; nextCursor?: string | null; hasMore?: boolean };
      if (!Array.isArray(payload.items)) throw new Error("invalid audit response");
      setItems((current) => append ? [...current, ...payload.items!] : payload.items!);
      setCursor(payload.nextCursor ?? null);
      setHasMore(payload.hasMore === true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Le journal administratif est indisponible.");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <AdminPanelShell
      title="Journal administrateurs"
      subtitle="Lecture seule des opérations administratives et de leurs cibles."
      variant="warm"
    >
      <div className="space-y-3">
        <div className="grid gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 md:grid-cols-4">
          <input aria-label="Auteur administratif" value={actorUserId} onChange={(event) => setActorUserId(event.target.value)} placeholder="Auteur (identifiant)" className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm" />
          <input aria-label="Opération" value={operation} onChange={(event) => setOperation(event.target.value)} placeholder="Opération" className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm" />
          <select aria-label="Famille d'opération" value={operationType} onChange={(event) => setOperationType(event.target.value)} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">
            <option value="">Toutes les familles</option>
            <option value="admin_operation">Opération admin</option>
            <option value="moderation">Modération</option>
            <option value="role_management">Gestion des rôles</option>
            <option value="import_dry_run">Import dry-run</option>
            <option value="import_confirm">Import confirmé</option>
            <option value="spogomi_team_name_rename">Nom d’équipe</option>
          </select>
          <select aria-label="Résultat" value={outcome} onChange={(event) => setOutcome(event.target.value)} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">
            <option value="">Tous les résultats</option>
            <option value="success">Succès</option>
            <option value="error">Erreur</option>
          </select>
          <input aria-label="Ressource cible" value={targetId} onChange={(event) => setTargetId(event.target.value)} placeholder="Identifiant cible" className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm" />
          <input aria-label="Début de période" type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm" />
          <input aria-label="Fin de période" type="date" value={to} onChange={(event) => setTo(event.target.value)} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm" />
          <button type="button" onClick={() => { setCursor(null); load(false).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Le journal administratif est indisponible.")); }} disabled={loading} className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">{loading ? "Chargement…" : "Filtrer"}</button>
        </div>
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-600">
            Aucune opération administrative enregistrée.
          </p>
        ) : (
          items.map((entry) => {
            const operation =
              typeof entry.details.operation === "string"
                ? entry.details.operation
                : entry.operationType;
            return (
              <article
                key={entry.operationId}
                className="rounded-xl border border-stone-200 bg-white px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-stone-950">{operation}</p>
                    <p className="mt-1 text-xs text-stone-600">
                      {entry.actorLabel ?? entry.actorUserId}
                      {entry.targetId ? ` · cible ${entry.targetId}` : ""}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 cmm-text-caption font-semibold ${
                      entry.outcome === "success"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {entry.outcome === "success" ? "Succès" : "Erreur"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-stone-500">
                  {new Date(entry.at).toLocaleString("fr-FR")}
                </p>
                {typeof entry.details.reason === "string" ? <p className="mt-2 text-sm text-stone-700">Motif : {entry.details.reason}</p> : null}
                {typeof entry.details.partialMutation === "boolean" ? <p className="mt-1 text-xs text-amber-800">Mutation partielle : {entry.details.partialMutation ? "oui" : "non"}</p> : null}
                {entry.details.previousValue && typeof entry.details.previousValue === "object" ? <p className="mt-1 text-xs text-stone-600">Avant : {formatProjectedValue(entry.details.previousValue)}</p> : null}
                {entry.details.newValue && typeof entry.details.newValue === "object" ? <p className="mt-1 text-xs text-stone-600">Après : {formatProjectedValue(entry.details.newValue)}</p> : null}
              </article>
            );
          })
        )}
        {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}
        {hasMore ? <button type="button" onClick={() => load(true).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Le journal administratif est indisponible."))} disabled={loading} className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 disabled:opacity-60">Charger la suite</button> : null}
      </div>
    </AdminPanelShell>
  );
}

function formatProjectedValue(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  return Object.entries(value as Record<string, unknown>)
    .map(([key, nested]) => `${key}: ${String(nested)}`)
    .join(" · ");
}
