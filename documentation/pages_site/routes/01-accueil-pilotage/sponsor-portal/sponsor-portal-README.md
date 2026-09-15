# Portail décideur

## Fiche canonique

- **Route** : `/sponsor-portal`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/sponsor-portal/page.tsx`
- **Type fonctionnel** : page de bloc
- **Famille / bloc fonctionnel** : Accueil & Pilotage (bloc)
- **Statut** : protégé
- **Contexte nécessaire** : Compte connecté, parfois rôle ou profil spécifique
- **Complétion du compte** : Un profil incomplet affiche un rappel non bloquant ; l'accès reste soumis à l'AuthN/AuthZ propre au portail.
- **Objectif utilisateur principal** : Lire la valeur territoriale consolidée de la mobilisation citoyenne, les priorités de zones et les repères méthodologiques.
- **Action principale attendue** : Consulter les KPI ROI, ouvrir les rapports et lire la méthodologie associée.
- **Palette attendue** : amber / brun
- **Scope** : portail protégé de lecture sponsor sur 730 jours, avec KPI d'impact, zones prioritaires, rapports, méthodologie et complétion de compte non bloquante.
- **Terminée** : non
- **Couleurs actuellement détectées** : pilotage — canvas #f1d5b0, halo rgba(180, 83, 9, 0.24)
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
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : faible


## États à documenter

- **loading** : fond `slate`, skeletons sobres, loader discret, même largeur et mêmes espacements que les autres états.
- **empty state** : fond `slate` doux, ton encourageant, CTA utile unique.
- **access refused** : `slate` avec léger `red` / `orange`, ton neutre et professionnel, pas de dramatisation.
- **Architecture commune** : `SystemStateLayout`, `SystemStateIcon`, `SystemStateTitle`, `SystemStateDescription`, `SystemStateAction`, `SystemStateMeta`.
- **Variantes** : `variant="loading"`, `variant="empty"`, `variant="forbidden"`.
- **Règle** : aucune route de ce type ne doit avoir un état vide sans CTA utile.

## Frontière d'accès et de rendu

- La page est dynamique et protégée : elle ne doit pas être pré-rendue avec des données sponsor ou de pilotage privilégiées.
- `getSafeAuthSession()` est résolu avant toute lecture de pilotage ; un utilisateur non authentifié reçoit immédiatement l'état de connexion requis.
- `AccountCompletionGate` affiche au besoin un rappel non bloquant ; il ne remplace pas la page et n'est pas une preuve d'AuthZ.
- L'overview sponsor est chargé après le contrôle de session et des permissions propres à la surface.
- Les données sponsor ne sont chargées qu'après validation de l'accès serveur ; leur indisponibilité produit un état partiel contrôlé.



## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
