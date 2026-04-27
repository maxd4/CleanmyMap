interface FormMetrics {
  variant: 'simple' | 'complex'
  userId: string
  sessionId: string
  startTime: number
  endTime?: number
  completed: boolean
  abandoned: boolean
  errors: string[]
  fieldsCompleted: number
  totalFields: number
}

interface AggregatedMetrics {
  variant: 'simple' | 'complex'
  totalSessions: number
  completedSessions: number
  abandonedSessions: number
  completionRate: number
  averageTime: number
  errorRate: number
  averageFieldsCompleted: number
}

class MetricsService {
  private metrics: FormMetrics[] = []
  private readonly STORAGE_KEY = 'formMetrics'

  constructor() {
    this.loadFromStorage()
  }

  startSession(variant: 'simple' | 'complex', userId: string = 'anonymous'): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const metric: FormMetrics = {
      variant,
      userId,
      sessionId,
      startTime: Date.now(),
      completed: false,
      abandoned: false,
      errors: [],
      fieldsCompleted: 0,
      totalFields: variant === 'simple' ? 10 : 35
    }

    this.metrics.push(metric)
    this.saveToStorage()
    return sessionId
  }

  completeSession(sessionId: string) {
    const metric = this.metrics.find(m => m.sessionId === sessionId)
    if (metric) {
      metric.endTime = Date.now()
      metric.completed = true
      metric.fieldsCompleted = metric.totalFields
      this.saveToStorage()
    }
  }

  abandonSession(sessionId: string, fieldsCompleted: number = 0) {
    const metric = this.metrics.find(m => m.sessionId === sessionId)
    if (metric) {
      metric.endTime = Date.now()
      metric.abandoned = true
      metric.fieldsCompleted = fieldsCompleted
      this.saveToStorage()
    }
  }

  recordError(sessionId: string, error: string) {
    const metric = this.metrics.find(m => m.sessionId === sessionId)
    if (metric) {
      metric.errors.push(error)
      this.saveToStorage()
    }
  }

  updateFieldsCompleted(sessionId: string, count: number) {
    const metric = this.metrics.find(m => m.sessionId === sessionId)
    if (metric) {
      metric.fieldsCompleted = Math.max(metric.fieldsCompleted, count)
      this.saveToStorage()
    }
  }

  getAggregatedMetrics(): { simple: AggregatedMetrics; complex: AggregatedMetrics } {
    const simpleMetrics = this.metrics.filter(m => m.variant === 'simple')
    const complexMetrics = this.metrics.filter(m => m.variant === 'complex')

    return {
      simple: this.calculateAggregated(simpleMetrics, 'simple'),
      complex: this.calculateAggregated(complexMetrics, 'complex')
    }
  }

  private calculateAggregated(metrics: FormMetrics[], variant: 'simple' | 'complex'): AggregatedMetrics {
    const totalSessions = metrics.length
    const completedSessions = metrics.filter(m => m.completed).length
    const abandonedSessions = metrics.filter(m => m.abandoned).length
    
    const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0
    
    const completedMetrics = metrics.filter(m => m.completed && m.endTime)
    const averageTime = completedMetrics.length > 0 
      ? completedMetrics.reduce((sum, m) => sum + (m.endTime! - m.startTime), 0) / completedMetrics.length
      : 0

    const totalErrors = metrics.reduce((sum, m) => sum + m.errors.length, 0)
    const errorRate = totalSessions > 0 ? (totalErrors / totalSessions) * 100 : 0

    const averageFieldsCompleted = totalSessions > 0
      ? metrics.reduce((sum, m) => sum + m.fieldsCompleted, 0) / totalSessions
      : 0

    return {
      variant,
      totalSessions,
      completedSessions,
      abandonedSessions,
      completionRate,
      averageTime,
      errorRate,
      averageFieldsCompleted
    }
  }

  getRecentMetrics(hours: number = 24): FormMetrics[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000)
    return this.metrics.filter(m => m.startTime > cutoff)
  }

  clearMetrics() {
    this.metrics = []
    this.saveToStorage()
  }

  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2)
  }

  private loadFromStorage() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        try {
          this.metrics = JSON.parse(stored)
        } catch (e) {
          console.warn('Failed to load metrics from storage')
          this.metrics = []
        }
      }
    }
  }

  private saveToStorage() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.metrics))
    }
  }
}

export const metricsService = new MetricsService()

// React hook for metrics tracking
export function useMetricsTracking(variant: 'simple' | 'complex') {
  const sessionId = metricsService.startSession(variant)
  
  return {
    sessionId,
    complete: () => metricsService.completeSession(sessionId),
    abandon: (fieldsCompleted?: number) => metricsService.abandonSession(sessionId, fieldsCompleted),
    recordError: (error: string) => metricsService.recordError(sessionId, error),
    updateFields: (count: number) => metricsService.updateFieldsCompleted(sessionId, count)
  }
}