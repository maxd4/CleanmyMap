import { useEffect, useRef } from 'react'

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
  const startTime = useRef<number>(Date.now())
  const fieldFocusTime = useRef<{ [key: string]: number }>({})

  const trackEvent = (event: Omit<FormEvent, 'formId' | 'version' | 'timestamp'>) => {
    const eventData: FormEvent = {
      ...event,
      formId,
      version,
      timestamp: Date.now()
    }

    // Log to console for now, replace with actual analytics service
    console.log('Form Analytics:', eventData)
    
    // TODO: Send to analytics service
    // analytics.track(eventData)
  }

  const trackFormStart = () => {
    startTime.current = Date.now()
    trackEvent({ event: 'form_start' })
  }

  const trackFormComplete = () => {
    const timeSpent = Date.now() - startTime.current
    trackEvent({ 
      event: 'form_complete',
      timeSpent
    })
  }

  const trackFormAbandon = () => {
    const timeSpent = Date.now() - startTime.current
    trackEvent({ 
      event: 'form_abandon',
      timeSpent
    })
  }

  const trackFieldError = (fieldName: string, errorMessage: string) => {
    trackEvent({
      event: 'field_error',
      fieldName,
      errorMessage
    })
  }

  const trackFieldFocus = (fieldName: string) => {
    fieldFocusTime.current[fieldName] = Date.now()
    trackEvent({
      event: 'field_focus',
      fieldName
    })
  }

  // Track form abandon on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      trackFormAbandon()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  return {
    trackFormStart,
    trackFormComplete,
    trackFormAbandon,
    trackFieldError,
    trackFieldFocus
  }
}