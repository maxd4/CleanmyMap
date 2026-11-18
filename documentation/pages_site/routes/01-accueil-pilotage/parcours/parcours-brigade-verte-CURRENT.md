# Projection Personnelle — Parcours Éco-Citoyen Brigade Verte

> **Statut : CURRENT**
> **Route API :** `GET /api/parcours/brigade-verte`
> **Accès :** Authentifié, owner-scoped (`requireAuthenticatedAccess`).
> **Cache :** `Cache-Control: private, no-store`.

---

## 1. Règle Métier & Objectif

Permet à chaque bénévole connecté de consulter l'avancement de son parcours éco-citoyen auprès de Brigade Verte Paris, basé sur un objectif de 2 participations confirmées à des opérations labellisées.

### Règles d'éligibilité :
1. L'action doit être activement qualifiée par l'IMU max dans `brigade_verte_qualifications` (`status = 'active'`).
2. L'utilisateur authentifié doit avoir une entrée dans `action_participants` avec `participation_status = 'confirmed'`.
3. Sont exclus : inscriptions, claims en attente ou annulés, simples effectifs non confirmés.
4. Progression = $\min(2, \text{preuves distinctes})$.
5. Les deux preuves sont retenues par date d'action croissante puis par identifiant d'action. En cas de révocation administrative d'une opération, le remplacement par une autre action admissible est automatique.

---

## 2. Contrat de Réponse

### Réponse nominale (`200 OK`) :
```json
{
  "status": "available",
  "count": 2,
  "proofs": [
    {
      "actionId": "UUID",
      "actionDate": "2026-05-10",
      "locationLabel": "Paris 11e - Bastille",
      "qualifiedAt": "2026-05-12T10:00:00Z"
    }
  ]
}
```

### Échec fermé (`fail-closed`) :
En cas d'erreur de base de données ou d'indisponibilité, la réponse est obligatoirement :
```json
{
  "status": "error",
  "message": "Impossible de charger la progression Brigade Verte actuellement."
}
```
L'indisponibilité n'est **jamais** transformée en `count: 0` ou `0/2`.
