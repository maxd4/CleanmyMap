-- 20260501000023_atomic_operations.sql
-- Fonctions atomiques pour les opérations critiques multi-étapes

-- 1. Fonction atomique pour création d'action + training example
-- Garantit que les deux inserts réussit ou échouent ensemble
CREATE OR REPLACE FUNCTION public.create_action_with_training(
  p_user_id TEXT,
  p_actor_name TEXT,
  p_action_date DATE,
  p_location_label TEXT,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_waste_kg NUMERIC,
  p_cigarette_butts INTEGER,
  p_volunteers_count INTEGER,
  p_duration_minutes INTEGER,
  p_notes TEXT,
  p_derived_geometry_kind TEXT,
  p_derived_geometry_geojson TEXT,
  p_geometry_confidence DOUBLE PRECISION,
  p_geometry_source TEXT
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_action_id UUID;
BEGIN
  -- Insertion de l'action
  INSERT INTO public.actions (
    created_by_clerk_id,
    actor_name,
    action_date,
    location_label,
    latitude,
    longitude,
    waste_kg,
    cigarette_butts,
    volunteers_count,
    duration_minutes,
    notes,
    derived_geometry_kind,
    derived_geometry_geojson,
    geometry_confidence,
    geometry_source,
    status
  ) VALUES (
    p_user_id,
    p_actor_name,
    p_action_date,
    p_location_label,
    p_latitude,
    p_longitude,
    p_waste_kg,
    p_cigarette_butts,
    p_volunteers_count,
    p_duration_minutes,
    p_notes,
    p_derived_geometry_kind,
    p_derived_geometry_geojson,
    p_geometry_confidence,
    p_geometry_source,
    'pending'
  )
  RETURNING id INTO v_action_id;

  -- Insertion automatique du training example (si table existe)
  INSERT INTO public.training_examples (
    action_id,
    created_at
  )
  SELECT v_action_id, NOW()
  WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'training_examples'
  );

  RETURN v_action_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback automatique en cas d'erreur
    RAISE;
END;
$$;

-- 2. Fonction atomique pour modération d'action + notification + progression
CREATE OR REPLACE FUNCTION public.moderate_action_atomically(
  p_action_id UUID,
  p_new_status TEXT,
  p_moderator_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id TEXT;
  v_location_label TEXT;
  v_result JSONB;
BEGIN
  -- Vérifier que l'action existe et récupérer l'utilisateur
  SELECT created_by_clerk_id, location_label
  INTO v_user_id, v_location_label
  FROM public.actions
  WHERE id = p_action_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Action not found');
  END IF;

  -- Mise à jour du statut (transaction implicite)
  UPDATE public.actions
  SET status = p_new_status, updated_at = NOW()
  WHERE id = p_action_id;

  -- Créer la notification (si statut approved)
  IF p_new_status = 'approved' AND v_user_id IS NOT NULL THEN
    INSERT INTO public.app_notifications (
      user_id,
      type,
      title,
      content,
      payload,
      created_at
    ) VALUES (
      v_user_id,
      'validation',
      'Action Validée !',
      format('Votre action à %s a été approuvée par la modération.', v_location_label),
      jsonb_build_object('entityType', 'action', 'id', p_action_id),
      NOW()
    );
  END IF;

  -- Enregistrer l'opération d'audit
  INSERT INTO public.admin_operations_audit (
    operation_id,
    at,
    actor_user_id,
    operation_type,
    outcome,
    target_id,
    details
  ) VALUES (
    gen_random_uuid()::text,
    NOW(),
    p_moderator_id,
    'moderation',
    'success',
    p_action_id,
    jsonb_build_object('status', p_new_status)
  );

  RETURN jsonb_build_object('success', true, 'action_id', p_action_id);
EXCEPTION
  WHEN OTHERS THEN
    -- Log de l'erreur pour debugging
    RAISE WARNING 'Moderation atomic operation failed: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 3. Fonction atomique pour création de spot + progression
CREATE OR REPLACE FUNCTION public.create_spot_with_progression(
  p_user_id TEXT,
  p_label TEXT,
  p_waste_type TEXT,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_notes TEXT
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_spot_id UUID;
BEGIN
  -- Insertion du spot
  INSERT INTO public.spots (
    created_by_clerk_id,
    label,
    waste_type,
    latitude,
    longitude,
    status,
    notes
  ) VALUES (
    p_user_id,
    p_label,
    p_waste_type,
    p_latitude,
    p_longitude,
    'new',
    p_notes
  )
  RETURNING id INTO v_spot_id;

  -- La progression est suivie séparément via l'API
  -- Cette fonction garantit que le spot est créé
  
  RETURN v_spot_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Vérifier que les fonctions sont créées
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'create_action_with_training'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    RAISE NOTICE 'Function create_action_with_training not created - may need manual review';
  END IF;
END $$;