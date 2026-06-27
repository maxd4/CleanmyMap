import { useEffect, useCallback, useRef } from 'react'

interface FormAnalytics {
  formId: string
  version: 'simple' | 'complex'
}

interface FormEvent {
  event: 'form_start' | 'form_complete' | 'form_abandon' | 'field_error' | 'field_focus'
  formId: string
  version: string
  timestamp: number
  fieldName?: string
  errorMessage?: string
  timeSpent?: number
}

export function useFormAnalytics({ formId, version }: FormAnalytics) {
  const startTime = useRef<number | null>(null)
  const fieldFocusTime = useRef<{ [key: string]: number }>({})

  const trackEvent = useCallback(
    (event: Omit<FormEvent, 'formId' | 'version' | 'timestamp'>) => {
      const eventData: FormEvent = {
        ...event,
        formId,
        version,
        timestamp: Date.now()
      }

      // Log to console for debugging and monitoring
      console.log('Form Analytics:', eventData)
    },
    [formId, version],
  )

  const getElapsedTime = () => {
    const startedAt = startTime.current ?? Date.now()
    if (startTime.current === null) {
      startTime.current = startedAt
    }

    return Date.now() - startedAt
  }

  const trackFormStart = useCallback(() => {
    startTime.current = Date.now()
    trackEvent({ event: 'form_start' })
  }, [trackEvent])

  const trackFormComplete = useCallback(() => {
    const timeSpent = getElapsedTime()
    trackEvent({
      event: 'form_complete',
      timeSpent
    })
  }, [trackEvent])

  const trackFormAbandon = useCallback(() => {
    const timeSpent = getElapsedTime()
    trackEvent({
      event: 'form_abandon',
      timeSpent
    })
  }, [trackEvent])

  const trackFieldError = useCallback(
    (fieldName: string, errorMessage: string) => {
      trackEvent({
        event: 'field_error',
        fieldName,
        errorMessage
      })
    },
    [trackEvent],
  )

  const trackFieldFocus = useCallback(
    (fieldName: string) => {
      fieldFocusTime.current[fieldName] = Date.now()
      trackEvent({
        event: 'field_focus',
        fieldName
      })
    },
    [trackEvent],
  )

  // Track form abandon on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      trackFormAbandon()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [trackFormAbandon])

  return {
    trackFormStart,
    trackFormComplete,
    trackFormAbandon,
    trackFieldError,
    trackFieldFocus
  }
}
