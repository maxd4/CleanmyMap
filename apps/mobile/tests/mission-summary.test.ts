import { describe, expect, it } from 'vitest'
import { formatServerDistance, formatServerDuration } from '../lib/mission-summary'

describe('server mission summary formatting', () => {
  it('does not invent values when the server metric is absent or invalid', () => {
    expect(formatServerDuration(null)).toBe('Non disponible')
    expect(formatServerDuration(Number.NaN)).toBe('Non disponible')
    expect(formatServerDistance(undefined)).toBe('Non disponible')
    expect(formatServerDistance(Number.POSITIVE_INFINITY)).toBe('Non disponible')
  })

  it('formats server duration and distance without recomputing their source values', () => {
    expect(formatServerDuration(-1)).toBe('0s')
    expect(formatServerDuration(3661.4)).toBe('1h 1m')
    expect(formatServerDuration(65)).toBe('1m 5s')
    expect(formatServerDistance(-1)).toBe('0 m')
    expect(formatServerDistance(999)).toBe('999 m')
    expect(formatServerDistance(1500)).toBe('1.5 km')
  })
})
