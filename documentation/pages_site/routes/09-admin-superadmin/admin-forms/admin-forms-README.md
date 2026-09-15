# Administration des formulaires

## Fiche canonique

- **Route** : `/admin/forms`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/admin/forms/page.tsx`
- `apps/web/src/components/admin/enhanced-admin.tsx`
- **Type fonctionnel** : administration
- **Famille / bloc fonctionnel** : Admin & Super-admin (hors bloc)
- **Statut** : technique
- **Contexte nécessaire** : Compte connecté via le proxy ; cette page ne vérifie pas elle-même un rôle métier supplémentaire.
- **Objectif utilisateur principal** : Consulter et ajuster les réglages locaux de simplification de formulaire, les feature flags et les analytics de formulaire du navigateur.
- **Action principale attendue** : Modifier la répartition du trafic, activer/désactiver un flag local ou vider les analytics locales.
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

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
