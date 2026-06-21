# Apprendre - Point de départ - Surface intégrée

## Fiche intégrée

- **Route** : aucune
- **Fichier(s) source(s)** :
  - `apps/web/src/components/learn/learn-block-journey-section.tsx`
  - `apps/web/src/components/learn/learn-page-visit-tracker.tsx`
- **Type fonctionnel** : surface intégrée
- **Famille / bloc fonctionnel** : Apprendre (bloc)
- **Statut** : intégré
- **Contexte nécessaire** : Aucun
- **Objectif utilisateur principal** : Fournir des repères d'orientation au sein du bloc.
- **Action principale attendue** : Lire un repère ou passer à la page suivante.
- **Palette attendue** : yellow
- **Scope** : intégré
- **Terminée** : oui
- **Couleurs actuellement détectées** : yellow — canvas #fef9c3, halo rgba(234, 179, 8, 0.30)
- **Incohérences de couleurs** : Aucune incohérence de couleur détectée avec la règle actuelle.
- **Risque de conflit avec les couleurs existantes** : faible à moyen : le jaune doit rester lisible sans devenir pâle sur fond clair.
- **Niveau de surcharge textuelle** : fort
- **Textes à conserver** :
- Titre de module
- résumés
- repères de parcours
- CTA d'apprentissage
- **Textes à réduire ou supprimer** :
- Paragraphes introductifs trop longs
- double explication
- bulle d'orientation inutile
- **Bulles / cartes / contextes trop nombreux** : Le contenu pédagogique peut rapidement s'alourdir si l'on empile des encarts d'aide.
- **Composants UI concernés** :
- Cards pédagogiques
- chapitres
- repères de navigation
- CTA
- navigation secondaire
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : moyenne

## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche documente une surface intégrée, pas une route autonome.
- Les repères d'orientation sont répartis dans les trois pages canoniques du bloc `Apprendre`.
