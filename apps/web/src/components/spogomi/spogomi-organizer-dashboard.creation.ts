export type SpogomiCreationPayload = {
  name: string;
  locationLabel: string;
  mode: "casual" | "world_cup" | "mixed";
  startsAt: string;
  endsAt: string | null;
};

export type SpogomiCreationAttempt = {
  idempotencyKey: string;
  payload: SpogomiCreationPayload;
};

function payloadFingerprint(payload: SpogomiCreationPayload): string {
  return JSON.stringify(payload);
}

export function reuseOrCreateSpogomiCreationAttempt(
  current: SpogomiCreationAttempt | null,
  payload: SpogomiCreationPayload,
  createRandomId: () => string,
): SpogomiCreationAttempt {
  if (current && payloadFingerprint(current.payload) === payloadFingerprint(payload)) {
    return current;
  }

  return {
    idempotencyKey: `spogomi-${createRandomId()}`,
    payload,
  };
}
