interface FeatureFlags {
  useSimpleForm: boolean
  enableFormAnalytics: boolean
  showFormComparison: boolean
  pageTemplateV2: boolean
  parcoursNavV2: boolean
}

const defaultFlags: FeatureFlags = {
  useSimpleForm: true,
  enableFormAnalytics: true,
  showFormComparison: true,
  pageTemplateV2: true,
  parcoursNavV2: true
}

class FeatureFlagService {
  private flags: FeatureFlags = defaultFlags

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
