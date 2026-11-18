-- ==============================================================================
-- Migration : Durcissement intégrité & sécurité Brigade Verte Paris
-- Date      : 2026-11-18
-- Contexte  : Correction Lot 1/2
-- ==============================================================================

BEGIN;

-- 1. Restreindre l'enum / check de type d'opération audit pour inclure brigade_verte_qualification
ALTER TABLE public.admin_operations_audit
  DROP CONSTRAINT IF EXISTS admin_operations_audit_operation_type_check;

ALTER TABLE public.admin_operations_audit
  ADD CONSTRAINT admin_operations_audit_operation_type_check
  CHECK (operation_type IN (
    'moderation',
    'import_dry_run',
    'import_confirm',
    'role_management',
    'admin_operation',
    'spogomi_team_name_rename',
    'brigade_verte_qualification'
  ));

-- 2. Corriger le search_path de la fonction de trigger set_brigade_verte_updated_at
CREATE OR REPLACE FUNCTION public.set_brigade_verte_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3. Immutabilité stricte (append-only) sur brigade_verte_qualification_history
CREATE OR REPLACE FUNCTION public.prevent_modification_brigade_verte_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  RAISE EXCEPTION 'brigade_verte_qualification_history is append-only: updates, deletions, and truncations are forbidden'
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_brigade_verte_history_mod ON public.brigade_verte_qualification_history;
CREATE TRIGGER trg_protect_brigade_verte_history_mod
  BEFORE UPDATE OR DELETE ON public.brigade_verte_qualification_history
  FOR EACH ROW EXECUTE FUNCTION public.prevent_modification_brigade_verte_history();

DROP TRIGGER IF EXISTS trg_protect_brigade_verte_history_truncate ON public.brigade_verte_qualification_history;
CREATE TRIGGER trg_protect_brigade_verte_history_truncate
  BEFORE TRUNCATE ON public.brigade_verte_qualification_history
  FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_modification_brigade_verte_history();

-- 4. Révocation des privilèges par défaut et durcissement des accès
-- Révoquer tous les privilèges aux rôles anon, authenticated et public
REVOKE ALL ON TABLE public.brigade_verte_qualifications FROM anon, authenticated, public;
REVOKE ALL ON TABLE public.brigade_verte_qualification_history FROM anon, authenticated, public;

-- Accorder uniquement à service_role
GRANT ALL ON TABLE public.brigade_verte_qualifications TO service_role;
GRANT ALL ON TABLE public.brigade_verte_qualification_history TO service_role;

-- Supprimer l'ancienne politique RLS publique permissive qui exposait les métadonnées administratives privées
DROP POLICY IF EXISTS "Brigade verte qualifications: lecture publique actives" ON public.brigade_verte_qualifications;

-- Les tables sont privées et accessibles exclusivement par service_role
-- (RLS activée, aucune policy pour authenticated/anon => fail-closed total)

