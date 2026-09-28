import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  getToken: vi.fn(async () => 'clerk-jwt'),
  createClient: vi.fn(() => ({})),
}))

vi.mock('@clerk/expo', () => ({
  getClerkInstance: vi.fn(() => ({ session: { getToken: state.getToken } })),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: state.createClient,
}))

vi.mock('react-native-url-polyfill/auto', () => ({}))

const rlsMigration = fileURLToPath(
  new URL('../../web/supabase/migrations/20260826070000_clerk_missions_gps_rls.sql', import.meta.url),
)
const metricsMigration = fileURLToPath(
  new URL('../../web/supabase/migrations/20260827100000_clerk_mission_completion_metrics_trigger.sql', import.meta.url),
)

describe('mobile identity and server contracts', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'public-anon-key'
    state.getToken.mockResolvedValue('clerk-jwt')
    state.createClient.mockClear()
  })

  it('passes the current Clerk token to Supabase Third-Party Auth without a Supabase session', async () => {
    const module = await import('../lib/supabase')
    const [, , options] = state.createClient.mock.calls[0] as unknown as [
      string,
      string,
      { accessToken: () => Promise<string>; auth: Record<string, unknown> },
    ]

    await expect(module.getClerkSupabaseAccessToken()).resolves.toBe('clerk-jwt')
    await expect(options.accessToken()).resolves.toBe('clerk-jwt')
    expect(options.auth).toEqual({
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    })
    expect(await module.getAuthenticatedSupabaseClient()).not.toBeNull()
  })

  it('keeps mission and GPS ownership bound to the Clerk sub claim', () => {
    const sql = readFileSync(rlsMigration, 'utf8')

    expect(sql).toMatch(/create policy "volunteer_read_missions"[\s\S]+?volunteer_id\s*=\s*coalesce\(\(select auth\.jwt\(\)\)\s*->>\s*'sub'/i)
    expect(sql).toMatch(/create policy "volunteer_update_missions"[\s\S]+?with check[\s\S]+?volunteer_id\s*=\s*coalesce\(\(select auth\.jwt\(\)\)\s*->>\s*'sub'/i)
    expect(sql).toMatch(/create policy "volunteer_insert_gps"[\s\S]+?m\.id\s*=\s*gps_points\.mission_id[\s\S]+?m\.volunteer_id\s*=\s*coalesce\(\(select auth\.jwt\(\)\)\s*->>\s*'sub'/i)
  })

  it('keeps derived mission metrics server-owned', () => {
    const rlsSql = readFileSync(rlsMigration, 'utf8')
    const metricsSql = readFileSync(metricsMigration, 'utf8')

    expect(rlsSql).toMatch(/grant update\s*\(status,\s*started_at,\s*ended_at\)\s*on table public\.missions\s*to authenticated/i)
    expect(rlsSql).not.toMatch(/grant update\s*\([^)]*(distance_m|duration_s)/i)
    expect(metricsSql).toMatch(/security invoker/i)
    expect(metricsSql).toMatch(/new\.distance_m\s*:=/i)
    expect(metricsSql).toMatch(/new\.duration_s\s*:=/i)
  })
})
