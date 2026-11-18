-- ==============================================================================
-- Migration : Qualifications "Quartier Propre Brigade Verte" (Parcours Éco-Citoyen)
-- Date      : 2026-11-18
-- Statut    : STATIC_CONTRACT (DB_SEMANTICS_NOT_EXECUTED en local sans container PG)
-- ==============================================================================

-- 1. Table principale : qualification d'une action "Quartier Propre Brigade Verte"
CREATE TABLE IF NOT EXISTS public.brigade_verte_qualifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES public.actions(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('active', 'revoked')),
  justification_url text NOT NULL CHECK (justification_url ~ '^https://'),
  revocation_reason text,
  qualified_by text NOT NULL,         -- clerk user id de l'acteur IMU max
  qualified_at timestamptz NOT NULL DEFAULT now(),
  revoked_by text,                    -- clerk user id de l'acteur si révoqué
  revoked_at timestamptz,
  requalified_at timestamptz,         -- dernière requalification après révocation
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bvq_revoked_needs_reason CHECK (
    status != 'revoked' OR revocation_reason IS NOT NULL
  ),
  CONSTRAINT bvq_revoked_needs_actor CHECK (
    status != 'revoked' OR revoked_by IS NOT NULL
  ),
  CONSTRAINT bvq_revoked_needs_at CHECK (
    status != 'revoked' OR revoked_at IS NOT NULL
  ),
  CONSTRAINT bvq_url_https CHECK (justification_url LIKE 'https://%')
);

-- Unicité : une seule qualification active par action
CREATE UNIQUE INDEX IF NOT EXISTS brigade_verte_qualifications_action_active_unique
  ON public.brigade_verte_qualifications (action_id)
  WHERE status = 'active';

-- Index de recherche
CREATE INDEX IF NOT EXISTS brigade_verte_qualifications_action_id_idx
  ON public.brigade_verte_qualifications (action_id);

CREATE INDEX IF NOT EXISTS brigade_verte_qualifications_status_idx
  ON public.brigade_verte_qualifications (status);

-- 2. Table d'historique immuable des décisions (append-only)
CREATE TABLE IF NOT EXISTS public.brigade_verte_qualification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qualification_id uuid NOT NULL REFERENCES public.brigade_verte_qualifications(id) ON DELETE RESTRICT,
  action_id uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('qualified', 'revoked', 'requalified')),
  decided_by text NOT NULL,
  decided_at timestamptz NOT NULL DEFAULT now(),
  justification_url text,
  revocation_reason text,
  operation_id text
);

CREATE INDEX IF NOT EXISTS brigade_verte_qualification_history_qualification_id_idx
  ON public.brigade_verte_qualification_history (qualification_id);

CREATE INDEX IF NOT EXISTS brigade_verte_qualification_history_action_id_idx
  ON public.brigade_verte_qualification_history (action_id);

-- 3. Sécurité RLS
-- Lecture publique des qualifications actives uniquement (pour affichage / vérification)
ALTER TABLE public.brigade_verte_qualifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brigade verte qualifications: lecture publique actives"
  ON public.brigade_verte_qualifications
  FOR SELECT
  USING (status = 'active');

-- Aucune mutation client (INSERT/UPDATE/DELETE) autorisée : service_role exclusif.

-- Historique : Table administrative privée, RLS fail-closed pour authenticated
ALTER TABLE public.brigade_verte_qualification_history ENABLE ROW LEVEL SECURITY;
-- Aucune policy SELECT pour authenticated => invisible sauf via service_role

-- 4. Trigger de mise à jour timestamp
CREATE OR REPLACE FUNCTION public.set_brigade_verte_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS brigade_verte_qualifications_updated_at ON public.brigade_verte_qualifications;
CREATE TRIGGER brigade_verte_qualifications_updated_at
  BEFORE UPDATE ON public.brigade_verte_qualifications
  FOR EACH ROW EXECUTE FUNCTION public.set_brigade_verte_updated_at();

-- 5. Commentaires documentaires
COMMENT ON TABLE public.brigade_verte_qualifications IS
  'Qualifications IMU max des actions Quartier Propre Brigade Verte Paris. Statuts: active | revoked. Mutations via service_role uniquement.';
COMMENT ON TABLE public.brigade_verte_qualification_history IS
  'Historique immuable append-only des décisions de qualification Brigade Verte. Accès service_role uniquement.';
