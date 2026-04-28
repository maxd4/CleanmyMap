export function formatMapFreshnessLabel(
  updatedAt: number | null | undefined,
): string | null {
  if (!updatedAt || !Number.isFinite(updatedAt)) {
    return null;
  }

  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const timeLabel = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return `Dernière actualisation ${timeLabel}`;
}
