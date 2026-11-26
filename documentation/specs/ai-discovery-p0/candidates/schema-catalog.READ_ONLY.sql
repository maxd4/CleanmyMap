-- CANDIDATE: metadata only, not a migration.
-- Authorized ephemeral replay or linked read-only inspection only.
-- Keep exports in artifacts/; expressions and role names may be sensitive.
WITH application_schemas AS (
  SELECT oid, nspname FROM pg_namespace WHERE nspname IN ('public', 'private')
), relations AS (
  SELECT c.*, n.nspname FROM pg_class c JOIN application_schemas n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('r', 'p', 'v', 'm', 'f')
), functions AS (
  SELECT p.*, n.nspname FROM pg_proc p JOIN application_schemas n ON n.oid = p.pronamespace
  WHERE p.prokind IN ('f', 'p', 'w', 'a')
), objects AS (
  SELECT 'relation' AS kind, format('%I.%I', r.nspname, r.relname) AS identity,
    jsonb_build_object('kind', r.relkind, 'owner', pg_get_userbyid(r.relowner),
      'rls', r.relrowsecurity, 'force_rls', r.relforcerowsecurity) AS metadata
  FROM relations r
  UNION ALL
  SELECT 'column', format('%I.%I.%I', r.nspname, r.relname, a.attname),
    jsonb_build_object('position', a.attnum, 'type', format_type(a.atttypid, a.atttypmod),
      'not_null', a.attnotnull, 'default', pg_get_expr(d.adbin, d.adrelid),
      'identity', a.attidentity, 'generated', a.attgenerated)
  FROM relations r JOIN pg_attribute a ON a.attrelid = r.oid
  LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
  WHERE a.attnum > 0 AND NOT a.attisdropped
  UNION ALL
  SELECT 'constraint', format('%I.%I.%I', r.nspname, r.relname, c.conname),
    jsonb_build_object('type', c.contype, 'validated', c.convalidated,
      'definition', pg_get_constraintdef(c.oid, true))
  FROM relations r JOIN pg_constraint c ON c.conrelid = r.oid
  UNION ALL
  SELECT 'index', format('%I.%I', r.nspname, i.relname),
    jsonb_build_object('relation', format('%I.%I', r.nspname, r.relname),
      'valid', x.indisvalid, 'unique', x.indisunique, 'definition', pg_get_indexdef(i.oid))
  FROM relations r JOIN pg_index x ON x.indrelid = r.oid JOIN pg_class i ON i.oid = x.indexrelid
  UNION ALL
  SELECT 'policy', format('%I.%I.%I', r.nspname, r.relname, p.policyname),
    jsonb_build_object('command', p.cmd, 'permissive', p.permissive,
      'roles', p.roles, 'using', p.qual, 'with_check', p.with_check)
  FROM relations r JOIN pg_policies p ON p.schemaname = r.nspname AND p.tablename = r.relname
  UNION ALL
  SELECT 'relation_acl', format('%I.%I', r.nspname, r.relname),
    jsonb_build_object('grantee', CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
      'grantor', pg_get_userbyid(a.grantor), 'privilege', a.privilege_type, 'grantable', a.is_grantable)
  FROM relations r CROSS JOIN LATERAL aclexplode(coalesce(r.relacl, acldefault('r', r.relowner))) a
  UNION ALL
  SELECT 'function', format('%I.%I(%s)', f.nspname, f.proname, pg_get_function_identity_arguments(f.oid)),
    jsonb_build_object('kind', f.prokind, 'arguments', pg_get_function_arguments(f.oid),
      'return', pg_get_function_result(f.oid), 'owner', pg_get_userbyid(f.proowner),
      'security_definer', f.prosecdef, 'volatility', f.provolatile)
  FROM functions f
  UNION ALL
  SELECT 'function_acl', format('%I.%I(%s)', f.nspname, f.proname, pg_get_function_identity_arguments(f.oid)),
    jsonb_build_object('grantee', CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
      'grantor', pg_get_userbyid(a.grantor), 'privilege', a.privilege_type, 'grantable', a.is_grantable)
  FROM functions f CROSS JOIN LATERAL aclexplode(coalesce(f.proacl, acldefault('f', f.proowner))) a
  UNION ALL
  SELECT 'trigger', format('%I.%I.%I', r.nspname, r.relname, t.tgname),
    jsonb_build_object('enabled', t.tgenabled, 'definition', pg_get_triggerdef(t.oid, true))
  FROM relations r JOIN pg_trigger t ON t.tgrelid = r.oid WHERE NOT t.tgisinternal
)
SELECT kind, identity, metadata FROM objects ORDER BY kind, identity, metadata::text;
