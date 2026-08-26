export type MissionStatus =
  | "pending"
  | "tracking"
  | "completed"
  | "cancelled";

export function getMissionStatusLabel(status: MissionStatus | string | null): string {
  switch (status) {
    case "pending":
      return "Mission planifiée";
    case "tracking":
      return "Action en cours";
    case "completed":
      return "Mission terminée";
    case "cancelled":
      return "Mission annulée";
    default:
      return "Statut non reconnu";
  }
}

export function formatMissionDistance(distanceM: number | null): string {
  return distanceM === null ? "Non disponible" : `${(distanceM / 1000).toFixed(1)} km`;
}

export function formatMissionDuration(durationS: number | null): string {
  return durationS === null ? "Non disponible" : `${Math.round(durationS / 60)} min`;
}

export function formatMissionTimestamp(timestamp: string | null): string {
  if (!timestamp) {
    return "Non enregistrée";
  }

  return new Date(timestamp).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
