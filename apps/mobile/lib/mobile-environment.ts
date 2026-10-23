type PublicEnvironment = Readonly<Record<string, string | undefined>>

type MobileRuntime = typeof globalThis & {
  process?: {
    env?: PublicEnvironment
  }
}

const runtime = globalThis as unknown as MobileRuntime

export function getMobilePublicEnv(name: string): string | undefined {
  const environment = runtime.process?.env
  const value: unknown = environment?.[name]
  return typeof value === 'string' ? value : undefined
}

export function getMobileApiBaseUrl(): string | undefined {
  return getMobilePublicEnv('EXPO_PUBLIC_WEB_APP_URL')?.trim().replace(/\/$/, '')
}

export function getMobileWebBaseUrl(): string {
  return (getMobilePublicEnv('EXPO_PUBLIC_WEB_URL') ?? 'https://cleanmymap.fr').replace(/\/$/, '')
}
