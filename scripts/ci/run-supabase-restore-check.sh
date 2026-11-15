#!/usr/bin/env bash
set -euo pipefail

: "${RESTORE_CHECK_ROOT:?RESTORE_CHECK_ROOT is required}"
: "${RESTORE_CHECK_CONTAINER:?RESTORE_CHECK_CONTAINER is required}"
: "${RESTORE_CHECK_ROLES_FILE:?RESTORE_CHECK_ROLES_FILE is required}"
: "${RESTORE_CHECK_SCHEMA_FILE:?RESTORE_CHECK_SCHEMA_FILE is required}"
: "${RESTORE_CHECK_DATA_FILE:?RESTORE_CHECK_DATA_FILE is required}"
: "${RESTORE_CHECK_EXTENSION_PREFLIGHT_FILE:?RESTORE_CHECK_EXTENSION_PREFLIGHT_FILE is required}"

restore_db="${RESTORE_CHECK_DATABASE:-postgres}"
restore_check_step="initialization"
restore_check_fixture_expected="${RESTORE_CHECK_EXPECT_SYNTHETIC_FIXTURE:-false}"
trap 'status=$?; if [ "$status" -ne 0 ]; then echo "SUPABASE_RESTORE_CHECK: FAIL step=$restore_check_step"; fi' EXIT

docker cp "$RESTORE_CHECK_ROLES_FILE" "$RESTORE_CHECK_CONTAINER:/tmp/cmm-roles.sql"
docker cp "$RESTORE_CHECK_SCHEMA_FILE" "$RESTORE_CHECK_CONTAINER:/tmp/cmm-schema.sql"
docker cp "$RESTORE_CHECK_DATA_FILE" "$RESTORE_CHECK_CONTAINER:/tmp/cmm-data.sql"
docker cp "$RESTORE_CHECK_EXTENSION_PREFLIGHT_FILE" "$RESTORE_CHECK_CONTAINER:/tmp/cmm-restore-extension-preflight.sql"

restore_check_step="admin-preflight"
restore_admin_file="$RESTORE_CHECK_ROOT/restore-admin-user.txt"
restore_admin_diagnostic="$RESTORE_CHECK_ROOT/restore-admin-preflight.log"
set +e
node scripts/ci/prepare-supabase-restore-roles.mjs \
  --roles-file="$RESTORE_CHECK_ROLES_FILE" \
  --container="$RESTORE_CHECK_CONTAINER" \
  --database="$restore_db" \
  --write-user-file="$restore_admin_file" \
  --write-diagnostic-file="$restore_admin_diagnostic"
admin_preflight_status=$?
set -e
if [ "$admin_preflight_status" -ne 0 ]; then
  diagnostic=$(node scripts/ci/classify-supabase-restore-failure.mjs --log "$restore_admin_diagnostic" 2>/dev/null || printf 'sqlstate=UNAVAILABLE classification=unknown signal=unspecified')
  echo "RESTORE_ADMIN_PRIVILEGES: FAIL $diagnostic"
  exit "$admin_preflight_status"
fi
restore_admin_user="$(< "$restore_admin_file")"
test "$restore_admin_user" = "postgres" || test "$restore_admin_user" = "supabase_admin"
echo "RESTORE_ADMIN_PRIVILEGES: PASS"

docker exec "$RESTORE_CHECK_CONTAINER" psql -X -v ON_ERROR_STOP=1 -U "$restore_admin_user" -d "$restore_db" \
  -c "alter default privileges in schema public revoke all on tables from anon, authenticated;" \
  > "$RESTORE_CHECK_ROOT/restore-default-privileges.log" 2>&1

run_restore_stage() {
  local stage="$1"
  local input="$2"
  local log="$RESTORE_CHECK_ROOT/restore-${stage}.log"
  local psql_args=(-v ON_ERROR_STOP=1 -v VERBOSITY=verbose -U "$restore_admin_user" -d "$restore_db")
  if [ "$stage" = "schema" ] || [ "$stage" = "data" ]; then
    psql_args+=(-c "set search_path = public, extensions")
  fi
  if [ "$stage" = "data" ]; then
    psql_args+=(-c "set session_replication_role = replica")
  fi
  psql_args+=(-f "$input")
  set +e
  docker exec "$RESTORE_CHECK_CONTAINER" psql "${psql_args[@]}" > "$log" 2>&1
  local exit_code=$?
  set -e
  local diagnostic
  diagnostic=$(node scripts/ci/classify-supabase-restore-failure.mjs --log "$log")
  echo "RESTORE_SQL: stage=$stage exit_code=$exit_code $diagnostic"
  return "$exit_code"
}

