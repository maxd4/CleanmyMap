"use client";

import { useEffect, useState } from "react";

export function LeaderboardOptInSetting({ fr }: { fr: boolean }) {
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/users/profile/leaderboard-opt-in", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error("leaderboard preference load failed");
        return payload as { leaderboardPublicOptIn?: unknown };
      })
      .then((payload: { leaderboardPublicOptIn?: unknown }) => {
        if (!active) return;
        setEnabled(payload.leaderboardPublicOptIn === true);
        setLoaded(true);
      })
      .catch(() => {
        if (active) {
          setLoaded(true);
          setError(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function updatePreference(nextValue: boolean) {
    setSaving(true);
    setError(false);
    setSaved(false);
    try {
      const response = await fetch("/api/users/profile/leaderboard-opt-in", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaderboardPublicOptIn: nextValue }),
      });
      const payload = await response.json().catch(() => null) as { leaderboardPublicOptIn?: unknown } | null;
      if (!response.ok) throw new Error("leaderboard preference update failed");
      setEnabled(payload?.leaderboardPublicOptIn === true);
      setSaved(true);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <label className="mt-4 flex items-start gap-3 rounded-[1.45rem] border border-[#f0d9d2] bg-[#fff8f6] px-4 py-3 text-[12px] leading-6 text-[#8a716b]">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 accent-[#c51f1f]"
        checked={enabled}
        disabled={!loaded || saving}
        onChange={(event) => void updatePreference(event.target.checked)}
      />
      <span>
        {fr
          ? "Apparaître dans le classement public — Lorsque cette option est activée, votre nom public et vos compteurs de niveau, XP validée et badges peuvent apparaître dans le classement public CleanMyMap. Vos contributions détaillées, votre impact personnel et vos données privées restent masqués."
          : "Appear in the public leaderboard — When enabled, your public name and level, validated XP and badge counters may appear in the CleanMyMap public leaderboard. Your detailed contributions, personal impact and private data remain hidden."}
      </span>
      {error ? <span role="alert">{fr ? "Impossible de mettre à jour cette préférence." : "Unable to update this preference."}</span> : null}
      {saved ? <span role="status">{fr ? "Préférence enregistrée." : "Preference saved."}</span> : null}
    </label>
  );
}
