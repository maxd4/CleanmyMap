-- Read-only SQL catalog query (NOT a migration).
-- Authorized ephemeral replay or linked read-only inspection only.
-- Keep exports in artifacts/sql-catalog/; never export business rows, sequence values, or function bodies.
WITH application_schemas AS (
  SELECT oid, nspname, nspowner, nspacl FROM pg_namespace WHERE nspname IN ('public', 'private')
), relations AS (
  SELECT c.*, n.nspname FROM pg_class c JOIN application_schemas n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
), functions AS (
  SELECT p.*, n.nspname FROM pg_proc p JOIN application_schemas n ON n.oid = p.pronamespace
  WHERE p.prokind IN ('f', 'p', 'w', 'a')
), objects AS (
  SELECT 'schema' AS kind, format('%I', s.nspname) AS identity,
    jsonb_build_object('owner', pg_get_userbyid(s.nspowner)) AS metadata
  FROM application_schemas s
  UNION ALL
  SELECT 'schema_acl', format('%I', s.nspname),
    jsonb_build_object('grantee', CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
      'grantor', pg_get_userbyid(a.grantor), 'privilege', a.privilege_type, 'grantable', a.is_grantable)
  FROM application_schemas s CROSS JOIN LATERAL aclexplode(coalesce(s.nspacl, acldefault('n'::"char", s.nspowner))) a
  UNION ALL
  SELECT 'type', format('%I.%I', n.nspname, t.typname),
    jsonb_build_object('kind', t.typtype, 'owner', pg_get_userbyid(t.typowner),
      'enum_labels', CASE WHEN t.typtype = 'e' THEN (SELECT jsonb_agg(e.enumlabel ORDER BY e.enumsortorder) FROM pg_enum e WHERE e.enumtypid = t.oid) ELSE NULL END)
  FROM pg_type t JOIN application_schemas n ON n.oid = t.typnamespace
  WHERE t.typtype IN ('e', 'c', 'd', 'r', 'm') AND t.typname NOT LIKE '\_%'
  UNION ALL
  SELECT 'relation', format('%I.%I', r.nspname, r.relname),
    jsonb_build_object('kind', r.relkind, 'owner', pg_get_userbyid(r.relowner),
      'rls', r.relrowsecurity, 'force_rls', r.relforcerowsecurity)
  FROM relations r
  UNION ALL
  SELECT 'sequence', format('%I.%I', r.nspname, r.relname),
    jsonb_build_object('owner', pg_get_userbyid(r.relowner), 'data_type', format_type(seq.seqtypid, null),
      'increment', seq.seqincrement, 'cycle', seq.seqcycle)
  FROM relations r JOIN pg_sequence seq ON seq.seqrelid = r.oid WHERE r.relkind = 'S'
  UNION ALL
  SELECT 'inheritance', format('%I.%I->%I.%I', np.nspname, p.relname, nc.nspname, c.relname),
    jsonb_build_object('seqno', i.inhseqno)
  FROM pg_inherits i
  JOIN pg_class c ON c.oid = i.inhrelid JOIN application_schemas nc ON nc.oid = c.relnamespace
  JOIN pg_class p ON p.oid = i.inhparent JOIN pg_namespace np ON np.oid = p.relnamespace
  UNION ALL
  SELECT 'column', format('%I.%I.%I', r.nspname, r.relname, a.attname),
    jsonb_build_object('position', a.attnum, 'type', format_type(a.atttypid, a.atttypmod),
      'not_null', a.attnotnull, 'default', pg_get_expr(d.adbin, d.adrelid),
      'identity', a.attidentity, 'generated', a.attgenerated)
  FROM relations r JOIN pg_attribute a ON a.attrelid = r.oid
  LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
  WHERE a.attnum > 0 AND NOT a.attisdropped AND r.relkind <> 'S'
  UNION ALL
  SELECT 'column_acl', format('%I.%I.%I', r.nspname, r.relname, a.attname),
    jsonb_build_object('grantee', CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(acl.grantee) END,
      'grantor', pg_get_userbyid(acl.grantor), 'privilege', acl.privilege_type, 'grantable', acl.is_grantable)
  FROM relations r JOIN pg_attribute a ON a.attrelid = r.oid
  CROSS JOIN LATERAL aclexplode(a.attacl) acl
  WHERE a.attnum > 0 AND NOT a.attisdropped AND a.attacl IS NOT NULL
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
  SELECT 'policy', format('%I.%I.%I', p.schemaname, p.tablename, p.policyname),
    jsonb_build_object('command', p.cmd, 'permissive', p.permissive,
      'roles', p.roles, 'using', p.qual, 'with_check', p.with_check)
  FROM pg_policies p
  WHERE p.schemaname IN ('public', 'private')
     OR (p.schemaname = 'storage' AND p.tablename IN ('objects', 'buckets'))
  UNION ALL
  SELECT 'relation_acl', format('%I.%I', r.nspname, r.relname),
    jsonb_build_object('grantee', CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
      'grantor', pg_get_userbyid(a.grantor), 'privilege', a.privilege_type, 'grantable', a.is_grantable)
  FROM relations r CROSS JOIN LATERAL aclexplode(coalesce(r.relacl, acldefault(CASE WHEN r.relkind = 'S' THEN 's'::"char" ELSE 'r'::"char" END, r.relowner))) a
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
  FROM functions f CROSS JOIN LATERAL aclexplode(coalesce(f.proacl, acldefault('f'::"char", f.proowner))) a
  UNION ALL
  SELECT 'trigger', format('%I.%I.%I', r.nspname, r.relname, t.tgname),
    jsonb_build_object('enabled', t.tgenabled, 'definition', pg_get_triggerdef(t.oid, true))
  FROM relations r JOIN pg_trigger t ON t.tgrelid = r.oid WHERE NOT t.tgisinternal
)
SELECT kind, identity, metadata FROM objects ORDER BY kind, identity, metadata::text;
