# Administration avancée

## Fiche canonique

- **Route** : `/admin/godmode`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/admin/godmode/page.tsx`
- **Type fonctionnel** : administration
- **Famille / bloc fonctionnel** : Admin & Super-admin (hors bloc)
- **Statut** : technique
- **Contexte nécessaire** : Compte connecté, profil `max` uniquement
- **Objectif utilisateur principal** : Accéder à la sous-partie cachée de l'administration pour les arbitrages sensibles.
- **Action principale attendue** : Consulter la console avancée ou agir sur une ressource critique.
- **Palette attendue** : amber / brun sombre
- **Scope** : à corriger
- **Terminée** : non
- **Couleurs actuellement détectées** : admin — canvas #15111d, halo rgba(245, 158, 11, 0.20)
- **Incohérences de couleurs** : Aucune incohérence de couleur détectée avec la règle actuelle.
- **Risque de conflit avec les couleurs existantes** : moyen à élevé : la palette doit rester technique et ne pas ressembler au pilotage.
- **Niveau de surcharge textuelle** : fort
- **Textes à conserver** :
- Accès de rôle
- tableaux
- actions critiques
- indicateurs de supervision
- **Textes à réduire ou supprimer** :
- Bannières techniques
- rappels de contexte
- textes non essentiels
- **Bulles / cartes / contextes trop nombreux** : Les vues d'administration concentrent des panneaux, tables et actions à forte densité. Cette sous-partie doit rester plus discrète que la page `/admin`.
- **Composants UI concernés** :
- Dashboards admin
- tables
- actions de gestion
- tabs
- panneaux de contrôle
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : moyenne




## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la sous-partie cachée `/admin/godmode`.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
