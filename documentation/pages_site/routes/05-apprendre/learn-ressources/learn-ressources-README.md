# Apprendre - Ressources - Surface intégrée

## Fiche intégrée

- **Route** : aucune
- **Fichier(s) source(s)** :
  - `apps/web/src/components/learn/learn-ressources-client.tsx`
  - `apps/web/src/components/learn/learn-deferred-panels.tsx`
- **Type fonctionnel** : surface intégrée
- **Famille / bloc fonctionnel** : Apprendre (bloc)
- **Statut** : intégré
- **Contexte nécessaire** : Aucun
- **Objectif utilisateur principal** : Rassembler des ressources utiles sans créer de route autonome.
- **Action principale attendue** : Lire un contenu ou ouvrir une ressource.
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
- ressources
- CTA d'apprentissage
- **Textes à réduire ou supprimer** :
- Paragraphes introductifs trop longs
- double explication
- bulle d'orientation inutile
- **Bulles / cartes / contextes trop nombreux** : Le contenu pédagogique peut rapidement s'alourdir si l'on empile des encarts d'aide.
- **Composants UI concernés** :
- Cards pédagogiques
- chapitres
- ressources
- CTA
- navigation secondaire
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : moyenne

## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche documente une surface intégrée, pas une route autonome.
- Les ressources sont intégrées à `bonnes-pratiques` et aux panneaux différés du bloc.
