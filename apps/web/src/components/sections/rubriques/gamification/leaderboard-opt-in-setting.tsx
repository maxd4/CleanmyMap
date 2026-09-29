"use client";

import { useEffect, useState } from "react";

export function LeaderboardOptInSetting({ fr }: { fr: boolean }) {
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/users/profile/leaderboard-opt-in", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { leaderboardPublicOptIn?: unknown }) => {
        if (!active) return;
        setEnabled(payload.leaderboardPublicOptIn === true);
        setLoaded(true);
      })
      .catch(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  async function updatePreference(nextValue: boolean) {
    setEnabled(nextValue);
    setSaving(true);
    try {
      const response = await fetch("/api/users/profile/leaderboard-opt-in", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaderboardPublicOptIn: nextValue }),
      });
      if (!response.ok) throw new Error("leaderboard preference update failed");
    } catch {
      setEnabled(!nextValue);
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
          ? "J’autorise mon profil à apparaître dans le classement utilisateur."
          : "I allow my profile to appear in the user leaderboard."}
      </span>
    </label>
  );
}
