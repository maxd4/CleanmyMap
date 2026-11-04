import { useCallback, useEffect, useRef, useState } from 'react'
import { getClerkUserId, subscribeToClerkIdentityChanges } from '../../shared/lib/supabase'
import {
  loadMobileTerritorialLegendConsent,
  loadMobileTerritorialLegendOverview,
  updateMobileTerritorialLegendConsent,
  type MobileTerritorialLegendConsent,
  type MobileTerritorialLegendOverview,
} from './mobile-territorial-legends-service'

type TerritorialLegendsControllerProps = {
  ownerId: string | null
  shouldLoadOverview: boolean
  onSessionExpired: () => void
}

function isUnauthorized(value: unknown): boolean {
  return (value as { status?: number }).status === 401
}

function errorMessage(value: unknown): string {
  return value instanceof Error ? value.message : 'Les Légendes territoriales sont indisponibles.'
}

export function useTerritorialLegendsController({ ownerId, shouldLoadOverview, onSessionExpired }: TerritorialLegendsControllerProps) {
  const [overview, setOverview] = useState<MobileTerritorialLegendOverview | null>(null)
  const [consent, setConsent] = useState<MobileTerritorialLegendConsent | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [consentLoading, setConsentLoading] = useState(false)
  const [savingConsent, setSavingConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const requestGeneration = useRef(0)

  const isCurrentRequest = useCallback(async (expectedOwnerId: string, generation: number) => {
    if (requestGeneration.current !== generation) return false
    const currentOwnerId = await getClerkUserId()
    return requestGeneration.current === generation && currentOwnerId === expectedOwnerId
  }, [])

  const refresh = useCallback(async () => {
    if (!ownerId) return
    const generation = ++requestGeneration.current
    setError(null)
    setMessage(null)
    setConsentLoading(true)
    if (shouldLoadOverview) setOverviewLoading(true)
    try {
      const [nextConsent, nextOverview] = await Promise.all([
        loadMobileTerritorialLegendConsent(),
        shouldLoadOverview ? loadMobileTerritorialLegendOverview() : Promise.resolve(null),
      ])
      if (!(await isCurrentRequest(ownerId, generation))) return
      setConsent(nextConsent)
      if (nextOverview) setOverview(nextOverview)
    } catch (value) {
      if (!(await isCurrentRequest(ownerId, generation))) return
      if (isUnauthorized(value)) onSessionExpired()
      else setError(errorMessage(value))
    } finally {
      if (requestGeneration.current === generation) {
        setConsentLoading(false)
        setOverviewLoading(false)
      }
    }
  }, [isCurrentRequest, onSessionExpired, ownerId, shouldLoadOverview])

  useEffect(() => {
    const generation = ++requestGeneration.current
    setOverview(null)
    setConsent(null)
    setError(null)
    setMessage(null)
    setOverviewLoading(false)
    setConsentLoading(false)
    setSavingConsent(false)
    if (!ownerId) return
    const unsubscribe = subscribeToClerkIdentityChanges((nextOwnerId) => {
      if (nextOwnerId === ownerId) return
      requestGeneration.current += 1
      setOverview(null)
      setConsent(null)
      setMessage(null)
      setOverviewLoading(false)
      setConsentLoading(false)
      setSavingConsent(false)
      setError('Le compte Clerk a changé. Rechargez les données du compte courant.')
    })
    void (async () => {
      setError(null)
      setConsentLoading(true)
      if (shouldLoadOverview) setOverviewLoading(true)
      try {
        const [nextConsent, nextOverview] = await Promise.all([
          loadMobileTerritorialLegendConsent(),
          shouldLoadOverview ? loadMobileTerritorialLegendOverview() : Promise.resolve(null),
        ])
        if (!(await isCurrentRequest(ownerId, generation))) return
        setConsent(nextConsent)
        if (nextOverview) setOverview(nextOverview)
      } catch (value) {
        if (!(await isCurrentRequest(ownerId, generation))) return
        if (isUnauthorized(value)) onSessionExpired()
        else setError(errorMessage(value))
      } finally {
        if (requestGeneration.current === generation) {
          setConsentLoading(false)
          setOverviewLoading(false)
        }
      }
    })()
    return () => {
      requestGeneration.current += 1
      unsubscribe()
    }
  }, [isCurrentRequest, onSessionExpired, ownerId, shouldLoadOverview])

  const setTerritorialLegendConsent = useCallback(async (enabled: boolean) => {
    if (!ownerId || savingConsent) return
    const generation = requestGeneration.current
    setSavingConsent(true)
    setError(null)
    setMessage(null)
    try {
      const nextConsent = await updateMobileTerritorialLegendConsent(enabled)
      if (!(await isCurrentRequest(ownerId, generation))) return
      setConsent(nextConsent)
      setMessage(enabled ? 'Consentement territorial activé.' : 'Consentement territorial révoqué.')
      if (shouldLoadOverview) {
        const nextOverview = await loadMobileTerritorialLegendOverview()
        if (await isCurrentRequest(ownerId, generation)) setOverview(nextOverview)
      }
    } catch (value) {
      if (!(await isCurrentRequest(ownerId, generation))) return
      if (isUnauthorized(value)) onSessionExpired()
      else setError(errorMessage(value))
    } finally {
      if (requestGeneration.current === generation) setSavingConsent(false)
    }
  }, [isCurrentRequest, onSessionExpired, ownerId, savingConsent, shouldLoadOverview])

  return {
    overview,
    consent,
    overviewLoading,
    consentLoading,
    savingConsent,
    error,
    message,
    refresh,
    setTerritorialLegendConsent,
  }
}

export type TerritorialLegendsController = ReturnType<typeof useTerritorialLegendsController>
