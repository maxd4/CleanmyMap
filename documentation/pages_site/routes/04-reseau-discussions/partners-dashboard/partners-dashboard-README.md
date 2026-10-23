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
- **Contexte nécessaire** : Compte connecté avec la capacité effective `ACTIVE_ROLE=admin` ou `ACTIVE_ROLE=max`
- **Complétion du compte** : Un profil incomplet affiche un rappel non bloquant ; les droits de gouvernance des fiches restent contrôlés séparément.
- **Objectif utilisateur principal** : Piloter la revue des demandes et des fiches partenaires à partir de données réellement persistées.
- **Action principale attendue** : Examiner les états de publication/modération, retirer une fiche publiée par une décision `rejected` motivée et contrôler la couverture déclarée des fiches persistées.
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
- `requireAdminAccess()` est appelé avant toute lecture privilégiée des demandes, contacts, impacts ou fiches de gouvernance. Un visiteur ou un rôle actif non administratif reçoit un état d’accès sans données privées ; le rendu ne déduit jamais cette capacité d’un libellé de rôle UI.
- En l’absence de fiche persistée, le dashboard affiche des compteurs à zéro et un état vide explicite. En cas d’échec de lecture persistée, les KPI concernés affichent `n/a` et une erreur visible.

### Chaîne persistante de référencement

- `partner_onboarding_requests` conserve la demande privée et son statut métier ; `partner_annuaire_entries` conserve la fiche liée par `source_request_id` unique.
- La création utilise `create_partner_onboarding_request_with_annuaire` avec une clé d’idempotence par demandeur. La demande et sa projection annuaire sont créées dans la même transaction ; une reprise avec la même clé renvoie les identifiants existants.
- `public_data` est la projection public-safe. Le contact administratif reste dans `private_admin_contact` et n'est jamais sélectionné par la route publique.
- Une fiche est publiable uniquement après une décision administrative `accepted`. Le panneau de revue présente les fiches persistées concernées, y compris les fiches déjà acceptées afin de permettre leur retrait explicite par `rejected`, puis leur éventuelle nouvelle acceptation selon le même cycle. `review_partner_publication` met à jour la demande, la fiche et `admin_operations_audit` atomiquement ; une erreur ne produit pas de succès partiel.
- Après une décision de revue réussie, les chemins de lecture de l’Annuaire sont invalidés/rafraîchis ; seules les fiches `accepted` restent dans `GET /api/partners/published-directory` et dans les résultats publics.
- Les demandes historiques sans fiche sont réconciliées de manière non destructive et restent `pending_admin_review`. Une indisponibilité Supabase de l'API publique produit une erreur HTTP explicite, jamais un annuaire vide fabriqué.

## Extension SPOGOMI — lot 9

La même surface présente, lorsqu'elles existent, les éditions SPOGOMI
publiées associées par `actions.organizer_id` à chaque organisateur canonique.
Les projections environnementales sont celles de la consolidation publiée de
l'action et les missions sont celles des attestations certifiées. La liste ne
publie aucun roster ni identifiant personnel.

Les agrégats dédupliquent `actions.id`, séparent participations cumulées,
bénévoles uniques fiables, kilogrammes mesurés, masse de mégots et comptage
observé, et indiquent les données manquantes. Ils ne construisent aucun
classement sportif inter-édition et n'annoncent aucun partenariat officiel.
Une fiche Annuaire est liée uniquement par `organizerDirectoryId` exact et
après acceptation/vérification ; le rapprochement par nom est interdit.

## Séparation avec l’Annuaire public

- `INITIAL_ANNUAIRE_ENTRIES` constitue une source statique/curatée de l’Annuaire public et ne participe pas au pilotage de gouvernance.
- Une entrée statique ne peut modifier les totaux, actifs, zones, fiches à revoir, activité récente, décisions ou priorités du dashboard.
- La « Checklist de gouvernance » est une aide générique de revue ; elle ne constitue pas une liste de priorités calculées et ne fabrique aucune décision opérationnelle.

## Références legacy

- Référence legacy non versionnée dans le dépôt actuel ; consulter les documents canoniques de cette page et ne pas recréer l'ancien chemin.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
