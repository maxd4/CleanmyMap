# Comparaison de formulaires

## Fiche canonique

- **Route** : `/form-comparison`
- **Fichier(s) source(s)** :
- `apps/web/src/app/form-comparison/page.tsx`
- **Type fonctionnel** : outil
- **Famille / bloc fonctionnel** : Système & Utilitaires (hors bloc)
- **Statut** : standalone
- **Contexte nécessaire** : Accès direct depuis le shell ou un outil interne
- **Objectif utilisateur principal** : Comparer visuellement et fonctionnellement le formulaire complet et le formulaire simplifié.
- **Action principale attendue** : Examiner les deux versions puis ouvrir le formulaire à tester.
- **Palette attendue** : sky / slate
- **Scope** : comparaison interne des deux présentations du formulaire, mesures de gain affichées et liens de test vers `/actions/new`.
- **Terminée** : oui pour le périmètre actuellement livré
- **Couleurs actuellement détectées** : sky / slate — fond radial cyan clair, en-tête sky et cartes neutres.
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
