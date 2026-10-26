import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import React, { useEffect } from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import {
  createPendingGpsPointPoller,
  PENDING_GPS_POINT_POLL_INTERVAL_MS,
  usePendingGpsPointCountPolling,
} from '../lib/pending-gps-point-polling'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

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

  it('ignores a transient storage read failure and keeps polling', async () => {
    const readCount = vi.fn()
      .mockRejectedValueOnce(new Error('storage unavailable'))
      .mockResolvedValue(8)
    const onCount = vi.fn()
    const poller = createPendingGpsPointPoller({ readCount, onCount })

    poller.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(onCount).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(PENDING_GPS_POINT_POLL_INTERVAL_MS)

    expect(readCount).toHaveBeenCalledTimes(2)
    expect(onCount).toHaveBeenLastCalledWith(8)
  })

  it('keeps only the newest overlapping refresh result', async () => {
    let releaseFirst!: (count: number) => void
    let releaseSecond!: (count: number) => void
    const readCount = vi.fn()
      .mockImplementationOnce(() => new Promise<number>((resolve) => { releaseFirst = resolve }))
      .mockImplementationOnce(() => new Promise<number>((resolve) => { releaseSecond = resolve }))
    const onCount = vi.fn()
    const poller = createPendingGpsPointPoller({ readCount, onCount })

    const first = poller.refresh()
    const second = poller.refresh()
    releaseSecond(9)
    await second
    releaseFirst(3)
    await first

    expect(onCount).toHaveBeenCalledOnce()
    expect(onCount).toHaveBeenCalledWith(9)
  })

  it('does not start a read after disposal, including an explicit refresh', async () => {
    const readCount = vi.fn(async () => 4)
    const onCount = vi.fn()
    const poller = createPendingGpsPointPoller({ readCount, onCount })

    poller.dispose()
    await poller.refresh()
    poller.start()
    await vi.advanceTimersByTimeAsync(PENDING_GPS_POINT_POLL_INTERVAL_MS)

    expect(readCount).not.toHaveBeenCalled()
    expect(onCount).not.toHaveBeenCalled()
    expect(poller.isRunning()).toBe(false)
  })

  it('starts and stops the hook poller with visibility and exposes an explicit refresh', async () => {
    const readCount = vi.fn(async () => 11)
    const onCount = vi.fn()
    let refresh!: () => Promise<void>
    function Harness({ visible }: { visible: boolean }) {
      refresh = usePendingGpsPointCountPolling({ isVisible: visible, readCount, onCount })
      return React.createElement('Harness', { visible })
    }

    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => {
      renderer = TestRenderer.create(React.createElement(Harness, { visible: true }))
      await vi.advanceTimersByTimeAsync(0)
    })
    const callsAfterStart = readCount.mock.calls.length
    expect(callsAfterStart).toBeGreaterThanOrEqual(1)
    expect(onCount).toHaveBeenLastCalledWith(11)

    await act(async () => { renderer.update(React.createElement(Harness, { visible: false })) })
    await vi.advanceTimersByTimeAsync(PENDING_GPS_POINT_POLL_INTERVAL_MS)
    expect(readCount).toHaveBeenCalledTimes(callsAfterStart)

    await act(async () => { await refresh() })
    expect(readCount).toHaveBeenCalledTimes(2)
    expect(onCount).toHaveBeenLastCalledWith(11)
    renderer.unmount()
  })

  it('disposes the hook poller on unmount and ignores a late storage result', async () => {
    let resolveRead!: (count: number) => void
    const readCount = vi.fn(() => new Promise<number>((resolve) => { resolveRead = resolve }))
    const onCount = vi.fn()
    function Harness() {
      usePendingGpsPointCountPolling({ isVisible: true, readCount, onCount })
      useEffect(() => undefined, [])
      return React.createElement('Harness')
    }

    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => { renderer = TestRenderer.create(React.createElement(Harness)) })
    expect(readCount).toHaveBeenCalledOnce()
    await act(async () => { renderer.unmount() })
    resolveRead(12)
    await act(async () => { await Promise.resolve() })
    expect(onCount).not.toHaveBeenCalled()
  })

  it('keeps the newest hook refresh result when visibility changes during an in-flight read', async () => {
    let releaseFirst!: (count: number) => void
    let releaseSecond!: (count: number) => void
    const readCount = vi.fn()
      .mockImplementationOnce(() => new Promise<number>((resolve) => { releaseFirst = resolve }))
      .mockImplementationOnce(() => new Promise<number>((resolve) => { releaseSecond = resolve }))
    const onCount = vi.fn()
    function Harness({ visible }: { visible: boolean }) {
      usePendingGpsPointCountPolling({ isVisible: visible, readCount, onCount })
      return React.createElement('Harness', { visible })
    }

    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => { renderer = TestRenderer.create(React.createElement(Harness, { visible: true })) })
    await act(async () => {
      renderer.update(React.createElement(Harness, { visible: false }))
      await Promise.resolve()
    })
    await act(async () => {
      renderer.update(React.createElement(Harness, { visible: true }))
      await Promise.resolve()
    })
    releaseSecond(14)
    await act(async () => { await Promise.resolve() })
    releaseFirst(13)
    await act(async () => { await Promise.resolve() })

    expect(onCount).toHaveBeenCalledWith(14)
    expect(onCount).not.toHaveBeenCalledWith(13)
    renderer.unmount()
  })
})
