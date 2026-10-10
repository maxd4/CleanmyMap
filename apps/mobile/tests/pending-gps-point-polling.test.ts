import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createPendingGpsPointPoller,
  PENDING_GPS_POINT_POLL_INTERVAL_MS,
} from '../lib/pending-gps-point-polling'

describe('pending GPS point polling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function createDeferredReadPoller() {
    let resolveRead: ((count: number) => void) | undefined
    const readCount = vi.fn(
      () => new Promise<number>((resolve) => {
        resolveRead = resolve
      }),
    )
    const onCount = vi.fn()
    const poller = createPendingGpsPointPoller({ readCount, onCount })

    return {
      onCount,
      poller,
      readCount,
      resolveRead: (count: number) => resolveRead?.(count),
    }
  }

  it('does not read storage while the mission is inactive', async () => {
    const readCount = vi.fn(async () => 2)
    const onCount = vi.fn()
    createPendingGpsPointPoller({ readCount, onCount })

    await vi.advanceTimersByTimeAsync(PENDING_GPS_POINT_POLL_INTERVAL_MS * 2)

    expect(readCount).not.toHaveBeenCalled()
    expect(onCount).not.toHaveBeenCalled()
  })

  it('reads immediately and then polls only while the active mission count is visible', async () => {
    const readCount = vi.fn(async () => 3)
    const onCount = vi.fn()
    const poller = createPendingGpsPointPoller({ readCount, onCount })

    poller.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(readCount).toHaveBeenCalledOnce()
    expect(onCount).toHaveBeenLastCalledWith(3)

    await vi.advanceTimersByTimeAsync(PENDING_GPS_POINT_POLL_INTERVAL_MS)
    expect(readCount).toHaveBeenCalledTimes(2)

    poller.stop()
    await vi.advanceTimersByTimeAsync(PENDING_GPS_POINT_POLL_INTERVAL_MS * 2)
    expect(readCount).toHaveBeenCalledTimes(2)
  })

  it('refreshes explicitly when the app resumes without creating another interval', async () => {
    const readCount = vi.fn(async () => 4)
    const onCount = vi.fn()
    const poller = createPendingGpsPointPoller({ readCount, onCount })

    poller.start()
    await vi.advanceTimersByTimeAsync(0)
    poller.start()
    await poller.refresh()

    expect(readCount).toHaveBeenCalledTimes(2)
    expect(poller.isRunning()).toBe(true)
  })

  it('allows synchronization and finalization to refresh after polling stops', async () => {
    const readCount = vi.fn(async () => 5)
    const onCount = vi.fn()
    const poller = createPendingGpsPointPoller({ readCount, onCount })

    poller.start()
    await vi.advanceTimersByTimeAsync(0)
    poller.stop()
    await poller.refresh()

    expect(readCount).toHaveBeenCalledTimes(2)
    expect(onCount).toHaveBeenLastCalledWith(5)
    expect(poller.isRunning()).toBe(false)
  })

  it('stops on a session change and ignores a read that resolves after stop', async () => {
    const { onCount, poller, resolveRead } = createDeferredReadPoller()

    poller.start()
    poller.stop()
    resolveRead?.(6)
    await Promise.resolve()

    expect(onCount).not.toHaveBeenCalled()
    expect(poller.isRunning()).toBe(false)
  })

  it('does not update state after unmount', async () => {
    const { onCount, poller, readCount, resolveRead } = createDeferredReadPoller()

    poller.start()
    poller.dispose()
    resolveRead?.(7)
    await Promise.resolve()

    expect(onCount).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(PENDING_GPS_POINT_POLL_INTERVAL_MS)
    expect(readCount).toHaveBeenCalledOnce()
  })
})
