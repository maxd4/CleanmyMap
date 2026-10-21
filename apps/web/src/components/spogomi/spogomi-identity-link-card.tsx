"use client";

import { useAuth } from "@clerk/nextjs";
import { SpogomiIdentityLinkCardView } from "./spogomi-identity-link-card-view";
import { useSpogomiIdentityLinkActions } from "./spogomi-identity-link-card-actions";

type Props = { eventId: string; signInHref: string };

export function SpogomiIdentityLinkCard({ eventId, signInHref }: Props) {
  const { isLoaded, isSignedIn } = useAuth();
  const state = useSpogomiIdentityLinkActions({ eventId, isLoaded, isSignedIn });
  return <SpogomiIdentityLinkCardView signInHref={signInHref} isLoaded={isLoaded} isSignedIn={isSignedIn} isLoadingState={state.isLoadingState} identityState={state.identityState} recognition={state.recognition} team={state.team} assistanceRequest={state.assistanceRequest} message={state.message} error={state.error} isSubmitting={state.isSubmitting} code={state.code} assistanceMode={state.assistanceMode} assistanceContext={state.assistanceContext} onLoadState={() => void state.loadState()} onSubmit={() => void state.submit()} onRequestParticipation={() => void state.requestParticipation()} onSubmitAssistance={() => void state.submitAssistance()} onCancelAssistance={() => void state.cancelAssistance()} onCodeChange={(value) => state.updateEventState(eventId, { code: value })} onAssistanceModeChange={(value) => state.updateEventState(eventId, { assistanceMode: value })} onAssistanceContextChange={(value) => state.updateEventState(eventId, { assistanceContext: value })} />;
}
