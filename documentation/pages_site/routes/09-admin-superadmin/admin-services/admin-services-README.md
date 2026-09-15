# Administration des services

## Fiche canonique

- **Route** : `/admin/services`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/admin/services/page.tsx`
- **Type fonctionnel** : administration
- **Famille / bloc fonctionnel** : Admin & Super-admin (hors bloc)
- **Statut** : technique
- **Contexte nécessaire** : Compte connecté avec accès administrateur effectif ; les autres comptes voient un état d'accès refusé.
- **Objectif utilisateur principal** : Superviser les intégrations, quotas, stockage et rapports internes de gouvernance.
- **Action principale attendue** : Lire l'état des services, les métriques de stockage et le dernier rapport mensuel disponible.
- **Palette attendue** : amber / brun sombre
- **Scope** : cockpit de santé des services avec intégrations Codex, impact, plans gratuits, stockage Supabase et archive de gouvernance mensuelle.
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
