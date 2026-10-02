import { describe, expect, it } from 'vitest'
import { calculateTrackDistanceMeters, mergeTrackPoints } from '../lib/track-geometry'

const point = (latitude: number, longitude: number, recordedAt: string) => ({
  latitude,
  longitude,
  recordedAt,
})

describe('mobile mission display track geometry', () => {
  it('orders restored points and removes visible server/local duplicates', () => {
    const merged = mergeTrackPoints(
      [point(48.8567, 2.3523, '2026-10-02T10:00:10.000Z'), point(48.8568, 2.3524, '2026-10-02T10:00:20.000Z')],
      [point(48.8566, 2.3522, '2026-10-02T10:00:00.000Z'), point(48.8567, 2.3523, '2026-10-02T10:00:11.000Z')],
    )

    expect(merged).toEqual([
      point(48.8566, 2.3522, '2026-10-02T10:00:00.000Z'),
      point(48.8567, 2.3523, '2026-10-02T10:00:10.000Z'),
      point(48.8568, 2.3524, '2026-10-02T10:00:20.000Z'),
    ])
  })

  it('calculates an indicative display distance without persistence fields', () => {
    const points = [point(48.8566, 2.3522, '2026-10-02T10:00:00.000Z'), point(48.8575, 2.3522, '2026-10-02T10:01:00.000Z')]

    expect(calculateTrackDistanceMeters(points)).toBeGreaterThan(90)
    expect(calculateTrackDistanceMeters(points)).toBeLessThan(110)
    expect(points[0]).not.toHaveProperty('distance_m')
    expect(points[0]).not.toHaveProperty('duration_s')
  })
})
