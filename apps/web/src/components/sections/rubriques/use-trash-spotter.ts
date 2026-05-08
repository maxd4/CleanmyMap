"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetchMapActions } from "@/lib/actions/http";
import { createSpot } from "@/lib/spots/http";
import { mapItemType } from "@/lib/actions/data-contract";
import { swrRecentViewOptions } from "@/lib/swr-config";
import type { SpotType, SpotFormStatus } from "./trash-spotter-types";

function toOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function useTrashSpotter(fr: boolean) {
  const [spotType, setSpotType] = useState<SpotType>("spot");
  const [spotLabel, setSpotLabel] = useState("");
  const [spotLatitude, setSpotLatitude] = useState("");
  const [spotLongitude, setSpotLongitude] = useState("");
  const [spotNotes, setSpotNotes] = useState("");
  const [spotState, setSpotState] = useState<SpotFormStatus>("idle");
  const [spotMessage, setSpotMessage] = useState<string | null>(null);

  const { data, isLoading, error, mutate } = useSWR(
    ["section-trash-spotter"],
    () => fetchMapActions({
      status: "all",
      days: 180,
      limit: 250,
      types: ["clean_place", "spot"],
    }),
    swrRecentViewOptions,
  );

  const onCreateSpot = async () => {
    if (spotState === "pending") return;
    setSpotMessage(null);
    const label = spotLabel.trim();

    if (label.length < 2) {
      setSpotState("error");
      setSpotMessage(fr ? "Renseigne un libellé de spot (minimum 2 caractères)." : "Enter a spot label (2 chars min).");
      return;
    }

    const latitude = toOptionalNumber(spotLatitude);
    const longitude = toOptionalNumber(spotLongitude);
    const latRaw = spotLatitude.trim();
    const lonRaw = spotLongitude.trim();

    if ((latRaw && latitude === undefined) || (lonRaw && longitude === undefined)) {
      setSpotState("error");
      setSpotMessage(fr ? "Latitude/longitude invalides." : "Invalid latitude/longitude.");
      return;
    }

    if ((latitude !== undefined) !== (longitude !== undefined)) {
      setSpotState("error");
      setSpotMessage(fr ? "Renseigne latitude et longitude ensemble." : "Provide both lat and lon.");
      return;
    }

    setSpotState("pending");

    // Optimistic Update
    await mutate(async (currentData) => {
      if (!currentData) return currentData;
      return {
        ...currentData,
        items: [
          {
            id: `temp-${Date.now()}`,
            status: "pending",
            action_date: new Date().toISOString(),
            location_label: label,
            latitude: latitude ?? null,
            longitude: longitude ?? null,
            waste_kg: null,
            cigarette_butts: null,
            created_by_clerk_id: null,
            contract: {
              id: `temp-${Date.now()}`,
              type: spotType,
              status: "pending",
              source: "optimistic",
              location: { label, latitude: latitude ?? null, longitude: longitude ?? null },
              geometry: { kind: "point", coordinates: [], geojson: null, confidence: null, geometrySource: "manual", origin: "manual" },
              dates: { observedAt: new Date().toISOString(), createdAt: new Date().toISOString(), importedAt: null, validatedAt: null },
              metadata: { actorName: null, notes: spotNotes.trim() || null, notesPlain: spotNotes.trim() || null, volunteersCount: 1, durationMinutes: 0, wasteKg: null, cigaretteButts: null, manualDrawing: null }
            }
          },
          ...currentData.items
        ]
      };
    }, { revalidate: false });

    try {
      const result = await createSpot({
        type: spotType,
        label,
        latitude,
        longitude,
        notes: spotNotes.trim() || undefined,
      });
      setSpotState("success");
      setSpotMessage(fr ? `Spot créé (${result.id}). En attente de modération.` : `Spot created (${result.id}). Awaiting moderation.`);
      setSpotLabel("");
      setSpotLatitude("");
      setSpotLongitude("");
      setSpotNotes("");
      await mutate();
    } catch (err) {
      setSpotState("error");
      setSpotMessage(err instanceof Error ? err.message : (fr ? "Erreur création." : "Creation error."));
      await mutate();
    }
  };

  const quality = useMemo(() => {
    const items = (data?.items ?? []).filter((item) => {
      const type = mapItemType(item);
      return type === "clean_place" || type === "spot";
    });
    const pending = items.filter((i) => i.status === "pending").length;
    const approved = items.filter((i) => i.status === "approved").length;
    const withCoords = items.filter((i) => i.latitude !== null && i.longitude !== null).length;
    const recent = [...items].sort((a, b) => b.action_date.localeCompare(a.action_date)).slice(0, 6);
    return { pending, approved, withCoords, total: items.length, recent };
  }, [data?.items]);

  return {
    spotType, setSpotType,
    spotLabel, setSpotLabel,
    spotLatitude, setSpotLatitude,
    spotLongitude, setSpotLongitude,
    spotNotes, setSpotNotes,
    spotState, spotMessage,
    onCreateSpot,
    isLoading, error,
    quality,
  };
}
