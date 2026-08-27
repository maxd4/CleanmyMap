export const MY_OBSERVATION_TYPES = ["spot", "clean_place"] as const;
export const MY_OBSERVATION_STATUSES = ["new", "validated", "cleaned"] as const;

export type MyObservationType = (typeof MY_OBSERVATION_TYPES)[number];
export type MyObservationStatus = (typeof MY_OBSERVATION_STATUSES)[number];

export type MyObservation = {
  id: string;
  createdAt: string;
  type: MyObservationType;
  label: string;
  status: MyObservationStatus;
  latitude: number | null;
  longitude: number | null;
  validatedAt: string | null;
  cleanedAt: string | null;
};

export function isMyObservation(value: unknown): value is MyObservation {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.type === "string" &&
    MY_OBSERVATION_TYPES.includes(candidate.type as MyObservationType) &&
    typeof candidate.label === "string" &&
    typeof candidate.status === "string" &&
    MY_OBSERVATION_STATUSES.includes(candidate.status as MyObservationStatus) &&
    (candidate.latitude === null || typeof candidate.latitude === "number") &&
    (candidate.longitude === null || typeof candidate.longitude === "number") &&
    (candidate.validatedAt === null || typeof candidate.validatedAt === "string") &&
    (candidate.cleanedAt === null || typeof candidate.cleanedAt === "string")
  );
}
