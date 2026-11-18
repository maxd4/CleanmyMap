begin;

select plan(51);

-- 1. Contrôle des privilèges tables (anon / authenticated / service_role)
select ok((select relrowsecurity from pg_class where oid = 'public.brigade_verte_qualifications'::regclass), 'qualifications has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.brigade_verte_qualification_history'::regclass), 'qualification history has RLS enabled');
select ok(not has_table_privilege('anon', 'public.brigade_verte_qualifications', 'SELECT'), 'anon cannot read qualifications directly');
select ok(not has_table_privilege('anon', 'public.brigade_verte_qualifications', 'INSERT'), 'anon cannot insert qualifications');
select ok(not has_table_privilege('authenticated', 'public.brigade_verte_qualifications', 'SELECT'), 'authenticated cannot read qualifications directly');
select ok(not has_table_privilege('authenticated', 'public.brigade_verte_qualifications', 'INSERT'), 'authenticated cannot insert qualifications directly');
select ok(not has_table_privilege('authenticated', 'public.brigade_verte_qualifications', 'UPDATE'), 'authenticated cannot update qualifications directly');
select ok(not has_table_privilege('authenticated', 'public.brigade_verte_qualifications', 'DELETE'), 'authenticated cannot delete qualifications directly');
select ok(not has_table_privilege('anon', 'public.brigade_verte_qualification_history', 'SELECT'), 'anon cannot read qualification history');
select ok(not has_table_privilege('authenticated', 'public.brigade_verte_qualification_history', 'SELECT'), 'authenticated cannot read qualification history');
select ok(not has_table_privilege('authenticated', 'public.brigade_verte_qualification_history', 'INSERT'), 'authenticated cannot insert into qualification history directly');
select ok(not has_table_privilege('authenticated', 'public.brigade_verte_qualification_history', 'UPDATE'), 'authenticated cannot update qualification history');
select ok(not has_table_privilege('authenticated', 'public.brigade_verte_qualification_history', 'DELETE'), 'authenticated cannot delete from qualification history');
select ok(has_table_privilege('service_role', 'public.brigade_verte_qualifications', 'SELECT'), 'service_role can select qualifications');
select ok(has_table_privilege('service_role', 'public.brigade_verte_qualification_history', 'SELECT'), 'service_role can select qualification history');

-- 2. Contrôle des privilèges RPC (seul service_role peut exécuter)
select ok(has_function_privilege('service_role', 'public.qualify_brigade_verte_action(uuid, text, text, text, text)', 'EXECUTE'), 'service_role can execute qualify_brigade_verte_action');
select ok(not has_function_privilege('authenticated', 'public.qualify_brigade_verte_action(uuid, text, text, text, text)', 'EXECUTE'), 'authenticated cannot execute qualify_brigade_verte_action');
select ok(not has_function_privilege('anon', 'public.qualify_brigade_verte_action(uuid, text, text, text, text)', 'EXECUTE'), 'anon cannot execute qualify_brigade_verte_action');
select ok(has_function_privilege('service_role', 'public.revoke_brigade_verte_qualification(uuid, text, text, text)', 'EXECUTE'), 'service_role can execute revoke_brigade_verte_qualification');
select ok(not has_function_privilege('authenticated', 'public.revoke_brigade_verte_qualification(uuid, text, text, text)', 'EXECUTE'), 'authenticated cannot execute revoke_brigade_verte_qualification');
select ok(not has_function_privilege('anon', 'public.revoke_brigade_verte_qualification(uuid, text, text, text)', 'EXECUTE'), 'anon cannot execute revoke_brigade_verte_qualification');

-- Passage sous service_role pour les tests fonctionnels transactionnels
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"brigade-verte-test-service"}', true);

-- Création des fixtures
create temp table brigade_verte_fixture (
  eligible_action_id uuid not null,
  ineligible_action_id uuid not null
);

do $$
declare
  v_eligible uuid := 'b0000000-0000-0000-0000-000000000001';
  v_ineligible uuid := 'b0000000-0000-0000-0000-000000000002';
begin
  -- Action 1 : Éligible (date passée, approved, post_action_complete, visible, public, published_at, not cancelled, review not_required)
  insert into public.actions (
    id, created_by_clerk_id, action_date, location_label,
    status, action_phase, moderation_visibility, access_mode,
    review_state, cancelled_at, published_at, data_provenance
  ) values (
    v_eligible, 'clerk-creator-1', current_date - 1, 'Paris 10e',
    'approved', 'post_action_complete', 'visible', 'public',
    'not_required', null, current_timestamp, 'real'
  );

  -- Action 2 : Inéligible (date future)
  insert into public.actions (
    id, created_by_clerk_id, action_date, location_label,
    status, action_phase, moderation_visibility, access_mode,
    review_state, cancelled_at, published_at, data_provenance
  ) values (
    v_ineligible, 'clerk-creator-2', current_date + 1, 'Paris 11e',
    'approved', 'post_action_complete', 'visible', 'public',
    'not_required', null, current_timestamp, 'real'
  );

  insert into brigade_verte_fixture values (v_eligible, v_ineligible);
