"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
    <Link
      href={`/spogomi/${encodeURIComponent(event.slug)}`}
      className="inline-flex min-h-11 items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
    >
      Voir la compétition SPOGOMI
    </Link>
  );
}
