# Rejoindre un formulaire

## Fiche canonique

- **Route** : `/sections/rejoindre-un-formulaire`
- **Famille** : Agir
- **Accès lecture** : `public-visible`
- **Compte requis** : oui pour rejoindre, annuler ou traiter une demande
- **Palette runtime** : agir / emerald
- **Exception page-family** : `join-group-form`

## Sources principales

```txt
apps/web/src/app/(app)/sections/[sectionId]/page.tsx
apps/web/src/components/sections/rubriques/rejoindre-un-formulaire-section.tsx
apps/web/src/app/api/actions/group-join/route.ts
apps/web/src/app/api/actions/[actionId]/group-join/route.ts
apps/web/src/lib/actions/group-participation.ts
apps/web/src/lib/actions/permissions.ts
```

## Objectif utilisateur

Permettre à un bénévole de :

1. voir les actions de groupe ouvertes ;
2. envoyer une demande de participation ;
3. suivre son état ;
4. annuler une demande ou quitter une participation ;
5. ouvrir directement une action ciblée avec `actionId`.

Permettre au créateur, organisateur ou coorganisateur autorisé de :

1. voir les demandes de son action ;
2. accepter ou refuser ;
3. rechercher un compte ;
4. ajouter manuellement un participant.

Les profils admin-like peuvent traiter toute file selon les permissions centrales.

## Contrat de visibilité

Une action apparaît dans la liste publique uniquement si :

```txt
action_phase = pre_action
status ∈ {approved, pending}
groupJoinEnabled = true
```

Le statut `pending` n'exclut donc pas automatiquement une pré-action de cette page.

La visibilité dans les formulaires de groupe reste distincte de :

- visibilité sur la carte publique ;
- validation d'une déclaration finale ;
- comptabilisation dans les indicateurs d'impact.

## Contrat de participation

Le flux normal :

```txt
POST /api/actions/group-join
```

force :

```txt
isAdminLike = false
```

Donc même un admin utilisant le bouton normal rejoint selon le parcours normal :

```txt
participationStatus = pending
participationSource = group_form
```

## Contrat de traitement de file

La route :

```txt
/api/actions/[actionId]/group-join
```

utilise `resolveReviewerAccess(...)`.

Sont autorisés selon le code actuel :

```txt
créateur
organisateur
coorganisateur autorisé
admin-like
```

Un utilisateur extérieur ne peut pas rechercher des comptes ni traiter la file.

## Deux concepts à ne pas confondre

### Liste publique des actions ouvertes

Visible sans compte.

Contient les pré-actions ouvertes à la participation.

### File de modération des demandes

Visible uniquement pour un reviewer autorisé.

Contient :

```txt
pendingRequests
confirmedParticipants
```

Ne plus appeler cette file « file publique ».

## Ajout manuel

Le backend utilise encore la fonction nommée :

```txt
addActionParticipationByAdmin(...)
```

alors que la route peut maintenant être utilisée par un organisateur ou coorganisateur autorisé.

Dette de nommage :

```txt
renommer ou généraliser le helper sans casser son contrat
```

Ne pas considérer le nom du helper comme une règle d'autorisation.

## Audit admin

Les opérations admin-like de traitement de participation sont journalisées via :

```txt
appendActionModerationAudit(...)
```

Les ajouts directs par modération utilisent `participation_source = admin_override`. La source historique `admin` reste lisible pour compatibilité mais ne doit plus être produite par le parcours normal.

Un retrait d'un participant confirmé est journalisé comme `admin_remove_participant`. Un refus de demande en attente reste journalisé comme `admin_review_reject`.

Les opérations normales d'un organisateur sur sa propre action ne doivent pas être confondues avec un override administratif.

## Progression

Après :

```txt
acceptation
ajout manuel
annulation / départ
```

le code tente de rafraîchir le profil de progression concerné.

Toute évolution de cette logique doit rester idempotente.

## UI cible

- hero court ;
- recherche et filtres ;
- cartes d'actions ouvertes ;
- suivi personnel ;
- distinction claire entre demande `pending` et participation `confirmed` ;
- file de modération uniquement pour les reviewers autorisés ;
- confirmation avant participation, annulation ou départ ;
- états loading, empty, error et forbidden accessibles.

## États

```txt
loading
empty
error
forbidden
queue-empty
confirmation dialog
```

## Statut documentaire

```txt
Fonction principale en place.
Documentation réalignée sur le runtime actuel.
Rester en maintenance pour les futures commandes produit non encore modélisées, notamment changement d'organisateur et réouverture d'action si un statut de clôture apparaît.
```

## Références

- [Présentation détaillée](./formulaire-de-groupe-presentation-detaillee.md)
- [Propositions à traiter](./formulaire-de-groupe-liste-propositions-a-traiter.md)
- [Objectifs non pertinents](./formulaire-de-groupe-objectifs-non-pertinents.md)
