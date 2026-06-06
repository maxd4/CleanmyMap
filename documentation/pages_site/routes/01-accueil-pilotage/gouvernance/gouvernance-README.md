# Gouvernance

## Fiche canonique

- **Route** : `/sections/elus`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/sections/[sectionId]/page.tsx`
- **Type fonctionnel** : surface secondaire — gouvernance
- **Famille / bloc fonctionnel** : Accueil & Pilotage (bloc)
- **Statut** : protégé
- **Contexte nécessaire** : Compte connecté, parfois rôle ou profil spécifique
- **Objectif utilisateur principal** : Donner un accès direct à la lecture territoriale, aux arbitrages et aux repères de gouvernance.
- **Action principale attendue** : Consulter les priorités et arbitrages de gouvernance.
- **Palette attendue** : amber / brun
- **Scope** : à corriger
- **Terminée** : non
- **Couleurs actuellement détectées** : amber / brun — à vérifier lors d'une capture de référence
- **Incohérences de couleurs** : À compléter.
- **Risque de conflit avec les couleurs existantes** : faible : surface secondaire reliée au même socle décisionnel que `/pilotage`.
- **Niveau de surcharge textuelle** : moyen
- **Textes à conserver** :
- titre de page
- repères de gouvernance
- CTA de bascule vers le pilotage
- **Textes à réduire ou supprimer** :
- doublons de KPI
- rappels trop longs
- explications répétées
- **Bulles / cartes / contextes trop nombreux** : À compléter.
- **Composants UI concernés** :
- titre
- cartes de synthèse
- CTA
- onglets secondaires
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : faible

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

- Cette fiche documente la surface secondaire `/sections/elus`, visible depuis le cluster décisionnel du pilotage.
- La page reste volontairement hors de la navigation principale, mais elle est accessible et doit rester inventoriée.
