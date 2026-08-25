-- Retire the temporary benchmark bridge table.
-- No runtime, migration, script, or historical repository reference uses it.
-- Keep this non-CASCADE so an undiscovered dependency fails closed.
drop table if exists public.benchmark_tmp_image_bridge;
