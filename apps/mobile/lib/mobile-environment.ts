type MobilePublicEnvName =
  | 'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY'
  | 'EXPO_PUBLIC_SUPABASE_URL'
  | 'EXPO_PUBLIC_SUPABASE_ANON_KEY'
  | 'EXPO_PUBLIC_WEB_APP_URL'
  | 'EXPO_PUBLIC_WEB_URL'

export function getMobilePublicEnv(name: MobilePublicEnvName): string | undefined {
  switch (name) {
    case 'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY':
      return process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
    case 'EXPO_PUBLIC_SUPABASE_URL':
      return process.env.EXPO_PUBLIC_SUPABASE_URL
    case 'EXPO_PUBLIC_SUPABASE_ANON_KEY':
      return process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    case 'EXPO_PUBLIC_WEB_APP_URL':
      return process.env.EXPO_PUBLIC_WEB_APP_URL
    case 'EXPO_PUBLIC_WEB_URL':
      return process.env.EXPO_PUBLIC_WEB_URL
    default:
      return undefined
  }
}

export function getMobileApiBaseUrl(): string | undefined {
  return getMobilePublicEnv('EXPO_PUBLIC_WEB_APP_URL')?.trim().replace(/\/$/, '')
}

export function getMobileWebBaseUrl(): string {
  return (getMobilePublicEnv('EXPO_PUBLIC_WEB_URL') ?? 'https://cleanmymap.fr').replace(/\/$/, '')
}
