# Déclaration simple

## Fiche canonique

- **Route** : `/declaration-simple`
- **Fichier(s) source(s)** :
- `apps/web/src/app/declaration-simple/page.tsx`
- **Type fonctionnel** : outil
- **Famille / bloc fonctionnel** : Système & Utilitaires (hors bloc)
- **Statut** : standalone
- **Contrat SEO** : `ACCESS=PUBLIC`, `SEARCH=NOINDEX`, `DISCOVERY=INTERNAL_ONLY`, `CANONICAL=NONE`. Cet outil de contrôle reste une surface de support, pas une page de recherche.
- **Contexte nécessaire** : Accès direct à une surface de support publique, sans session métier requise.
- **Objectif utilisateur principal** : Vérifier la présentation et le parcours d'un formulaire de déclaration simplifié sans le confondre avec le formulaire complet.
- **Action principale attendue** : Examiner la version simplifiée puis ouvrir la comparaison ou la prévisualisation du formulaire public.
- **Palette attendue** : emerald / pierre / slate
- **Scope** : page autonome de contrôle du parcours simplifié, avec liens vers `/form-comparison`, `/actions/new` et `/preview/actions/new`.
- **Terminée** : oui pour le périmètre actuellement livré
- **Couleurs actuellement détectées** : emerald / pierre — fond clair, en-tête emerald et cartes neutres.
- **Incohérences de couleurs** : Aucune incohérence de couleur détectée avec le rendu runtime actuel.
- **Risque de conflit avec les couleurs existantes** : moyen : garder une mood layer autonome et éviter tout retour aux couleurs de bloc principales.
- **Niveau de surcharge textuelle** : moyen
- **Textes à conserver** :
- Contrôles
- résultats
- messages système
- CTA utilitaires
- **Textes à réduire ou supprimer** :
- Explications longues
- duplication d'état
- cartes de contexte inutiles
- **Bulles / cartes / contextes trop nombreux** : Les outils peuvent accumuler des états et des micro-interfaces.
- **Composants UI concernés** :
- Outils
- tableaux de bord
- panneaux système
- prévisualisations
- contrôles
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : critique




## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