restore_check_step="negative-extension"
printf 'create table public.cmm_backup_missing_extension_fixture (geom extensions.geometry);\n' > "$RESTORE_CHECK_ROOT/missing-extension.sql"
docker cp "$RESTORE_CHECK_ROOT/missing-extension.sql" "$RESTORE_CHECK_CONTAINER:/tmp/cmm-missing-extension.sql"
if docker exec "$RESTORE_CHECK_CONTAINER" psql -X -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -U "$restore_admin_user" -d "$restore_db" -f /tmp/cmm-missing-extension.sql > "$RESTORE_CHECK_ROOT/missing-extension.log" 2>&1; then
  echo "Missing-extension PostgreSQL negative fixture unexpectedly passed; publication is refused."
  exit 1
fi
missing_extension_fixture_count=$(docker exec "$RESTORE_CHECK_CONTAINER" psql -X -A -t -v ON_ERROR_STOP=1 -U "$restore_admin_user" -d "$restore_db" -c "select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'cmm_backup_missing_extension_fixture';")
test "$missing_extension_fixture_count" = "0"

restore_check_step="restore-roles"
run_restore_stage roles /tmp/cmm-roles.sql
restore_check_step="restore-extensions"
run_restore_stage extensions /tmp/cmm-restore-extension-preflight.sql
restore_check_step="restore-schema"
run_restore_stage schema /tmp/cmm-schema.sql

restore_check_step="relation-coherence"
docker exec "$RESTORE_CHECK_CONTAINER" psql -X -A -t -v ON_ERROR_STOP=1 -U "$restore_admin_user" -d "$restore_db" \
  -c "select n.nspname || '.' || c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r', 'p', 'S', 'v', 'm', 'f') order by 1;" \
  > "$RESTORE_CHECK_ROOT/restore-relations.txt"
node scripts/ci/verify-supabase-backup-relation-coherence.mjs \
  --data-file "$RESTORE_CHECK_DATA_FILE" \
  --available-file "$RESTORE_CHECK_ROOT/restore-relations.txt" \
  --write-exported-file "$RESTORE_CHECK_ROOT/restore-exported-relations.txt"

docker exec "$RESTORE_CHECK_CONTAINER" psql -X -v ON_ERROR_STOP=1 -U "$restore_admin_user" -d "$restore_db" \
  -c "create table public.cmm_backup_coherence_fixture (id integer primary key);"
printf 'public.cmm_backup_coherence_fixture\n' > "$RESTORE_CHECK_ROOT/relation-coherence-positive.relations.txt"
printf 'COPY public.cmm_backup_coherence_fixture (id) FROM stdin;\n1\n\\.\n' > "$RESTORE_CHECK_ROOT/relation-coherence-positive.data.sql"
docker cp "$RESTORE_CHECK_ROOT/relation-coherence-positive.data.sql" "$RESTORE_CHECK_CONTAINER:/tmp/cmm-relation-coherence-positive.sql"
docker exec "$RESTORE_CHECK_CONTAINER" psql -X -v ON_ERROR_STOP=1 -U "$restore_admin_user" -d "$restore_db" \
  -f /tmp/cmm-relation-coherence-positive.sql > "$RESTORE_CHECK_ROOT/relation-coherence-positive.log" 2>&1
node scripts/ci/verify-supabase-backup-relation-coherence.mjs \
  --data-file "$RESTORE_CHECK_ROOT/relation-coherence-positive.data.sql" \
  --available-file "$RESTORE_CHECK_ROOT/relation-coherence-positive.relations.txt"
printf 'COPY public.cmm_backup_missing_fixture (id) FROM stdin;\n1\n\\.\n' > "$RESTORE_CHECK_ROOT/relation-coherence-negative.data.sql"
docker cp "$RESTORE_CHECK_ROOT/relation-coherence-negative.data.sql" "$RESTORE_CHECK_CONTAINER:/tmp/cmm-relation-coherence-negative.sql"
if docker exec "$RESTORE_CHECK_CONTAINER" psql -X -v ON_ERROR_STOP=1 -U "$restore_admin_user" -d "$restore_db" -f /tmp/cmm-relation-coherence-negative.sql > "$RESTORE_CHECK_ROOT/relation-coherence-negative.log" 2>&1; then
  echo "Relation coherence PostgreSQL negative fixture unexpectedly passed; publication is refused."
  exit 1
fi
if node scripts/ci/verify-supabase-backup-relation-coherence.mjs \
  --data-file "$RESTORE_CHECK_ROOT/relation-coherence-negative.data.sql" \
  --available-file "$RESTORE_CHECK_ROOT/relation-coherence-positive.relations.txt"; then
  echo "Relation coherence negative fixture unexpectedly passed; publication is refused."
  exit 1
fi
docker exec "$RESTORE_CHECK_CONTAINER" psql -X -v ON_ERROR_STOP=1 -U "$restore_admin_user" -d "$restore_db" \
  -c "drop table public.cmm_backup_coherence_fixture;"
fixture_count=$(docker exec "$RESTORE_CHECK_CONTAINER" psql -X -A -t -v ON_ERROR_STOP=1 -U "$restore_admin_user" -d "$restore_db" -c "select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'cmm_backup_coherence_fixture';")
test "$fixture_count" = "0"
echo "RESTORE_RELATION_COHERENCE: PASS"

