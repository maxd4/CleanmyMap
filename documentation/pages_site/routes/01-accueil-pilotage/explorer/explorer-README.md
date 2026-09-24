# Sommaire

## Fiche canonique

- **Route** : `/explorer`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/explorer/page.tsx`
- **Type fonctionnel** : exception UI — sommaire
- **Famille / bloc fonctionnel** : Accueil & Pilotage (bloc)
- **Statut** : public
- **Contrat SEO** : `ACCESS=PUBLIC`, `SEARCH=INDEX`, `DISCOVERY=SITEMAP`, `CANONICAL=SELF`. Cette surface est une page publique de découverte et de maillage interne.
- **Contexte nécessaire** : Aucun
- **Objectif utilisateur principal** : Donner un accès rapide aux vues de synthèse, au pilotage et aux pages de lecture principale.
- **Action principale attendue** : Consulter l'état du compte ou arbitrer une action.
- **Palette attendue** : yellow
- **Scope** : terminé
- **Terminée** : oui
- **Couleurs actuellement détectées** : yellow — canvas #fef9c3, halo rgba(234, 179, 8, 0.30)
- **Incohérences de couleurs** : Aucune incohérence de couleur détectée avec la règle actuelle.
- **Risque de conflit avec les couleurs existantes** : moyen : la frontière rouge doit rester nette pour éviter la confusion avec les blocs d'impact et d'alerte.
- **Niveau de surcharge textuelle** : réduit
- **Textes à conserver** :
- Titre de page
- cartes métriques
- navigation directe par rubriques
- indicateurs prioritaires
- **Textes à réduire ou supprimer** :
- CTA générique « Ouvrir », supprimé car chaque rubrique est directement cliquable
- Rappels redondants
- badges de contexte répétés
- blocs d'aide trop verbeux
- **Bulles / cartes / contextes trop nombreux** : La grille conserve les cinq familles, avec une densité réduite, des gutters plus visibles et un retour naturel à la ligne selon la largeur.
- **Composants UI concernés** :
- Titre
- cards métriques
- liens directs de rubriques
- nav secondaire
- sidebar / ribbon
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : faible

## Densité et responsive

- Les cartes ont davantage d'espace interne et d'écart entre elles, sans grand vide après la liste.
- Les rubriques sont directement navigables : aucun CTA générique inférieur n'est affiché.
- La grille utilise jusqu'à cinq cartes sur une ligne lorsque la largeur le permet, puis environ deux cartes sur tablette et une carte sur mobile.




## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
