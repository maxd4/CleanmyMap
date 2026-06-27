# Supabase Query Optimization Playbook

But: reduce Supabase quota usage without changing UX, business rules, or visible behavior.

## Anti-patterns to avoid

- Loading an entire table, then filtering in application code.
- Reading more columns than the feature actually uses.
- Repeating the same broad query on each mutation or page mount.
- Using JSONB or derived fields without an index when they are part of the filter path.
- Replacing a database-side filter with a client-side `.filter(...)`.
- “Optimizing” by weakening RLS or by using `service_role` on a path that does not need it.

## Preferred order of fixes

1. Narrow the query columns.
2. Add `limit`, `range`, or a cursor when the result can grow.
3. Move repeated selection logic into a stable RPC when the query is shared or expensive.
4. Add a targeted index, including expression indexes for normalized JSONB fields.
5. Keep the business filter in place if it is still needed, but make the DB return a much smaller candidate set.

## Decision rule

If the code currently does:

```ts
supabase.from("table").select("*")
```

or:

```ts
const rows = await supabase.from("table").select("...")
return rows.filter(...)
```

then the first question is not “how do we make the filter faster?” but:

- can the database apply the filter directly?
- can the selection become an RPC?
- can an index make the filter sargable?

## Special case: dynamic pollution score for actions

The pollution score for `actions` is not a fixed threshold. It is a relative score built from a database reference:

- the RPC [`action_pollution_score_references`](../../supabase/migrations/20260602000001_action_pollution_score_references_rpc.sql) computes the largest approved action per volunteer in `public.actions`;
- the frontend normalizes each action against that reference in [`apps/web/src/lib/actions/pollution-score.ts`](../../apps/web/src/lib/actions/pollution-score.ts);
- `100%` is therefore assigned to the biggest approved action currently available in the database for the relevant axis;
- the score must stay dynamic and must not be replaced by a fixed constant just to reduce warnings or simplify the query path.

If you optimize this path:

- keep the RPC as the source of truth;
- keep the per-volunteer normalization;
- keep the `max(wasteScore, buttsScore)` severity rule;
- keep tests that lock the relative behavior.

## Safe refactor shape

Use this shape when the user-facing result must stay identical:

- keep the same output contract;
- reduce the candidate rows at the database layer;
- preserve the final business check if it is still useful;
- add a migration for any new index or RPC;
- keep the route and UI unchanged unless the task explicitly asks otherwise.

## Snapshot-first read paths

For non-critical dashboards or estimators that join many tables, prefer this order:

1. read the latest persisted snapshot;
2. fall back to the live multi-table recomputation only when no snapshot exists;
3. keep the live recomputation on the write path or manual capture path.

This pattern is appropriate when:

- the feature is informative rather than mission-critical;
- exact real-time freshness is not required;
- the live recomputation fans out into many reads, like `project-signals.ts`.

## Validation checklist

- Re-run the Supabase quota audit.
- Confirm the hot table or route now reads fewer rows.
- Verify the query path still returns the same visible result.
- Add or update a test that checks the RPC or the narrowed query path.
- Check that no new raw scan of the target table was introduced elsewhere.

## Example: community notifications

When an event creates in-app notifications:

- do not load every profile and filter in memory;
- load only the profiles that can match the target geography;
- keep `paris_arrondissement` and normalized `metadata->>'zoneName'` indexed;
- keep the same notification payload and delivery behavior.

## What to document in the next audit

For each new Supabase optimization, note:

- the table or RPC involved;
- the exact filter being moved to the database;
- the index that makes the filter cheap;
- the test that protects the behavior;
- the remaining quota risk, if any.
