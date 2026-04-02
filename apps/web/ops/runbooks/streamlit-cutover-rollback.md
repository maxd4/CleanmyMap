# Staged Cutover Plan (Next.js) + Streamlit Fallback

## Portée
Migration progressive des parcours prioritaires:
1. Déclaration (`/actions/new`)
2. Historique (`/actions/history`)
3. Vue terrain (`/actions/map`)

## Stratégie de rollout
### Phase 1 - Shadow validation (sans bascule trafic)
- Déployer Next.js en production.
- Exécuter checklist smoke interne.
- Vérifier observabilité (Sentry/PostHog/UptimeRobot).

### Phase 2 - Bascule contrôlée
- Ouvrir l'accès utilisateur principal au frontend Next.js.
- Maintenir Streamlit disponible en fallback contrôlé (URL legacy non publique ou route interne).
- Monitoring renforcé pendant 48h.

### Phase 3 - Stabilisation
- Surveiller erreurs API et parcours métier.
- Corriger incidents P1/P2 avant de retirer le fallback.

## Critères GO
- Lint/build `apps/web` passants.
- Endpoints ops stables (`/api/health`, `/api/uptime`).
- Flux nominal validé:
  - login
  - création action
  - visibilité historique
  - visibilité points géolocalisés

## Critères NO-GO / rollback
- Perte de données ou échec de création d'action confirmé.
- Erreurs serveur répétées sur endpoints critiques > seuil.
- Incident auth bloquant (Clerk) impactant la majorité des utilisateurs.

## Procédure rollback
1. Rebasculer DNS/routage vers le frontend legacy Streamlit.
2. Confirmer retour du flux nominal côté legacy.
3. Geler les déploiements Next.js.
4. Ouvrir incident avec horodatage + cause + impact.
5. Reprendre migration uniquement après correctif + validation complète.

## Journal d'incident minimal
- Horodatage (UTC + Europe/Paris)
- Déclencheur de rollback
- Impact utilisateur
- Cause racine
- Correctif
- Test de non-régression avant relance
