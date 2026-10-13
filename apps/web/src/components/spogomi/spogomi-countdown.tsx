"use client";

import { useEffect, useState } from "react";
import { formatSpogomiCountdown, getSpogomiCountdownState } from "./spogomi-countdown.model";

export function SpogomiCountdown({ startsAt }: { startsAt: string | null | undefined }) {
  const [state, setState] = useState(() => getSpogomiCountdownState(startsAt, Date.now()));

  useEffect(() => {
    const update = () => setState(getSpogomiCountdownState(startsAt, Date.now()));
    update();
    if (!startsAt || Number.isNaN(Date.parse(startsAt))) return;
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [startsAt]);

  if (state.kind === "unknown") {
    return <p className="text-xs font-bold text-amber-900">Date et heure à confirmer</p>;
  }
  if (state.kind === "invalid") {
    return <p className="text-xs font-bold text-amber-900">Date indisponible</p>;
  }
  if (state.kind === "started") {
    return <p className="text-xs font-bold text-emerald-800">Décompte terminé</p>;
  }
  return (
    <p className="font-mono text-sm font-black tabular-nums text-amber-950" aria-live="polite">
      {formatSpogomiCountdown(state.totalSeconds)}
    </p>
  );
}
