import { beforeEach, describe, expect, it, vi } from 'vitest'

const { alert } = vi.hoisted(() => ({ alert: vi.fn() }))
vi.mock('react-native', () => ({ Alert: { alert } }))

import {
  GPS_PERMISSION_RATIONALE_MESSAGE,
  GPS_PERMISSION_RATIONALE_TITLE,
  showGpsPermissionRationale,
} from '../lib/gps-permission-rationale'

describe('native GPS permission rationale', () => {
  beforeEach(() => vi.clearAllMocks())

  it('explains collection, background use, transmission and local offline replay before system permissions', async () => {
    alert.mockImplementation((_title: string, message: string) => {
      expect(message).toContain('arrière-plan')
      expect(message).toContain('transmis au backend CleanMyMap')
      expect(message).toContain('stockage local')
      const buttons = alert.mock.calls[0]?.[2] as Array<{ text: string; onPress?: () => void }>
      buttons[1]?.onPress?.()
    })
    await expect(showGpsPermissionRationale()).resolves.toBe(true)
    expect(alert).toHaveBeenCalledWith(GPS_PERMISSION_RATIONALE_TITLE, GPS_PERMISSION_RATIONALE_MESSAGE, expect.any(Array), expect.any(Object))
  })

  it('preserves refusal without opening a system permission prompt', async () => {
    alert.mockImplementation((_title: string, _message: string, buttons: Array<{ text: string; onPress?: () => void }>) => buttons[0]?.onPress?.())
    await expect(showGpsPermissionRationale()).resolves.toBe(false)
  })
})
