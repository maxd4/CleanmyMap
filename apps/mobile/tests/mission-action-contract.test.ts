import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const migration = fileURLToPath(
  new URL('../../web/supabase/migrations/20261003000001_link_missions_to_actions.sql', import.meta.url),
)

describe('mission to action server contract', () => {
  it('keeps linking server-owned and promotes only a completed valid track', () => {
    const sql = readFileSync(migration, 'utf8')

    expect(sql).toMatch(/add column if not exists action_id uuid references public\.actions\(id\)/i)
    expect(sql).toMatch(/create index if not exists missions_action_id_idx/i)
    expect(sql).not.toMatch(/create unique index if not exists missions_action_id_unique/i)
    expect(sql).toMatch(/revoke insert \(action_id\) on public\.missions from authenticated/i)
    expect(sql).toMatch(/revoke update \(action_id\) on public\.missions from authenticated/i)
    expect(sql).toMatch(/new\.status is distinct from 'completed'/i)
    expect(sql).toMatch(/point_count < 2/i)
    expect(sql).toMatch(/geometry_source = 'gps_tracking'/i)
    expect(sql).toMatch(/routeObservedDistanceKm/i)
    expect(sql).toMatch(/canonical_distance_m::numeric/i)
    expect(sql).toMatch(/latitude between -90 and 90/i)
    expect(sql).toMatch(/lag\(gp\.latitude\)/i)
    expect(sql).toMatch(/order by m\.ended_at asc nulls last, m\.id/i)
    expect(sql).toMatch(/derived_geometry_kind = 'polyline'/i)
    expect(sql).toMatch(/gpxImport/i)
  })

  it('uses the same observed-geometry primitive for GPX replacement and mission promotion', () => {
    const replacementMigration = readFileSync(
      fileURLToPath(
        new URL('../../web/supabase/migrations/20261003000002_observed_action_geometry_replacement.sql', import.meta.url),
      ),
      'utf8',
    )

    expect(replacementMigration).toMatch(/create or replace function public\.apply_observed_action_geometry/i)
    expect(replacementMigration).toMatch(/new := public\.apply_observed_action_geometry/i)
    expect(replacementMigration).toMatch(/next_action := public\.apply_observed_action_geometry/i)
    expect(replacementMigration).toMatch(/old_source in \('gps_tracking', 'gpx_import'\)/i)
    expect(replacementMigration).toMatch(/new_source in \('gps_tracking', 'gpx_import'\)/i)
    expect(replacementMigration).toMatch(/current_action\.geometry_source::text in \('gps_tracking', 'gpx_import'\)/i)
    expect(replacementMigration).toMatch(/A second observation is not a silent replacement/i)
    expect(replacementMigration).toMatch(/routeObservedDistanceKm/i)
    expect(replacementMigration).toMatch(/routeNetworkDistanceKm/i)
  })

  it('records each eligible completed mission as an attributable contribution', () => {
    const contributionsMigration = readFileSync(
      fileURLToPath(
        new URL('../../web/supabase/migrations/20261003000004_action_geometry_contributions.sql', import.meta.url),
      ),
      'utf8',
    )

    expect(contributionsMigration).toMatch(/action_geometry_contributions/i)
    expect(contributionsMigration).toMatch(/new\.volunteer_id/i)
    expect(contributionsMigration).toMatch(/record_action_geometry_contribution\(/i)
    expect(contributionsMigration).toMatch(/validation_state.*accepted/i)
    expect(contributionsMigration).toMatch(/MultiLineString/i)
    expect(contributionsMigration).toMatch(/do update set updated_at/i)
    expect(contributionsMigration).toMatch(/participation_status = 'confirmed'/i)
  })
})
