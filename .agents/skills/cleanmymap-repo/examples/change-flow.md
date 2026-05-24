# Example Change Flow

When changing a route or cross-cutting repo rule:

1. Read the relevant docs in `documentation/`.
2. Inspect the affected code in `apps/web/src`.
3. Check whether the change touches Supabase, auth, UI, or release behavior.
4. Apply the smallest safe change.
5. Run the matching validation commands.
6. Confirm the change does not violate the homepage, root-file, or worktree rules.
