"use client";

import { TrashSpotterObservationForm } from "@/components/actions/quick-signalement-form";
import { MyObservationsSection } from "@/components/actions/my-observations-section";
import { useMyObservations } from "@/lib/actions/my-observations-client";

export function TrashSpotterOwnerLoop({
  initialLocation,
}: {
  initialLocation?: { lat: number; lng: number } | null;
}) {
  const { snapshot, refresh } = useMyObservations();

  return (
    <>
      <TrashSpotterObservationForm
        initialLocation={initialLocation}
        onSignalementCreated={() => {
          void refresh();
        }}
      />
      <MyObservationsSection snapshot={snapshot} onRetry={() => void refresh()} />
    </>
  );
}