restore_check_step="restore-data"
run_restore_stage data /tmp/cmm-data.sql
restore_check_step="integrity-checks"
cat > "$RESTORE_CHECK_ROOT/restore-checks.sql" <<'EOF'
create temp table restore_business_relations (qualified_name text primary key);
copy restore_business_relations (qualified_name) from stdin;
EOF
cat "$RESTORE_CHECK_ROOT/restore-exported-relations.txt" >> "$RESTORE_CHECK_ROOT/restore-checks.sql"
cat >> "$RESTORE_CHECK_ROOT/restore-checks.sql" <<EOF
\\.
select
  $(if [ "$restore_check_fixture_expected" = "true" ]; then printf "(select count(*) = 1 from public.cmm_backup_restore_fixture where id = 1)"; else printf "true"; fi),
  (select count(*) > 0 from pg_constraint con join pg_class rel on rel.oid = con.conrelid join pg_namespace ns on ns.oid = rel.relnamespace where ns.nspname = 'public' and rel.relkind in ('r', 'p') and exists (select 1 from restore_business_relations r where r.qualified_name = 'public.' || rel.relname) and not exists (select 1 from pg_depend dep where dep.classid = 'pg_class'::regclass and dep.objid = rel.oid and dep.deptype = 'e')),
  (select count(*) > 0 from pg_proc where pronamespace = 'public'::regnamespace),
  (select count(*) > 0 from pg_class rel join pg_namespace ns on ns.oid = rel.relnamespace where ns.nspname = 'public' and rel.relkind in ('r', 'p') and rel.relrowsecurity and exists (select 1 from restore_business_relations r where r.qualified_name = 'public.' || rel.relname) and not exists (select 1 from pg_depend dep where dep.classid = 'pg_class'::regclass and dep.objid = rel.oid and dep.deptype = 'e')),
  (select count(*) >= 3 from pg_roles where rolname in ('anon', 'authenticated', 'service_role')),
  (select count(*) > 0 from information_schema.role_table_grants grant_info where grant_info.table_schema = 'public' and grant_info.grantee in ('anon', 'authenticated') and exists (select 1 from restore_business_relations r where r.qualified_name = 'public.' || grant_info.table_name) and not exists (select 1 from pg_depend dep join pg_class rel on rel.oid = dep.objid join pg_namespace ns on ns.oid = rel.relnamespace where dep.classid = 'pg_class'::regclass and dep.deptype = 'e' and ns.nspname = 'public' and rel.relname = grant_info.table_name)),
  (select count(*) > 0 from pg_extension where extname in ('pgcrypto', 'pg_trgm', 'uuid-ossp', 'postgis')),
  (select not exists (select 1 from restore_business_relations r join pg_class rel on r.qualified_name = 'public.' || rel.relname join pg_namespace ns on ns.oid = rel.relnamespace where ns.nspname = 'public' and exists (select 1 from pg_depend dep where dep.classid = 'pg_class'::regclass and dep.objid = rel.oid and dep.deptype = 'e'))),
  (select count(*) > 0 from pg_index index_info join pg_class rel on rel.oid = index_info.indrelid join pg_namespace ns on ns.oid = rel.relnamespace join pg_opclass opclass on opclass.oid = any (index_info.indclass::oid[]) join pg_namespace opclass_namespace on opclass_namespace.oid = opclass.opcnamespace where ns.nspname = 'public' and opclass_namespace.nspname = 'extensions' and opclass.opcname = 'gist_geometry_ops_2d' and exists (select 1 from restore_business_relations r where r.qualified_name = 'public.' || rel.relname)),
  (select count(*) >= 2 from pg_index index_info join pg_class rel on rel.oid = index_info.indrelid join pg_namespace ns on ns.oid = rel.relnamespace join pg_opclass opclass on opclass.oid = any (index_info.indclass::oid[]) join pg_namespace opclass_namespace on opclass_namespace.oid = opclass.opcnamespace where ns.nspname = 'public' and opclass_namespace.nspname = 'extensions' and opclass.opcname = 'gin_trgm_ops' and exists (select 1 from restore_business_relations r where r.qualified_name = 'public.' || rel.relname)),
  (select not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'cmm_backup_coherence_fixture'));
EOF
docker cp "$RESTORE_CHECK_ROOT/restore-checks.sql" "$RESTORE_CHECK_CONTAINER:/tmp/cmm-restore-checks.sql"
docker exec "$RESTORE_CHECK_CONTAINER" psql -X -A -t -F '|' -v ON_ERROR_STOP=1 -U "$restore_admin_user" -d "$restore_db" \
  -f /tmp/cmm-restore-checks.sql > "$RESTORE_CHECK_ROOT/restore-checks.txt"
grep -qx 't|t|t|t|t|t|t|t|t|t|t' "$RESTORE_CHECK_ROOT/restore-checks.txt"
echo "SUPABASE_RESTORE_CHECK: PASS roles=extensions=schema=data=executed integrity=checked"
