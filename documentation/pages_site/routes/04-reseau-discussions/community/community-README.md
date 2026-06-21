# Communauté

## Fiche canonique

- **Route** : `/sections/community`
- **Fichier(s) source(s)** :
  - `apps/web/src/app/(app)/sections/[sectionId]/page.tsx`
  - `apps/web/src/app/(app)/community/page.tsx` (alias technique)
- **Type fonctionnel** : page de réseau
- **Famille / bloc fonctionnel** : Réseau & Discussions (bloc)
- **Statut** : protégé
- **Contexte nécessaire** : Compte connecté, parfois rôle ou profil spécifique
- **Objectif utilisateur principal** : Faire circuler l'information, faciliter les échanges entre acteurs et accéder au réseau partenaire.
- **Action principale attendue** : Lire, contacter, rejoindre une discussion ou basculer vers l'onglet Partenaires.
- **Palette attendue** : pink
- **Scope** : à corriger
- **Terminée** : non
- **Couleurs actuellement détectées** : slate — canvas #eef0f3, halo rgba(148, 163, 184, 0.18)
- **Incohérences de couleurs** : Écart détecté: attendu pink, code actuel slate / neutral.
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
- **Priorité de correction** : critique


## États à documenter

- **loading** : fond `slate`, skeletons sobres, loader discret, même largeur et mêmes espacements que les autres états.
- **empty state** : fond `slate` doux, ton encourageant, CTA utile unique.
- **access refused** : `slate` avec léger `red` / `orange`, ton neutre et professionnel, pas de dramatisation.
- **Architecture commune** : `SystemStateLayout`, `SystemStateIcon`, `SystemStateTitle`, `SystemStateDescription`, `SystemStateAction`, `SystemStateMeta`.
- **Variantes** : `variant="loading"`, `variant="empty"`, `variant="forbidden"`.
- **Règle** : aucune route de ce type ne doit avoir un état vide sans CTA utile.



## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
- L'onglet Partenaires est intégré à la même page et remplace l'ancienne carte de partenaires autonome.
- `/community` reste un alias de compatibilité vers cette section canonique.

## Fichiers associés

- [Présentation détaillée](./community-presentation-detaillee.md)
- [Liste des propositions à traiter](./community-liste-propositions-a-traiter.md)
- [Objectifs non pertinents](./community-objectifs-non-pertinents.md)