end;
$$;

-- 3. Rejet d'une action inéligible
select throws_ok(
  $$select public.qualify_brigade_verte_action(
    (select ineligible_action_id from brigade_verte_fixture),
    'https://paris.fr/justif',
    'Motif test action future',
    'actor-admin-1',
    'op-ineligible-1'
  )$$,
  '23514', null,
  'qualifying an ineligible action throws check_violation'
);

-- 4. Qualification atomique réussie d'une action éligible
select lives_ok(
  $$select public.qualify_brigade_verte_action(
    (select eligible_action_id from brigade_verte_fixture),
    'https://paris.fr/justif-action-1',
    'Action Quartier Propre confirmée avec la ville',
    'actor-admin-1',
    'op-qualify-1'
  )$$,
  'qualifying an eligible action succeeds'
);

-- 5. Vérification du statut actif et de la séparation des motifs
select is(
  (select status from public.brigade_verte_qualifications where action_id = (select eligible_action_id from brigade_verte_fixture)),
  'active',
  'qualification status is active'
);
select is(
  (select qualification_reason from public.brigade_verte_qualifications where action_id = (select eligible_action_id from brigade_verte_fixture)),
  'Action Quartier Propre confirmée avec la ville',
  'qualification_reason is populated on qualifications table'
);
select is(
  (select revocation_reason from public.brigade_verte_qualifications where action_id = (select eligible_action_id from brigade_verte_fixture)),
  null,
  'revocation_reason is null on qualifications table upon qualification'
);

-- 6. Journalisation synchrone dans l'historique et séparation des motifs
select is(
  (select decision from public.brigade_verte_qualification_history where action_id = (select eligible_action_id from brigade_verte_fixture) and operation_id = 'op-qualify-1'),
  'qualified',
  'history entry recorded with decision qualified'
);
select is(
  (select qualification_reason from public.brigade_verte_qualification_history where action_id = (select eligible_action_id from brigade_verte_fixture) and operation_id = 'op-qualify-1'),
  'Action Quartier Propre confirmée avec la ville',
  'history qualification_reason is populated'
);
select is(
  (select revocation_reason from public.brigade_verte_qualification_history where action_id = (select eligible_action_id from brigade_verte_fixture) and operation_id = 'op-qualify-1'),
  null,
  'history revocation_reason is null upon qualification'
);

-- 7. Journalisation synchrone dans admin_operations_audit
select is(
  (select count(*)::integer from public.admin_operations_audit where operation_id = 'op-qualify-1'),
  1,
  'admin audit entry logged synchronously'
);
select is(
  (select outcome from public.admin_operations_audit where operation_id = 'op-qualify-1'),
  'success',
  'admin audit outcome is success'
);

-- 8. Idempotence sur operation_id
select is(
  ((select public.qualify_brigade_verte_action(
    (select eligible_action_id from brigade_verte_fixture),
    'https://paris.fr/justif-action-1',
    'Action Quartier Propre confirmée avec la ville',
    'actor-admin-1',
    'op-qualify-1'
  ))->>'idempotent')::boolean,
  true,
  'qualification replay with same operation_id is idempotent'
);

-- 9. Rejet d'une qualification concurrente active avec operation_id distinct (unique_violation)
select throws_ok(
  $$select public.qualify_brigade_verte_action(
    (select eligible_action_id from brigade_verte_fixture),
    'https://paris.fr/justif-action-1-bis',
    'Autre motif qualification concurrente',
    'actor-admin-2',
    'op-qualify-competing'
  )$$,
  '23505', null,
  'qualifying an already actively qualified action throws unique_violation'
);

-- 10. Révocation atomique réussie
select lives_ok(
  $$select public.revoke_brigade_verte_qualification(
    (select id from public.brigade_verte_qualifications where action_id = (select eligible_action_id from brigade_verte_fixture)),
    'Annulation du partenariat par la direction de la propreté',
    'actor-admin-revoker',
    'op-revoke-1'
  )$$,
  'revoking active qualification succeeds'
);

