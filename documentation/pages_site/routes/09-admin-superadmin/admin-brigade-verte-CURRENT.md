# Administration Brigade Verte Paris — Parcours Éco-Citoyen

> **Statut : CURRENT**
> **Route administrative :** `/admin/brigade-verte` & `/admin/brigade-verte/[actionId]`
> **Accès :** Restreint strictement à l'IMU max (`requireCreatorAccess` / `checkAdminAccess`).

---

## 1. Responsabilité & Finalité

Cette interface et ses routes associées permettent à l'IMU max d'attester de manière irréfragable et motivée qu'une opération de ramassage canonique est une opération officielle « Quartier Propre » organisée ou coorganisée par Brigade Verte Paris.

**Invariants stricts :**
- Aucune qualification automatique ou déduite du titre, du champ `notes`, de l'import ou du seul `organizer_id`.
- Seul l'IMU max peut attribuer ou révoquer le statut « Quartier Propre Brigade Verte ».
- Aucune attribution de points XP, badge ou niveau n'est créée par ce contrat.

---

## 2. API Routes

### `GET /api/admin/brigade-verte`
- Paramètres : `query` (recherche par lieu ou ID), `date` (YYYY-MM-DD), `actionId` (UUID).
- Fournit la liste des actions éligibles ou le statut détaillé + historique d'une action ciblée.

### `POST /api/admin/brigade-verte`
Mutations exclusives réservées à l'IMU max. Écrit obligatoirement dans `admin_operations_audit` (`operationType = "brigade_verte_qualification"`).

**Qualification :**
```json
{
  "action": "qualify",
  "actionId": "UUID",
  "justificationUrl": "https://..."
}
```

**Révocation :**
```json
{
  "action": "revoke",
  "qualificationId": "UUID",
  "revocationReason": "Motif clair (10-500 caractères)..."
}
```

---

## 3. Données et Persistance

- Table `brigade_verte_qualifications` : porte le statut (`active` ou `revoked`), l'URL de justification HTTPS, l'auteur et la date.
- Table `brigade_verte_qualification_history` : table append-only conservant chaque décision immuable.
- RLS : lecture publique restreinte aux qualifications actives ; mutations réservées exclusivement à `service_role`. Table d'historique totalement protégée (aucun SELECT authenticated).