-- 5. RPC PostgreSQL atomique : qualify_brigade_verte_action
-- Effectue vérification d'éligibilité, verrouillage FOR UPDATE, qualification/requalification,
-- écriture dans l'historique et écriture dans admin_operations_audit en une seule transaction.
CREATE OR REPLACE FUNCTION public.qualify_brigade_verte_action(
  p_action_id UUID,
  p_justification_url TEXT,
  p_qualification_reason TEXT,
  p_actor_user_id TEXT,
  p_operation_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_action public.actions%ROWTYPE;
  v_existing public.brigade_verte_qualifications%ROWTYPE;
  v_audit public.admin_operations_audit%ROWTYPE;
  v_actor TEXT := NULLIF(btrim(p_actor_user_id), '');
  v_operation TEXT := NULLIF(btrim(p_operation_id), '');
  v_reason TEXT := NULLIF(btrim(p_qualification_reason), '');
  v_url TEXT := NULLIF(btrim(p_justification_url), '');
  v_qual_id UUID;
  v_decision TEXT;
  v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
  -- Garde rôle : service_role exclusif
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Validation entrées
  IF v_actor IS NULL OR v_operation IS NULL THEN
    RAISE EXCEPTION 'Actor and operation ID are required' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF v_url IS NULL OR NOT (v_url LIKE 'https://%') THEN
    RAISE EXCEPTION 'justification_url must start with https://' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF v_reason IS NULL OR char_length(v_reason) < 5 OR char_length(v_reason) > 500 THEN
    RAISE EXCEPTION 'qualification_reason must be between 5 and 500 characters' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Verrou advisory sur l'action pour sérialiser les décisions concurrentes
  PERFORM pg_advisory_xact_lock(hashtextextended(p_action_id::text, 0));

  -- Idempotence sur operation_id
  SELECT * INTO v_audit FROM public.admin_operations_audit WHERE operation_id = v_operation FOR UPDATE;
  IF FOUND THEN
    SELECT * INTO v_existing FROM public.brigade_verte_qualifications WHERE action_id = p_action_id;
    RETURN jsonb_build_object(
      'status', 'unchanged',
      'idempotent', true,
      'qualification_id', v_existing.id,
      'decision', 'idempotent_replay'
    );
  END IF;

  -- Verrouillage et validation stricte de l'action
  SELECT * INTO v_action FROM public.actions WHERE id = p_action_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Action not found' USING ERRCODE = 'data_exception';
  END IF;

  -- Prédicat d'éligibilité complet :
  -- 1. Date passée (action_date < CURRENT_DATE)
  -- 2. Phase finalisée (action_phase = 'post_action_complete')
  -- 3. Statut approuvé (status = 'approved')
  -- 4. Publiée (published_at IS NOT NULL)
  -- 5. Visible (moderation_visibility = 'visible')
  -- 6. Publique (access_mode = 'public')
  -- 7. Non annulée (cancelled_at IS NULL)
  -- 8. Revue not_required ou approved (review_state IN ('not_required', 'approved'))
  IF NOT (
    v_action.action_date < CURRENT_DATE
    AND coalesce(v_action.status, '') = 'approved'
    AND coalesce(v_action.action_phase, '') = 'post_action_complete'
    AND coalesce(v_action.moderation_visibility, '') = 'visible'
    AND coalesce(v_action.access_mode, 'public') = 'public'
    AND v_action.cancelled_at IS NULL
    AND coalesce(v_action.review_state, 'not_required') IN ('not_required', 'approved')
    AND v_action.published_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Action is not eligible for Brigade Verte qualification' USING ERRCODE = 'check_violation';
  END IF;

  -- Vérifier qualification existante
  SELECT * INTO v_existing FROM public.brigade_verte_qualifications WHERE action_id = p_action_id FOR UPDATE;

  IF FOUND AND v_existing.status = 'active' THEN
    RAISE EXCEPTION 'Action is already actively qualified' USING ERRCODE = 'unique_violation';
  END IF;

  IF FOUND AND v_existing.status = 'revoked' THEN
    -- Requalification
    v_decision := 'requalified';
    v_qual_id := v_existing.id;

    UPDATE public.brigade_verte_qualifications
    SET
      status = 'active',
      justification_url = v_url,
      qualified_by = v_actor,
      qualified_at = v_now,
      revocation_reason = NULL,
      revoked_by = NULL,
      revoked_at = NULL,
      requalified_at = v_now,
      updated_at = v_now
    WHERE id = v_qual_id;
  ELSE
    -- Nouvelle qualification
    v_decision := 'qualified';

    INSERT INTO public.brigade_verte_qualifications (
      action_id,
      status,
      justification_url,
      qualified_by,
      qualified_at,
      created_at,
      updated_at
    ) VALUES (
      p_action_id,
      'active',
      v_url,
      v_actor,
      v_now,
      v_now,
      v_now
    )
    RETURNING id INTO v_qual_id;
  END IF;

  -- Historique immuable
  INSERT INTO public.brigade_verte_qualification_history (
    qualification_id,
    action_id,
    decision,
    decided_by,
    decided_at,
    justification_url,
    revocation_reason,
    operation_id
  ) VALUES (
    v_qual_id,
    p_action_id,
    v_decision,
    v_actor,
    v_now,
    v_url,
    v_reason,
    v_operation
  );

  -- Audit administratif
  INSERT INTO public.admin_operations_audit (
    operation_id,
    actor_user_id,
    operation_type,
    outcome,
    target_id,
    at,
    details
  ) VALUES (
    v_operation,
    v_actor,
    'brigade_verte_qualification',
    'success',
    p_action_id::text,
    v_now,
    jsonb_build_object(
      'action', 'qualify',
      'decision', v_decision,
      'qualification_id', v_qual_id,
      'justification_url', v_url,
      'reason', v_reason
    )
  );

  RETURN jsonb_build_object(
    'status', 'success',
    'qualification_id', v_qual_id,
    'decision', v_decision,
    'idempotent', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.qualify_brigade_verte_action(UUID, TEXT, TEXT, TEXT, TEXT) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.qualify_brigade_verte_action(UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- 6. RPC PostgreSQL atomique : revoke_brigade_verte_qualification
-- Effectue révocation, historique et audit en une seule transaction.
CREATE OR REPLACE FUNCTION public.revoke_brigade_verte_qualification(
  p_qualification_id UUID,
  p_revocation_reason TEXT,
  p_actor_user_id TEXT,
  p_operation_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_existing public.brigade_verte_qualifications%ROWTYPE;
  v_audit public.admin_operations_audit%ROWTYPE;
  v_actor TEXT := NULLIF(btrim(p_actor_user_id), '');
  v_operation TEXT := NULLIF(btrim(p_operation_id), '');
  v_reason TEXT := NULLIF(btrim(p_revocation_reason), '');
  v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
  -- Garde rôle : service_role exclusif
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Validation entrées
  IF v_actor IS NULL OR v_operation IS NULL THEN
    RAISE EXCEPTION 'Actor and operation ID are required' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF v_reason IS NULL OR char_length(v_reason) < 5 OR char_length(v_reason) > 500 THEN
    RAISE EXCEPTION 'revocation_reason must be between 5 and 500 characters' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Verrou advisory sur la qualification
  PERFORM pg_advisory_xact_lock(hashtextextended(p_qualification_id::text, 0));

  -- Idempotence sur operation_id
  SELECT * INTO v_audit FROM public.admin_operations_audit WHERE operation_id = v_operation FOR UPDATE;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', 'unchanged',
      'idempotent', true,
      'qualification_id', p_qualification_id,
      'decision', 'idempotent_replay'
    );
  END IF;

  -- Verrouillage de la qualification
  SELECT * INTO v_existing FROM public.brigade_verte_qualifications WHERE id = p_qualification_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Qualification not found' USING ERRCODE = 'data_exception';
  END IF;

  IF v_existing.status = 'revoked' THEN
    RAISE EXCEPTION 'Qualification is already revoked' USING ERRCODE = 'check_violation';
  END IF;

  -- Mise à jour révocation
  UPDATE public.brigade_verte_qualifications
  SET
    status = 'revoked',
    revocation_reason = v_reason,
    revoked_by = v_actor,
    revoked_at = v_now,
    updated_at = v_now
  WHERE id = p_qualification_id;

  -- Historique immuable
  INSERT INTO public.brigade_verte_qualification_history (
    qualification_id,
    action_id,
    decision,
    decided_by,
    decided_at,
    justification_url,
    revocation_reason,
    operation_id
  ) VALUES (
    p_qualification_id,
    v_existing.action_id,
    'revoked',
    v_actor,
    v_now,
    NULL,
    v_reason,
    v_operation
  );

  -- Audit administratif
  INSERT INTO public.admin_operations_audit (
    operation_id,
    actor_user_id,
    operation_type,
    outcome,
    target_id,
    at,
    details
  ) VALUES (
    v_operation,
    v_actor,
    'brigade_verte_qualification',
    'success',
    p_qualification_id::text,
    v_now,
    jsonb_build_object(
      'action', 'revoke',
      'decision', 'revoked',
      'qualification_id', p_qualification_id,
      'action_id', v_existing.action_id,
      'reason', v_reason
    )
  );

  RETURN jsonb_build_object(
    'status', 'success',
    'qualification_id', p_qualification_id,
    'decision', 'revoked',
    'idempotent', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_brigade_verte_qualification(UUID, TEXT, TEXT, TEXT) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_brigade_verte_qualification(UUID, TEXT, TEXT, TEXT) TO service_role;

COMMIT;
