# Profil détaillé

## Fiche canonique

- **Route** : `/profil/[profile]`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/profil/[profile]/page.tsx`
- **Type fonctionnel** : dynamique — profil
- **Famille / bloc fonctionnel** : Accueil & Pilotage (bloc)
- **Statut** : dynamique
- **Contexte nécessaire** : Paramètre de route requis (profil, id, section, mission...)
- **Objectif utilisateur principal** : Donner un accès rapide aux vues de synthèse, au pilotage et aux pages de lecture principale.
- **Action principale attendue** : Consulter l'état du compte ou arbitrer une action.
- **Palette attendue** : amber / orange
- **Scope** : à corriger
- **Terminée** : non
- **Couleurs actuellement détectées** : amber — canvas #fff2df, halo rgba(249, 115, 22, 0.26)
- **Incohérences de couleurs** : Aucune incohérence de couleur détectée avec la règle actuelle.
- **Risque de conflit avec les couleurs existantes** : moyen : la frontière rouge doit rester nette pour éviter la confusion avec les blocs d'impact et d'alerte.
- **Niveau de surcharge textuelle** : moyen
- **Textes à conserver** :
- Titre de page
- cartes métriques
- CTA de navigation
- indicateurs prioritaires
- **Textes à réduire ou supprimer** :
- Rappels redondants
- badges de contexte répétés
- blocs d'aide trop verbeux
- **Bulles / cartes / contextes trop nombreux** : Le bloc mélange des cartes de lecture et des CTA, la densité doit rester maîtrisée.
- **Composants UI concernés** :
- Titre
- cards métriques
- CTA
- nav secondaire
- sidebar / ribbon
- **Captures attendues** : desktop, mobile, état paramétré
- **Priorité de correction** : moyenne
- **Exemple canonique** : `/profil/benevole`

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
