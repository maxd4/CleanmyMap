import { useCallback, useEffect, useRef } from 'react'

export const PENDING_GPS_POINT_POLL_INTERVAL_MS = 5_000

type PendingGpsPointPollerOptions = {
  readCount: () => Promise<number>
  onCount: (count: number) => void
  intervalMs?: number
}

export type PendingGpsPointPoller = {
  start: () => void
  stop: () => void
  refresh: () => Promise<void>
  dispose: () => void
  isRunning: () => boolean
}

export function createPendingGpsPointPoller({
  readCount,
  onCount,
  intervalMs = PENDING_GPS_POINT_POLL_INTERVAL_MS,
}: PendingGpsPointPollerOptions): PendingGpsPointPoller {
  let interval: ReturnType<typeof setInterval> | null = null
  let generation = 0
  let running = false
  let disposed = false

  function clearIntervalIfNeeded() {
    if (interval) clearInterval(interval)
    interval = null
  }

  async function refresh(): Promise<void> {
    if (disposed) return

    const requestGeneration = ++generation
    try {
      const count = await readCount()
      if (disposed || requestGeneration !== generation) return
      onCount(count)
    } catch {
      // The storage reader already fails closed. A rejected custom reader must
      // not create an unhandled rejection or disturb the active GPS session.
    }
  }

  function start() {
    if (disposed || running) return

    running = true
    void refresh()
    interval = setInterval(() => void refresh(), intervalMs)
  }

  function stop() {
    running = false
    generation += 1
    clearIntervalIfNeeded()
  }

  function dispose() {
    stop()
    disposed = true
    generation += 1
  }

  return {
    start,
    stop,
    refresh,
    dispose,
    isRunning: () => running,
  }
}

export function usePendingGpsPointCountPolling({
  isVisible,
  readCount,
  onCount,
}: {
  isVisible: boolean
  readCount: () => Promise<number>
  onCount: (count: number) => void
}): () => Promise<void> {
  const pollerRef = useRef<PendingGpsPointPoller | null>(null)

  if (pollerRef.current == null) {
    pollerRef.current = createPendingGpsPointPoller({
      readCount,
      onCount,
    })
  }

  const refresh = useCallback(async () => {
    await pollerRef.current?.refresh()
  }, [])

  useEffect(() => {
    const poller = pollerRef.current
    if (isVisible) poller?.start()
    else poller?.stop()
  }, [isVisible])

  useEffect(() => () => pollerRef.current?.dispose(), [])

  return refresh
}
