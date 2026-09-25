"use client";

import useSWR from "swr";
import { ActionParticipantImpactEditor } from "@/components/actions/action-participant-impact-editor";
import type { ActionParticipationReviewItem } from "@/lib/actions/participation/group-participation";

type QueueResponse = {
  status?: "ok";
  canReview?: boolean;
  confirmedParticipants?: ActionParticipationReviewItem[];
  error?: string;
};

async function fetchQueue(url: string): Promise<QueueResponse> {
  const response = await fetch(url);
  const payload = (await response.json()) as QueueResponse;
  if (!response.ok) return { error: payload.error };
  return payload;
}

export function ActionParticipantImpactManager({
  actionId,
  fr,
}: {
  actionId: string;
  fr: boolean;
}) {
  const { data, mutate } = useSWR(`/api/actions/${encodeURIComponent(actionId)}/group-join`, fetchQueue);

  if (!data?.canReview) return null;
  return (
    <ActionParticipantImpactEditor
      actionId={actionId}
      participants={data.confirmedParticipants ?? []}
      fr={fr}
      onSaved={() => void mutate()}
    />
  );
}
