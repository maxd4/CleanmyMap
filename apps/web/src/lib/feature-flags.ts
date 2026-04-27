interface FeatureFlags {
  useSimpleForm: boolean
  enableFormAnalytics: boolean
  showFormComparison: boolean
}

const defaultFlags: FeatureFlags = {
  useSimpleForm: true,
  enableFormAnalytics: true,
  showFormComparison: true
}

class FeatureFlagService {
  private flags: FeatureFlags = defaultFlags

  constructor() {
    this.loadFlags()
  }

  private loadFlags() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('featureFlags')
      if (stored) {
        try {
          this.flags = { ...defaultFlags, ...JSON.parse(stored) }
        } catch (e) {
          console.warn('Failed to parse feature flags from localStorage')
        }
      }
    }
  }

  isEnabled(flag: keyof FeatureFlags): boolean {
    return this.flags[flag]
  }

  enable(flag: keyof FeatureFlags) {
    this.flags[flag] = true
    this.saveFlags()
  }

  disable(flag: keyof FeatureFlags) {
    this.flags[flag] = false
    this.saveFlags()
  }

  toggle(flag: keyof FeatureFlags) {
    this.flags[flag] = !this.flags[flag]
    this.saveFlags()
  }

  private saveFlags() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('featureFlags', JSON.stringify(this.flags))
    }
  }

  getAllFlags(): FeatureFlags {
    return { ...this.flags }
  }
}

export const featureFlags = new FeatureFlagService()

export function useFeatureFlag(flag: keyof FeatureFlags): boolean {
  return featureFlags.isEnabled(flag)
}

export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  return featureFlags.isEnabled(flag)
}