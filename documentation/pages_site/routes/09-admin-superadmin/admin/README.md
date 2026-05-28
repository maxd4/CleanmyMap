# Administration du site

## Fiche canonique

- **Route** : `/admin`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/admin/page.tsx`
- **Type fonctionnel** : administration
- **Famille / bloc fonctionnel** : Admin & Super-admin (hors bloc)
- **Statut** : technique
- **Contexte nécessaire** : Compte connecté, parfois rôle technique ou de supervision
- **Objectif utilisateur principal** : Piloter les réglages avancés, la modération et la supervision du site.
- **Action principale attendue** : Consulter un panneau d'administration ou agir sur une ressource du site.
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
- **Bulles / cartes / contextes trop nombreux** : Les vues d'administration concentrent des panneaux, tables et actions à forte densité.
- **Composants UI concernés** :
- Dashboards admin
- tables
- actions de gestion
- tabs
- panneaux de contrôle
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : moyenne




## Références legacy

- [admin.md](../../../../6-PAGES-STANDALONE/admin.md)

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- La page est exposée depuis le bloc 01 pour les profils autorisés, mais son audit canonique reste dans la famille technique.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
