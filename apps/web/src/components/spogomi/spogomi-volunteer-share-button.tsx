"use client";

import { useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";

export function SpogomiVolunteerShareButton({ eventName, eventDate, mission, eventHref }: { eventName: string; eventDate: string; mission: string; eventHref: string }) {
  const [message, setMessage] = useState<string | null>(null);
  async function share() {
    const text = `Contribution SPOGOMI certifiée · ${mission} · ${eventDate}`;
    try {
      if (navigator.share) await navigator.share({ title: `SPOGOMI · ${eventName}`, text, url: eventHref });
      else { await navigator.clipboard.writeText(`${text}\n${eventHref}`); setMessage("Résumé copié, sans nom ni PDF."); }
    } catch { setMessage("Partage annulé."); }
  }
  return <span className="inline-flex flex-wrap items-center gap-2"><CmmButton type="button" size="sm" tone="secondary" onClick={() => void share()}>Partager un résumé</CmmButton>{message ? <span role="status" className="text-xs text-emerald-100/75">{message}</span> : null}</span>;
}
