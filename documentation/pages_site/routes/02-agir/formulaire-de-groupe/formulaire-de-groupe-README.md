# Rejoindre un formulaire

## Fiche canonique

- **Route** : `/sections/rejoindre-un-formulaire`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/sections/[sectionId]/page.tsx`
- `apps/web/src/components/sections/rubriques/rejoindre-un-formulaire-section.tsx`
- `apps/web/src/app/api/actions/group-join/route.ts`
- `apps/web/src/lib/actions/group-participation.ts`
- **Type fonctionnel** : page de bloc
- **Famille / bloc fonctionnel** : Agir (bloc)
- **Statut** : finalisée
- **Contexte nécessaire** : Compte connecté pour envoyer une demande, affichage public des actions validées ouvertes
- **Objectif utilisateur principal** : Rejoindre une action de groupe déjà validée, consulter sa file publique et suivre les participations.
- **Action principale attendue** : Trouver une action ouverte, envoyer une demande, puis suivre son statut et celui des autres participants.
- **Contrat de participation** : `action_participants` conserve l'état actif, l'origine et la date de jonction.
- **Contrat de clôture** : `groupJoinEnabled` dans `actions.notes` permet de fermer ou rouvrir les inscriptions après publication.
- **Palette attendue** : emerald
- **Scope** : finalisé
- **Terminée** : oui
- **Couleurs actuellement détectées** : emerald — canvas #e8f8ef, halo rgba(34, 197, 94, 0.22)
- **Incohérences de couleurs** : Aucune incohérence de couleur détectée avec la règle actuelle.
- **Risque de conflit avec les couleurs existantes** : moyen : le vert doit rester distinct des panneaux de support et des surfaces techniques.
- **Niveau de surcharge textuelle** : moyen
- **Textes à conserver** :
  - titre de rubrique
  - CTA principal
  - états de participation
  - origine de participation
  - file publique
  - clôture / réouverture
  - validation et erreurs
- **Textes à réduire ou supprimer** :
  - aides répétées
  - cartes descriptives redondantes
  - contextes décoratifs
- **Bulles / cartes / contextes trop nombreux** : La jonction de groupe doit rester lisible et éviter la multiplication des micro-blocs.
- **Composants UI concernés** :
  - Hero
  - breadcrumb de bloc
  - filtres et tri
  - cartes d'actions validées
  - résumé latéral
  - file publique
  - modale de confirmation
  - suivi personnel
  - carte d'aide
  - bandeau d'engagement sécurité
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : faible

## UI cible

- **Breadcrumb** : `Agir > Formulaire de groupe`
- **Hero** : grand bloc vert clair, titre très visible, sous-titre court, badge de contexte, illustration écologique à droite.
- **Barre de recherche** : champ principal suivi de filtres par localisation, période, statut et tri.
- **Liste principale** : cartes d'actions validées avec image, lieu, date, organisateur, badges d'état et CTA principal.
- **Résumé** : colonne latérale avec compteurs synthétiques sur les actions ouvertes, les demandes en attente, les participations confirmées et l'impact estimé.
- **Raccourcis** : accès rapides vers les participations, les demandes envoyées, le rôle d'organisateur et le guide bénévole.
- **Mon suivi** : carte dédiée aux participations de l'utilisateur avec statuts courts et lien de navigation.
- **Aide** : carte secondaire avec renvoi vers le centre d'aide.
- **File publique** : tableau des demandes en attente avec actions d'acceptation et de refus.
- **Confirmation** : modale centrée avant l'envoi d'une demande de participation.
- **Bandeau bas de page** : rappel des engagements de sécurité et de la charte bénévole.

## États à documenter

- **loading** : fond `slate`, skeletons sobres, loader discret, même largeur et mêmes espacements que les autres états.
- **empty state** : fond `slate` doux, ton encourageant, CTA utile unique vers `/actions/new`.
- **error state** : panneau `rose`, message court, bouton `Réessayer`.
- **access refused** : `slate` avec léger `red` / `orange`, ton neutre et professionnel, pas de dramatisation.
- **queue empty** : panneau dédié à la file publique avec message explicite et absence d'actions de traitement.
- **confirmation modal** : état de validation avant envoi, focus piégé, annulation possible avec `Escape`.
- **Architecture commune** : `SectionShell`, `PageHero`, `PageHeroBadge`, `FamilyRubriqueCard`, `CmmButton`.
- **Variantes** : `loading`, `empty`, `error`, `dialog`, `queue-empty`.
- **Règle** : aucune route de ce type ne doit avoir un état vide sans CTA utile.

## Références legacy

- [group-action.md](../../../../../features/group-action.md)

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Le point d'entrée doit rester cohérent avec la rubrique `Rejoindre un formulaire` du bloc `Agir`.
- La page ne liste que les actions approuvées dont `groupJoinEnabled` n'est pas désactivé.
- La file publique des demandes n'apparaît que pour l'action ciblée sélectionnée.
- Le lien avec `actionId` doit conserver la possibilité d'ouvrir directement la file d'une action depuis les cartes d'action et la déclaration.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
