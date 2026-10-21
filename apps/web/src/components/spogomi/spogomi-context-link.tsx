"use client";

import { useEffect, useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";

export function SpogomiContextLink({ actionId }: { actionId: string }) {
  const [event, setEvent] = useState<{ slug: string; name: string } | null>(null);
  useEffect(() => {
    let active = true;
    void fetch(`/api/spogomi/public/by-action/${encodeURIComponent(actionId)}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((body: { event?: { slug: string; name: string } | null } | null) => {
        if (active) setEvent(body?.event ?? null);
      })
      .catch(() => { if (active) setEvent(null); });
    return () => { active = false; };
  }, [actionId]);
  if (!event) return null;
  return (
    <CmmButton href={`/spogomi/${encodeURIComponent(event.slug)}`} tone="secondary" size="sm" variant="pill">
      Voir la compétition SPOGOMI
    </CmmButton>
  );
}
