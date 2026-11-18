-- ==============================================================================
-- Migration : Séparation qualification_reason et revocation_reason (Brigade Verte)
-- Date      : 2026-11-18
-- Contexte  : Correction Lot 1/2
-- ==============================================================================

BEGIN;

-- 1. Ajouter la colonne qualification_reason sur brigade_verte_qualifications si absente
ALTER TABLE public.brigade_verte_qualifications
  ADD COLUMN IF NOT EXISTS qualification_reason text;

-- 2. Ajouter la colonne qualification_reason sur brigade_verte_qualification_history si absente
ALTER TABLE public.brigade_verte_qualification_history
  ADD COLUMN IF NOT EXISTS qualification_reason text;

-- 3. Si des lignes existantes dans l'historique ont stocké le motif de qualification dans revocation_reason,
--    les réparer proprement en désactivant temporairement le trigger d'immutabilité pendant la transaction.
ALTER TABLE public.brigade_verte_qualification_history
  DISABLE TRIGGER trg_protect_brigade_verte_history_mod;

UPDATE public.brigade_verte_qualification_history
SET
  qualification_reason = revocation_reason,
  revocation_reason = NULL
WHERE decision IN ('qualified', 'requalified')
  AND qualification_reason IS NULL
  AND revocation_reason IS NOT NULL;

ALTER TABLE public.brigade_verte_qualification_history
  ENABLE TRIGGER trg_protect_brigade_verte_history_mod;

-- 4. Remplacer la RPC qualify_brigade_verte_action avec la séparation exacte des motifs
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
      qualification_reason = v_reason,
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
      qualification_reason,
      qualified_by,
      qualified_at,
      created_at,
      updated_at
    ) VALUES (
      p_action_id,
      'active',
      v_url,
      v_reason,
      v_actor,
      v_now,
      v_now,
      v_now
    )
    RETURNING id INTO v_qual_id;
  END IF;

  -- Historique immuable avec qualification_reason renseigné et revocation_reason NULL
  INSERT INTO public.brigade_verte_qualification_history (
    qualification_id,
    action_id,
    decision,
    decided_by,
    decided_at,
    justification_url,
    qualification_reason,
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
    NULL,
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
      'qualification_reason', v_reason
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

-- 5. Remplacer la RPC revoke_brigade_verte_qualification avec la séparation exacte des motifs
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

  -- Historique immuable avec revocation_reason renseigné et qualification_reason NULL
  INSERT INTO public.brigade_verte_qualification_history (
    qualification_id,
    action_id,
    decision,
    decided_by,
    decided_at,
    justification_url,
    qualification_reason,
    revocation_reason,
    operation_id
  ) VALUES (
    p_qualification_id,
    v_existing.action_id,
    'revoked',
    v_actor,
    v_now,
    NULL,
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
      'qualification_id', p_qualification_id,
      'action_id', v_existing.action_id,
      'revocation_reason', v_reason
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

-- 6. Privilèges stricts sur les fonctions et tables
REVOKE ALL ON FUNCTION public.qualify_brigade_verte_action(UUID, TEXT, TEXT, TEXT, TEXT) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.qualify_brigade_verte_action(UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.revoke_brigade_verte_qualification(UUID, TEXT, TEXT, TEXT) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_brigade_verte_qualification(UUID, TEXT, TEXT, TEXT) TO service_role;

REVOKE ALL ON TABLE public.brigade_verte_qualifications FROM anon, authenticated, public;
REVOKE ALL ON TABLE public.brigade_verte_qualification_history FROM anon, authenticated, public;

GRANT ALL ON TABLE public.brigade_verte_qualifications TO service_role;
GRANT ALL ON TABLE public.brigade_verte_qualification_history TO service_role;

COMMIT;
