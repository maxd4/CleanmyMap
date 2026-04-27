interface ABTestConfig {
  testName: string
  variants: {
    control: string
    treatment: string
  }
  trafficSplit: number // 0-100, percentage for treatment
  startDate: Date
  endDate?: Date
}

interface ABTestResult {
  variant: 'control' | 'treatment'
  userId: string
  testName: string
}

class ABTestingService {
  private tests: Map<string, ABTestConfig> = new Map()
  private userAssignments: Map<string, Map<string, string>> = new Map()

  constructor() {
    this.loadFromStorage()
    this.initializeFormTest()
  }

  private initializeFormTest() {
    this.createTest({
      testName: 'form-simplification',
      variants: {
        control: 'complex-form',
        treatment: 'simple-form'
      },
      trafficSplit: 10, // Start with 10%
      startDate: new Date()
    })
  }

  createTest(config: ABTestConfig) {
    this.tests.set(config.testName, config)
    this.saveToStorage()
  }

  getVariant(testName: string, userId: string): ABTestResult {
    const test = this.tests.get(testName)
    if (!test) {
      return { variant: 'control', userId, testName }
    }

    // Check if test is active
    const now = new Date()
    if (now < test.startDate || (test.endDate && now > test.endDate)) {
      return { variant: 'control', userId, testName }
    }

    // Check existing assignment
    const userTests = this.userAssignments.get(userId)
    if (userTests?.has(testName)) {
      const variant = userTests.get(testName) as 'control' | 'treatment'
      return { variant, userId, testName }
    }

    // Assign new variant
    const hash = this.hashUserId(userId, testName)
    const variant = hash < test.trafficSplit ? 'treatment' : 'control'
    
    this.assignUser(userId, testName, variant)
    return { variant, userId, testName }
  }

  private assignUser(userId: string, testName: string, variant: string) {
    if (!this.userAssignments.has(userId)) {
      this.userAssignments.set(userId, new Map())
    }
    this.userAssignments.get(userId)!.set(testName, variant)
    this.saveToStorage()
  }

  private hashUserId(userId: string, testName: string): number {
    // Simple hash function for consistent assignment
    let hash = 0
    const str = userId + testName
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash) % 100
  }

  updateTrafficSplit(testName: string, newSplit: number) {
    const test = this.tests.get(testName)
    if (test) {
      test.trafficSplit = Math.max(0, Math.min(100, newSplit))
      this.tests.set(testName, test)
      this.saveToStorage()
    }
  }

  getTestConfig(testName: string): ABTestConfig | undefined {
    return this.tests.get(testName)
  }

  getAllTests(): ABTestConfig[] {
    return Array.from(this.tests.values())
  }

  private loadFromStorage() {
    if (typeof window !== 'undefined') {
      const testsData = localStorage.getItem('abTests')
      const assignmentsData = localStorage.getItem('abAssignments')
      
      if (testsData) {
        try {
          const parsed = JSON.parse(testsData)
          this.tests = new Map(Object.entries(parsed))
        } catch (e) {
          console.warn('Failed to load A/B tests from storage')
        }
      }

      if (assignmentsData) {
        try {
          const parsed = JSON.parse(assignmentsData)
          this.userAssignments = new Map(
            Object.entries(parsed).map(([userId, tests]) => [
              userId,
              new Map(Object.entries(tests as any))
            ])
          )
        } catch (e) {
          console.warn('Failed to load A/B assignments from storage')
        }
      }
    }
  }

  private saveToStorage() {
    if (typeof window !== 'undefined') {
      const testsObj = Object.fromEntries(this.tests)
      const assignmentsObj = Object.fromEntries(
        Array.from(this.userAssignments.entries()).map(([userId, tests]) => [
          userId,
          Object.fromEntries(tests)
        ])
      )
      
      localStorage.setItem('abTests', JSON.stringify(testsObj))
      localStorage.setItem('abAssignments', JSON.stringify(assignmentsObj))
    }
  }
}

export const abTestingService = new ABTestingService()

// Hook for React components
export function useABTest(testName: string, userId: string = 'anonymous') {
  const result = abTestingService.getVariant(testName, userId)
  return result.variant
}