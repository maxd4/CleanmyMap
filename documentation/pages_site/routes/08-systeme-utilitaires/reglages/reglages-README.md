# Réglages

## Fiche canonique

- **Route** : `/reglages`
- **Fichier(s) source(s)** :
- `apps/web/src/app/reglages/page.tsx`
- **Type fonctionnel** : outil
- **Famille / bloc fonctionnel** : Système & Utilitaires (hors bloc)
- **Statut** : standalone
- **Contexte nécessaire** : Compte connecté ; redirection vers `/sign-in` si la session est absente.
- **Objectif utilisateur principal** : Exposer les préférences et réglages du compte.
- **Action principale attendue** : Configurer les préférences personnelles et l'expérience utilisateur.
- **Palette attendue** : slate / gris doux
- **Scope** : à corriger
- **Terminée** : non
- **Couleurs actuellement détectées** : system — canvas #eef6fb, halo rgba(14, 165, 233, 0.18)
- **Incohérences de couleurs** : Écart détecté: attendu slate / gris doux, code actuel sky / slate.
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
