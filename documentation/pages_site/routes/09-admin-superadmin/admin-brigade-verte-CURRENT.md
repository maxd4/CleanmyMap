# Administration Brigade Verte Paris — Parcours Éco-Citoyen

> **Statut : CURRENT**
> **Route administrative :** `/admin/brigade-verte` & `/admin/brigade-verte/[actionId]`
> **Accès :** Restreint strictement à l'IMU max (`requireCreatorAccess` / `checkCreatorAccess`). Rejet 403 pour tout rôle admin simple ou membre non-max.

---

## 1. Responsabilité & Finalité

Cette interface et ses routes associées permettent à l'IMU max d'attester de manière irréfragable, atomique et motivée qu'une opération de ramassage canonique est une opération officielle « Quartier Propre » organisée ou coorganisée par Brigade Verte Paris.

**Invariants stricts :**
- Aucune qualification automatique ou déduite du titre, du champ `notes`, de l'import ou du seul `organizer_id`.
- Seul l'IMU max peut attribuer ou révoquer le statut « Quartier Propre Brigade Verte ».
- Prédicat d'éligibilité complet : action passée (`action_date < CURRENT_DATE`), statut approuvé (`status = 'approved'`), phase terminée (`action_phase = 'post_action_complete'`), visibilité publique (`moderation_visibility = 'visible'`), mode d'accès public (`access_mode = 'public'`), non annulée (`cancelled_at IS NULL`), publiée (`published_at IS NOT NULL`), et revue valide (`review_state IN ('approved', 'not_required')`).
- Aucune attribution de points XP, badge ou diplôme n'est créée par ce contrat.

---

## 2. API Routes

### `GET /api/admin/brigade-verte`
- Paramètres : `query` (recherche par mot-clé lieu ou ID UUID), `date` (YYYY-MM-DD), `page` (entier, pagination 10 par 10), `actionId` (UUID spécifique).
- Fournit la liste paginée des actions éligibles (avec comptage exact `total`, `hasMore`, `page`) ou le statut détaillé + historique d'une action ciblée.

### `POST /api/admin/brigade-verte`
Mutations exclusives réservées à l'IMU max, déléguées à des fonctions RPC PostgreSQL atomiques sous transaction (`qualify_brigade_verte_action`, `revoke_brigade_verte_qualification`) avec verrou `pg_advisory_xact_lock` et écriture synchrone dans `admin_operations_audit` (`operationType = "brigade_verte_qualification"`).

**Qualification / Requalification :**
```json
{
  "action": "qualify",
  "actionId": "UUID",
  "justificationUrl": "https://...",
  "qualificationReason": "Motif de qualification vérifié (5-500 caractères)..."
}
```

**Révocation :**
```json
{
  "action": "revoke",
  "qualificationId": "UUID",
  "revocationReason": "Motif clair de révocation (5-500 caractères)..."
}
```

---

## 3. Données et Sécurité PostgreSQL

- Table `brigade_verte_qualifications` : porte le statut (`active` ou `revoked`), l'URL de justification HTTPS, l'auteur IMU max, la date de qualification, la date de requalification, le motif et auteur de révocation.
- Table `brigade_verte_qualification_history` : table append-only protégée par trigger interdisant strictement les UPDATE, DELETE et TRUNCATE.
- RLS & Privilèges : Tous privilèges révoqués pour `anon`, `authenticated` et `public`. Accès et mutations réservés exclusivement à `service_role` (fail-closed absolu, aucune fuite de métadonnées administratives privées).
- Fonctions RPC `SECURITY DEFINER` avec `SET search_path = pg_catalog, public`, exécutables uniquement par `service_role`.
