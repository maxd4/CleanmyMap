# Parcours

## Fiche canonique

- **Route** : `/parcours`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/parcours/page.tsx`
- **Type fonctionnel** : page d'action
- **Famille / bloc fonctionnel** : Accueil & Pilotage (bloc)
- **Statut** : protégé
- **Contexte nécessaire** : Compte connecté, parfois rôle ou profil spécifique
- **Objectif utilisateur principal** : Orienter le compte connecté vers le parcours correspondant à son rôle actif, tout en présentant un aperçu verrouillé aux visiteurs.
- **Action principale attendue** : Se connecter puis ouvrir le parcours associé au profil actif.
- **Palette attendue** : amber / orange
- **Scope** : entrée de parcours avec aperçu anonyme flouté et redirection authentifiée vers `/parcours/[profile]` selon le rôle actif.
- **Terminée** : non
- **Couleurs actuellement détectées** : amber / orange — aperçu et états de parcours alignés sur l'accent `home`.
- **Incohérences de couleurs** : Aucune incohérence de couleur détectée avec la règle runtime actuelle.
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
