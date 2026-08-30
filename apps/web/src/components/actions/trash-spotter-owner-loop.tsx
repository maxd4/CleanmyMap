"use client";

import { TrashSpotterObservationForm } from "@/components/actions/quick-signalement-form";
import { MyObservationsSection } from "@/components/actions/my-observations-section";
import { useMyObservations } from "@/lib/actions/signalement/my-observations-client";

export function TrashSpotterOwnerLoop({
  initialLocation,
  isAuthenticated,
  signInHref,
  signUpHref,
}: {
  initialLocation?: { lat: number; lng: number } | null;
  isAuthenticated?: boolean;
  signInHref?: string;
  signUpHref?: string;
}) {
  const { snapshot, refresh } = useMyObservations();

  return (
    <>
      <TrashSpotterObservationForm
        initialLocation={initialLocation}
        isAuthenticated={isAuthenticated}
        signInHref={signInHref}
        signUpHref={signUpHref}
        onSignalementCreated={() => {
          void refresh();
        }}
      />
      <MyObservationsSection snapshot={snapshot} onRetry={() => void refresh()} />
    </>
  );
}
