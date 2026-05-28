# Profil

## Fiche canonique

- **Route** : `/profil`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/profil/page.tsx`
- **Type fonctionnel** : redirection / alias
- **Famille / bloc fonctionnel** : Accueil & Pilotage (bloc)
- **Statut** : redirection
- **Contexte nécessaire** : Compte connecté, parfois rôle ou profil spécifique
- **Objectif utilisateur principal** : Conserver la compatibilité des liens historiques vers l'espace personnel centralisé.
- **Action principale attendue** : Rediriger vers `/dashboard`.
- **Palette attendue** : amber / orange
- **Scope** : hors scope
- **Terminée** : oui
- **Couleurs actuellement détectées** : aucune UI autonome, alias vers le tableau de bord fusionné.
- **Incohérences de couleurs** : aucune, la route ne rend plus de surface autonome.
- **Risque de conflit avec les couleurs existantes** : faible : la route ne doit plus porter de layout propre.
- **Niveau de surcharge textuelle** : faible
- **Textes à conserver** :
- Message de compatibilité
- redirection
- **Textes à réduire ou supprimer** :
- Tout texte de présentation autonome
- toute promesse fonctionnelle distincte du tableau de bord
- **Bulles / cartes / contextes trop nombreux** : Aucun, car la route est un alias technique.
- **Composants UI concernés** :
- redirection
- **Captures attendues** : aucune
- **Priorité de correction** : faible

## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche documente uniquement l'alias de compatibilité vers `/dashboard`.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
