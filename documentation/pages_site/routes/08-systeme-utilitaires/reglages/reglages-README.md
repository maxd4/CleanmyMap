# Réglages

## Fiche canonique

- **Route** : `/reglages`
- **Fichier(s) source(s)** :
- `apps/web/src/app/reglages/page.tsx`
- **Type fonctionnel** : outil
- **Famille / bloc fonctionnel** : Système & Utilitaires (hors bloc)
- **Statut** : standalone
- **Contexte nécessaire** : Compte connecté ; redirection vers `/sign-in` si la session est absente.
- **Objectif utilisateur principal** : Gérer les préférences personnelles d'affichage, de notifications, de localisation et de compte.
- **Action principale attendue** : Modifier une préférence puis revenir à l'espace personnel si nécessaire.
- **Palette attendue** : sky / slate
- **Scope** : réglages authentifiés avec sections profil/compte, affichage, notifications, localisation et actions rapides ; absence de session redirigée vers `/sign-in`.
- **Terminée** : oui pour le périmètre actuellement livré
- **Couleurs actuellement détectées** : sky / slate — fond clair sky et cartes de réglages neutres.
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

- Cette fiche documente une vraie page protégée, pas un alias technique.
- La redirection vers `/sign-in` ne s'applique qu'aux visiteurs non authentifiés.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
