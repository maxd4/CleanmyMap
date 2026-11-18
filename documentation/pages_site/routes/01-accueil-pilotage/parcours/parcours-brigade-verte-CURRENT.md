# Projection Personnelle — Parcours Éco-Citoyen Brigade Verte

> **Statut : CURRENT**
> **Route API :** `GET /api/parcours/brigade-verte`
> **Accès :** Authentifié, owner-scoped (`requireAuthenticatedAccess`).
> **Cache :** `Cache-Control: private, no-store`.

---

## 1. Règle Métier & Objectif

Permet à chaque bénévole connecté de consulter l'avancement de son parcours éco-citoyen auprès de Brigade Verte Paris, basé sur un objectif de 2 participations confirmées à des opérations labellisées.

### Règles d'éligibilité et revalidation dynamique :
1. L'action doit être activement qualifiée par l'IMU max dans `brigade_verte_qualifications` (`status = 'active'`).
2. L'action doit satisfaire en temps réel l'ensemble du prédicat d'éligibilité canonique : date passée (`action_date < CURRENT_DATE`), statut approuvé (`status = 'approved'`), phase terminée (`action_phase = 'post_action_complete'`), visibilité publique (`moderation_visibility = 'visible'`), mode d'accès public (`access_mode = 'public'`), non annulée (`cancelled_at IS NULL`), publiée (`published_at IS NOT NULL`), et revue valide (`review_state IN ('approved', 'not_required')`). Si une action qualifiée devient privée, annulée ou invalidée après coup, elle est immédiatement et automatiquement exclue du calcul des preuves.
3. L'utilisateur authentifié doit avoir une entrée dans `action_participants` avec `participation_status = 'confirmed'`.
4. Sont exclus : inscriptions, claims en attente ou annulés, simples effectifs non confirmés.
5. Progression = $\min(2, \text{preuves distinctes})$.
6. Les deux preuves sont retenues par date d'action croissante puis par identifiant d'action. En cas de révocation administrative ou d'invalidation d'une opération, le remplacement déterministe par une autre action admissible est automatique.
7. Aucune pagination silencieusement tronquée : la lecture des qualifications actives est exhaustive.

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
