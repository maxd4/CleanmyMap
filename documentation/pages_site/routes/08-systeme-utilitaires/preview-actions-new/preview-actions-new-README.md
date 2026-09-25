# Prévisualisation QA du formulaire canonique

## Fiche canonique

- **Route** : `/preview/actions/new`
- **Fichier(s) source(s)** :
- `apps/web/src/app/preview/actions/new/page.tsx`
- **Type fonctionnel** : outil QA
- **Famille / bloc fonctionnel** : Système & Utilitaires (hors bloc)
- **Statut** : QA uniquement
- **Contrat SEO** : `ACCESS=PUBLIC`, `SEARCH=NOINDEX`, `DISCOVERY=INTERNAL_ONLY`, `CANONICAL=NONE`. La prévisualisation est publique pour la revue du formulaire, mais n'est pas une page métier indexable.
- **Contexte nécessaire** : Accès direct à une route de revue publique ; la page est explicitement sans protection Clerk et non indexable.
- **Objectif utilisateur principal** : Vérifier le rendu et le comportement du formulaire canonique dans un contexte isolé.
- **Action principale attendue** : Parcourir la revue QA sans présenter cette surface comme un second parcours de création.
- **Palette attendue** : emerald / slate
- **Scope** : outil de revue du formulaire canonique avec utilisateur de prévisualisation local, sans flux de création métier ni persistance réelle.
- **Terminée** : oui pour le périmètre actuellement livré
- **Couleurs actuellement détectées** : emerald / slate — en-tête et contrôles de la prévisualisation.
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
