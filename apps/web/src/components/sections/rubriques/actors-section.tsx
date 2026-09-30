"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { fetchActions, fetchMapActions } from "@/lib/actions/http";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { Users } from "lucide-react";
import type {
  PublicSectionActionListResponse,
  PublicSectionInitialData,
  PublicSectionMapResponse,
} from "@/lib/sections/public-section-snapshot-contract";
import type { ActionListItem } from "@/lib/actions/types";
import { buildActorActivityCards } from "@/lib/community/engagement";
import { ActorsActivityGrid, ActorsHotspotsCard } from "./actors-section-view";

function extractArea(label: string): string {
  const normalized = label.toLowerCase();
  const matched = normalized.match(/\b([1-9]|1[0-9]|20)(?:eme|er|e)?\b/);
  if (!matched) {
    return "Hors arrondissement";
  }
  return `${matched[1]}e`;
}

export function ActorsSection({
  initialData,
}: {
  initialData?: PublicSectionInitialData["actors"];
}) {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  
  const { data: mapData, isLoading: mapLoading } = useSWR<PublicSectionMapResponse>(
    ["section-actors-map"],
    () => fetchMapActions({ limit: 220, days: 365, status: "approved" }),
    { fallbackData: initialData?.map ?? undefined },
  );
  const { data: actionsData, isLoading: actionsLoading } = useSWR<PublicSectionActionListResponse>(
    ["section-actors-actions"],
    () => fetchActions({ status: "approved", limit: 250 }),
    { fallbackData: initialData?.actions ?? undefined },
  );

  const hotspots = useMemo(() => {
    const byArea = new Map<string, number>();
    for (const item of mapData?.items ?? []) {
      const area = extractArea(item.location_label ?? "");
      byArea.set(area, (byArea.get(area) ?? 0) + 1);
    }
    return [...byArea.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [mapData?.items]);

  const actorActivityCards = useMemo(() => {
    const items: ActionListItem[] = (actionsData?.items ?? []).map((item) => ({
      id: item.id,
      created_at: item.created_at,
      actor_name: item.actor_name,
      association_name: null,
      organizer_type: null,
      action_date: item.action_date,
      location_label: item.location_label,
      latitude: item.contract?.geometry.coordinates[0]?.[1] ?? null,
      longitude: item.contract?.geometry.coordinates[0]?.[0] ?? null,
      waste_kg: item.waste_kg,
      cigarette_butts: item.cigarette_butts,
      volunteers_count: item.volunteers_count,
      duration_minutes: item.duration_minutes,
      notes: null,
      status: "approved",
      contract: undefined,
      source: item.source,
    }));
    return buildActorActivityCards(items);
  }, [actionsData?.items]);

  return (
    <SectionShell
      id="actors"
      title={fr ? "Activité des acteurs" : "Actors activity"}
      subtitle={fr
        ? "Synthèse des actions enregistrées, des zones observées et de la qualité des déclarations."
        : "Summary of recorded actions, observed areas and declaration quality."}
      icon={Users}
      gradient="from-indigo-500/20 via-sky-500/10 to-transparent"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-10 pt-8 items-start">
        <ActorsHotspotsCard fr={fr} loading={mapLoading} hotspots={hotspots} />
        <ActorsActivityGrid fr={fr} loading={actionsLoading} cards={actorActivityCards} />
      </div>
    </SectionShell>
  );
}
