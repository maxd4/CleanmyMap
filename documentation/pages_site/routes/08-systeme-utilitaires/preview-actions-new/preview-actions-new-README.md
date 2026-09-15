# Preview déclaration

## Fiche canonique

- **Route** : `/preview/actions/new`
- **Fichier(s) source(s)** :
- `apps/web/src/app/preview/actions/new/page.tsx`
- **Type fonctionnel** : outil
- **Famille / bloc fonctionnel** : Système & Utilitaires (hors bloc)
- **Statut** : standalone
- **Contexte nécessaire** : Accès direct à une route de revue publique ; la page est explicitement sans protection Clerk et non indexable.
- **Objectif utilisateur principal** : Prévisualiser le formulaire public de déclaration dans un contexte local isolé.
- **Action principale attendue** : Parcourir le formulaire de prévisualisation sans présenter cette surface comme une création persistée.
- **Palette attendue** : emerald / slate
- **Scope** : route de revue du formulaire avec utilisateur de prévisualisation local, sans flux de création métier ni persistance réelle.
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
