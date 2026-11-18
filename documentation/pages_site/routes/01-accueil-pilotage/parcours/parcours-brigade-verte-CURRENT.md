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
7. Projection exhaustive et fail-closed : lecture owner-scoped des participations confirmées de l'utilisateur avec pagination par curseur stable ordonnée sur `action_id`, puis vérification par lots bornés des qualifications actives et des actions éligibles. Toute indisponibilité ou erreur de base renvoie immédiatement un statut d'erreur fermé (`status = 'error'`) sans jamais tronquer ni convertir une anomalie en `0/2`.

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

---

## 3. Expérience Utilisateur dans la Gamification (`/sections/gamification`)

Le composant `GamificationBrigadeVertePanel` s'insère dans la section Gamification (`apps/web/src/components/sections/rubriques/gamification/`) :

- **Politique de rafraîchissement SWR et intégrité runtime :**
  - Revalidation automatique lors du retour sur l'onglet (`revalidateOnFocus: true`, `revalidateOnReconnect: true`, `dedupingInterval: 2000`) pour détecter immédiatement toute révocation ou invalidation administrative.
  - Validation runtime stricte du DTO via `validateBrigadeVerteApiResponse` : vérification du statut, du compteur entier $0 \le count \le 2$, de la cardinalité exacte $count = proofs.length$, et déduplication stricte des identifiants d'actions (`actionId`).
  - Toute réponse incohérente ou corrompue bascule immédiatement en état d'indisponibilité fermé, sans jamais afficher de `2/2` artificiel ni présumer `0/2`.
- **Compteur officiel et statuts :**
  - `0/2` : « Aucune participation justificative » (jauge 0 %, badge neutre).
  - `1/2` : « Une participation vérifiée » (jauge 50 %, badge ambré).
  - `2/2` : « Deux participations justificatives réunies » (jauge 100 %, badge émeraude).
- **Attribution factuelle :**
  - Mention factuelle d'attribution : « Progression de preuves vérifiées par CleanMyMap » (exclusion de mentions de partenariat institutionnel non contractuel).
- **Les 3 conditions publiées (communication Brigade Verte Paris, septembre 2026) :**
  1. *Deux opérations « Quartier Propre »* : Seule condition suivie et vérifiée par CleanMyMap.
  2. *Formation / Sensibilisation* : Condition externe requise par Brigade Verte Paris, non vérifiée dans CleanMyMap.
  3. *Engagement durable* : Condition externe d'implication citoyenne continue, non vérifiée dans CleanMyMap.
- **Parcours guidé en 4 volets :**
  - *Découvrir :* Explication des opérations Quartier Propre et critères de participation.
  - *Participer :* Liens vers les actions publiques (`/actions`) ou renvoi direct vers le site officiel (https://www.brigadeverteparis.fr/) si aucune opération n'est disponible.
  - *Confirmer sa présence :* Rappel que l'inscription seule ne suffit pas ; la présence doit être confirmée sur le terrain par l'organisateur ou attestée par claim rétrospectif.
  - *Suivre ses preuves :* Liste détaillée des opérations retenues (dates, lieux, identifiants, dates de validation).
- **Foire aux Questions (FAQ) :**
  - Accordéon pédagogique clarifiant l'éligibilité, la différence inscription vs présence confirmée, la procédure de confirmation rétrospective, les 2 conditions externes et l'obtention finale du diplôme.
- **Invariants de gamification :**
  - Aucun badge virtuel additionnel dans le catalogue de badges CleanMyMap.
  - Aucun point XP additionnel attribué.
  - Aucun classement ni certification automatique délivrée dans l'application.

---

## 4. Justificatif Personnel A4 Imprimable (`/prints/brigade-verte`)

Route accessible uniquement aux utilisateurs authentifiés réunissant leurs deux preuves vérifiées (`count === 2`).

- **Sécurité, contrôle serveur et confidentialité :**
  - Vérification systématique côté serveur via `computeBrigadeVerteProgress(userId)`.
  - Rejet immédiat avec message explicatif si l'utilisateur n'a pas ses deux preuves actives ou si une preuve a été révoquée.
  - **Confidentialité du nom :** Le nom ou prénom facultatif n'est pas transmis dans l'URL (aucun paramètre `?name=`) afin de ne pas fuiter dans l'historique du navigateur ou les journaux HTTP. Il est saisi directement et localement dans la page d'impression (`PrintBeneficiaryField`), sans aucune persistance (ni localStorage, cookies ou sessionStore) et sans requête serveur supplémentaire.
  - À l'impression ou l'export PDF du navigateur, le champ interactif s'efface au profit du texte en clair déclaré (ou « Bénévole CleanMyMap » par défaut), limité strictement à 60 caractères.
- **Mise en page et mentions obligatoires :**
  - Format A4 portrait conforme aux styles d'impression CleanMyMap (`max-w-[210mm]`, styles `@media print`).
  - **Mention obligatoire exacte :**
    > « Document informatif établi par CleanMyMap. Ne constitue ni un diplôme, ni une attestation officielle de la Brigade Verte Paris. »
  - Date d'édition dynamique et rappel des deux preuves retenues (dates de réalisation, lieux, identifiants d'actions canoniques, dates de qualification administrative).
  - Présentation des démarches externes restantes (formation et engagement) avec lien officiel vers https://www.brigadeverteparis.fr/.
  - Absence stricte de logo officiel de la Brigade Verte Paris, de tampon officiel, de signature ou de compétences inventées.
  - Note d'intégrité temporelle : un justificatif imprimé/exporté constitue un document historique ; toute révocation administrative d'une preuve bloque toute nouvelle édition.