-- 11. Vérification du statut révoqué et de la séparation des motifs
select is(
  (select status from public.brigade_verte_qualifications where action_id = (select eligible_action_id from brigade_verte_fixture)),
  'revoked',
  'qualification status is updated to revoked'
);
select is(
  (select revocation_reason from public.brigade_verte_qualifications where action_id = (select eligible_action_id from brigade_verte_fixture)),
  'Annulation du partenariat par la direction de la propreté',
  'revocation_reason is populated on qualification row'
);
select is(
  (select decision from public.brigade_verte_qualification_history where action_id = (select eligible_action_id from brigade_verte_fixture) and operation_id = 'op-revoke-1'),
  'revoked',
  'history entry recorded with decision revoked'
);
select is(
  (select revocation_reason from public.brigade_verte_qualification_history where action_id = (select eligible_action_id from brigade_verte_fixture) and operation_id = 'op-revoke-1'),
  'Annulation du partenariat par la direction de la propreté',
  'history revocation_reason is populated for revocation'
);
select is(
  (select qualification_reason from public.brigade_verte_qualification_history where action_id = (select eligible_action_id from brigade_verte_fixture) and operation_id = 'op-revoke-1'),
  null,
  'history qualification_reason is null for revocation'
);

-- 12. Audit de révocation
select is(
  (select count(*)::integer from public.admin_operations_audit where operation_id = 'op-revoke-1'),
  1,
  'revocation admin audit logged'
);

-- 13. Idempotence de révocation sur operation_id
select is(
  ((select public.revoke_brigade_verte_qualification(
    (select id from public.brigade_verte_qualifications where action_id = (select eligible_action_id from brigade_verte_fixture)),
    'Annulation du partenariat par la direction de la propreté',
    'actor-admin-revoker',
    'op-revoke-1'
  ))->>'idempotent')::boolean,
  true,
  'revocation replay with same operation_id is idempotent'
);

-- 14. Rejet d'une révocation sur une qualification déjà révoquée avec nouvel operation_id
select throws_ok(
  $$select public.revoke_brigade_verte_qualification(
    (select id from public.brigade_verte_qualifications where action_id = (select eligible_action_id from brigade_verte_fixture)),
    'Deuxieme tentative de revocation',
    'actor-admin-revoker',
    'op-revoke-2'
  )$$,
  '23514', null,
  'revoking an already revoked qualification throws check_violation'
);

-- 15. Requalification après révocation
select lives_ok(
  $$select public.qualify_brigade_verte_action(
    (select eligible_action_id from brigade_verte_fixture),
    'https://paris.fr/justif-action-1-requal',
    'Rétablissement officiel de la convention Quartier Propre',
    'actor-admin-1',
    'op-requalify-1'
  )$$,
  'requalification of previously revoked action succeeds'
);

select is(
  (select status from public.brigade_verte_qualifications where action_id = (select eligible_action_id from brigade_verte_fixture)),
  'active',
  'qualification status is active after requalification'
);
select ok(
  (select requalified_at is not null from public.brigade_verte_qualifications where action_id = (select eligible_action_id from brigade_verte_fixture)),
  'requalified_at timestamp is set after requalification'
);
select is(
  (select count(*)::integer from public.brigade_verte_qualification_history where action_id = (select eligible_action_id from brigade_verte_fixture) and decision = 'requalified'),
  1,
  'history has exactly 1 requalified entry'
);
select is(
  (select count(*)::integer from public.brigade_verte_qualification_history where action_id = (select eligible_action_id from brigade_verte_fixture)),
  3,
  'history contains full sequence of 3 events: qualified, revoked, requalified'
);

-- 16. Immuabilité stricte de l'historique (rejet de tout UPDATE ou DELETE)
select throws_ok(
  $$update public.brigade_verte_qualification_history
    set qualification_reason = 'falsifie'
    where action_id = (select eligible_action_id from brigade_verte_fixture)$$,
  '23514', null,
  'UPDATE on brigade_verte_qualification_history is rejected by immutability trigger'
);
select throws_ok(
  $$delete from public.brigade_verte_qualification_history
    where action_id = (select eligible_action_id from brigade_verte_fixture)$$,
  '23514', null,
  'DELETE on brigade_verte_qualification_history is rejected by immutability trigger'
);

-- 17. Intégrité transactionnelle et rollback complet en cas d'erreur
do $$
begin
  begin
    perform public.qualify_brigade_verte_action(
      (select ineligible_action_id from brigade_verte_fixture),
      'https://paris.fr/justif-err',
      'Ce motif ne doit pas persister',
      'actor-err',
      'op-rollback-check'
    );
  exception
    when others then
      null;
  end;
end;
$$;

select is(
  (select count(*)::integer from public.admin_operations_audit where operation_id = 'op-rollback-check'),
  0,
  'no partial audit entry remains after rolled back qualification'
);
select is(
  (select count(*)::integer from public.brigade_verte_qualification_history where operation_id = 'op-rollback-check'),
  0,
  'no partial history entry remains after rolled back qualification'
);

select * from finish();
rollback;
