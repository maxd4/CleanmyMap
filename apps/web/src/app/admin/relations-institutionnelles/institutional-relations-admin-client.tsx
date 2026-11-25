"use client";

import { useCallback, useEffect, useState } from "react";
import type { InstitutionalContactsListResult } from "@/lib/partners/institutional-relations/relationship-store";
import { projectPublicEntity } from "@/lib/partners/public-entity-projection";

const API_URL = "/api/admin/partners/institutional-relations";

export function InstitutionalRelationsAdminClient() {
  const [data, setData] = useState<InstitutionalContactsListResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(API_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as InstitutionalContactsListResult;
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetch(API_URL, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as InstitutionalContactsListResult;
      })
      .then((json) => {
        if (!active) return;
        setData(json);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Erreur de chargement");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleReviewFact(factId: string, reviewStatus: "verified" | "withdrawn") {
    setBusyId(factId);
    try {
      const res = await fetch(API_URL, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factId,
          reviewStatus,
          reason: reviewStatus === "verified" ? "Preuve vérifiée" : "Preuve retirée",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de mise à jour");
    } finally {
      setBusyId(null);
    }
  }

  if (loading && !data) {
    return <p className="text-sm text-slate-600">Chargement du suivi institutionnel…</p>;
  }

  if (error) {
    return (
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {error}
      </div>
    );
  }

  const contacts = data?.contacts ?? [];

  return (
    <section aria-label="Tableau de suivi institutionnel" className="space-y-4">
      {(data?.truncated.contacts || data?.truncated.facts) && (
        <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          Historique partiellement tronqué : une absence de preuve affichée ne vaut pas absence certaine de relation.
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-4 py-3">Interlocuteur</th>
              <th className="px-4 py-3">Identité publique</th>
              <th className="px-4 py-3">Indicateurs</th>
              <th className="px-4 py-3">Faits & preuves</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contacts.map((contact) => {
              const publicProjection = contact.institutionalNodeId
                ? projectPublicEntity({ institutionId: contact.institutionalNodeId })
                : null;
              return (
                <tr key={contact.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{contact.displayName}</div>
                    {contact.roleLabel && (
                      <div className="text-xs text-slate-500">{contact.roleLabel}</div>
                    )}
                    <div className="mt-1 text-xs text-slate-500">
                      Statut : {contact.revalidationStatus}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-700">
                    {publicProjection ? (
                      <div>
                        <div className="font-medium">{publicProjection.identity.name}</div>
                        <div>Limites publiques : {publicProjection.limits.length}</div>
                      </div>
                    ) : (
                      <span className="text-slate-400">Prospect privé uniquement</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <ul className="space-y-1">
                      <li>
                        Contact direct :{" "}
                        {contact.distinctions.directContact
                          ? "Établi"
                          : contact.distinctionsIncomplete
                            ? "Indéterminé : données incomplètes"
                            : "Non établi"}
                      </li>
                      <li>
                        Soutien explicite :{" "}
                        {contact.distinctions.explicitSupport
                          ? "Établi"
                          : contact.distinctionsIncomplete
                            ? "Indéterminé : données incomplètes"
                            : "Non établi"}
                      </li>
                      <li>
                        Contribution effective :{" "}
                        {contact.distinctions.effectiveContribution
                          ? "Établi"
                          : contact.distinctionsIncomplete
                            ? "Indéterminé : données incomplètes"
                            : "Non établi"}
                      </li>
                    </ul>
                    {contact.distinctionsIncomplete && (
                      <span className="mt-1 inline-block text-xs text-amber-700">
                        Lecture incomplète
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <ul className="space-y-2">
                      {contact.facts.map((fact) => (
                        <li key={fact.id} className="rounded border border-slate-200 p-2">
                          <div className="font-medium">{fact.summary}</div>
                          <div className="text-slate-500">
                            {fact.kind} · {fact.origin} · {fact.reviewStatus}
                          </div>
                          <div className="text-slate-500">
                            Preuve : {fact.evidenceRef}
                            {fact.occurredAt ? ` (${fact.occurredAt})` : ""}
                          </div>
                          {(fact.reviewStatus === "pending" || fact.reviewStatus === "verified") && (
                            <div className="mt-1 flex gap-2">
                              {fact.reviewStatus === "pending" && (
                                <button
                                  type="button"
                                  disabled={busyId === fact.id}
                                  onClick={() => void handleReviewFact(fact.id, "verified")}
                                  className="rounded bg-emerald-600 px-2 py-0.5 text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  Vérifier
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={busyId === fact.id}
                                onClick={() => void handleReviewFact(fact.id, "withdrawn")}
                                className="rounded bg-rose-600 px-2 py-0.5 text-white hover:bg-rose-700 disabled:opacity-50"
                              >
                                Retirer
                              </button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              );
            })}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                  Aucun contact institutionnel enregistré.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
