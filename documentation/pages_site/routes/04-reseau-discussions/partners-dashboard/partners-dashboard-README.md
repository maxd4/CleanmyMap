# Gouvernance des partenariats

## Fiche canonique

- **Route** : `/partners/dashboard`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/partners/dashboard/page.tsx`
- `apps/web/src/lib/partners/published-annuaire-entries-store.ts`
- `apps/web/src/lib/partners/onboarding-requests-store.ts`
- `apps/web/src/lib/partners/annuaire-types.ts`
- **Type fonctionnel** : page de réseau
- **Famille / bloc fonctionnel** : Réseau & Discussions (bloc)
- **Statut** : protégé
- **Contexte nécessaire** : Compte connecté, parfois rôle ou profil spécifique
- **Objectif utilisateur principal** : Piloter la revue des demandes et des fiches partenaires à partir de données réellement persistées.
- **Action principale attendue** : Examiner les états de publication/modération et la couverture déclarée des fiches persistées.
- **Palette attendue** : indigo
- **Scope** : Gouvernance des fiches partenaires et des demandes onboarding persistées ; hors Annuaire public statique.
- **Terminée** : non
- **Couleurs actuellement détectées** : indigo — canvas #e8e9fc, halo rgba(99, 102, 241, 0.22)
- **Incohérences de couleurs** : Aucune incohérence de couleur détectée avec la règle actuelle.
- **Risque de conflit avec les couleurs existantes** : moyen : indigo et pink doivent rester distincts du légal et des zones techniques.
- **Niveau de surcharge textuelle** : fort
- **Textes à conserver** :
- Messages clés
- liens de navigation
- CTA réseau
- état de participation
- **Textes à réduire ou supprimer** :
- Accroches longues
- cartes descriptives en doublon
- contextes trop bavards
- **Bulles / cartes / contextes trop nombreux** : Les listes d'acteurs, messages et cartes réseau peuvent saturer la colonne centrale.
- **Composants UI concernés** :
- Listes
- cartes discussion
- réseau / annuaire
- messagerie
- panneaux latéraux
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : moyenne


## États à documenter

- **loading** : fond `slate`, skeletons sobres, loader discret, même largeur et mêmes espacements que les autres états.
- **empty state** : fond `slate` doux, ton encourageant, CTA utile unique.
- **access refused** : `slate` avec léger `red` / `orange`, ton neutre et professionnel, pas de dramatisation.
- **Architecture commune** : `SystemStateLayout`, `SystemStateIcon`, `SystemStateTitle`, `SystemStateDescription`, `SystemStateAction`, `SystemStateMeta`.
- **Variantes** : `variant="loading"`, `variant="empty"`, `variant="forbidden"`.
- **Règle** : aucune route de ce type ne doit avoir un état vide sans CTA utile.

## Contrat de données

- Les KPI « Fiches publiées », « Partenaires actifs », « Zones couvertes » et « Fiches à revoir » sont calculés exclusivement depuis `listPublishedPartnerAnnuaireEntries()` et les champs persistés de publication, vérification, qualification, activité récente et couverture.
- « Fiches publiées » et « Zones couvertes » utilisent uniquement les fiches dont `publicationStatus` est `accepted`.
- « Partenaires actifs » combine uniquement les états persistés `qualificationStatus`, `verificationStatus` et `recentActivityAt` des fiches acceptées.
- « Fiches à revoir » reflète les fiches persistées dont l’état de publication n’est pas `accepted`.
- Le nombre « À valider » vient indépendamment de `countPartnerOnboardingRequests()` et ne dépend pas des fiches publiées.
- En l’absence de fiche persistée, le dashboard affiche des compteurs à zéro et un état vide explicite. En cas d’échec de lecture persistée, les KPI concernés affichent `n/a` et une erreur visible.

## Séparation avec l’Annuaire public

- `INITIAL_ANNUAIRE_ENTRIES` constitue une source statique/curatée de l’Annuaire public et ne participe pas au pilotage de gouvernance.
- Une entrée statique ne peut modifier les totaux, actifs, zones, fiches à revoir, activité récente, décisions ou priorités du dashboard.
- La « Checklist de gouvernance » est une aide générique de revue ; elle ne constitue pas une liste de priorités calculées et ne fabrique aucune décision opérationnelle.



## Références legacy

- [entraide_locale.md](../../../../4-BLOC-RESEAU&DISCUSSION/entraide_locale.md)

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.

## Fichiers associés

- [Présentation détaillée](./partners-dashboard-presentation-detaillee.md)
- [Liste des propositions à traiter](./partners-dashboard-liste-propositions-a-traiter.md)
- [Objectifs non pertinents](./partners-dashboard-objectifs-non-pertinents.md)
