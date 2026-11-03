"use client";

import { useEffect, useState } from "react";
import { parseJsonSafely } from "@/lib/actions/http-errors";

type ConsentPayload = {
  enabled?: unknown;
  ageBand?: unknown;
  optionalTreatmentAllowed?: unknown;
  activatedAt?: unknown;
};

function parsePayload(value: unknown): ConsentPayload | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
}

export function TerritorialLegendConsentSetting({ fr }: { fr: boolean }) {
  const [enabled, setEnabled] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/users/profile/territorial-legend-consent", { cache: "no-store" })
      .then(async (response) => {
        const payload = parsePayload(await parseJsonSafely(response));
        if (!response.ok || !payload) throw new Error("territorial consent load failed");
        return payload;
      })
      .then((payload) => {
        if (!active) return;
        setEnabled(payload.enabled === true);
        setEligible(payload.optionalTreatmentAllowed === true || payload.ageBand === "15_or_over");
        setLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        setLoaded(true);
        setError(true);
      });
    return () => { active = false; };
  }, []);

  async function update(nextEnabled: boolean) {
    setSaving(true);
    setError(false);
    setSaved(false);
    try {
      const response = await fetch("/api/users/profile/territorial-legend-consent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      const payload = parsePayload(await parseJsonSafely(response));
      if (!response.ok || !payload) throw new Error("territorial consent update failed");
      setEnabled(payload.enabled === true);
      setSaved(true);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-[1.45rem] border border-[#d7e9f1] bg-[#f4fbfd] px-4 py-3 text-sm leading-6 text-[#5e747d]">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-[#0f7894]"
          checked={enabled}
          disabled={!loaded || saving || !eligible}
          onChange={(event) => { void update(event.target.checked); }}
        />
        <span>
          {fr
            ? eligible
              ? "Participer aux Légendes territoriales — Votre nom public, votre score et votre rang peuvent apparaître dans le classement du territoire sélectionné. Le consentement est distinct du classement XP et peut être révoqué à tout moment."
              : "Les Légendes territoriales restent désactivées tant qu’une tranche d’âge autorisée n’est pas déclarée."
            : eligible
              ? "Join Territorial Legends — Your public name, score and rank may appear in the selected territory leaderboard. This consent is separate from the XP leaderboard and can be revoked at any time."
              : "Territorial Legends stay disabled until an eligible age band is declared."}
        </span>
      </label>
      {error ? <p className="mt-2 text-rose-700" role="alert">{fr ? "Impossible de mettre à jour ce consentement." : "Unable to update this consent."}</p> : null}
      {saved ? <p className="mt-2 text-emerald-700" role="status">{fr ? "Consentement enregistré." : "Consent saved."}</p> : null}
    </div>
  );
}
