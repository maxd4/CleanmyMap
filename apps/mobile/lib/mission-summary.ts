export function formatServerDuration(durationSeconds: number | null | undefined): string {
  if (durationSeconds == null || !Number.isFinite(durationSeconds)) return 'Non disponible'

  const totalSeconds = Math.max(0, Math.round(durationSeconds))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

export function formatServerDistance(distanceMeters: number | null | undefined): string {
  if (distanceMeters == null || !Number.isFinite(distanceMeters)) return 'Non disponible'

  const meters = Math.max(0, Math.round(distanceMeters))
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`
  return `${meters} m`
}
