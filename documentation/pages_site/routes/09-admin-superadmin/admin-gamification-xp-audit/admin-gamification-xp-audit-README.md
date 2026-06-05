# Admin & Super-admin - XP Audit

## Fiche canonique

- **Route** : `/admin/gamification/xp-audit`
- **Fichier(s) source(s)** :
- `apps/web/src/app/admin/gamification/xp-audit/page.tsx`
- **Type fonctionnel** : administration
- **Famille / bloc fonctionnel** : Admin & Super-admin (hors bloc)
- **Statut** : technique
- **Contexte nécessaire** : Compte connecté, rôle admin ou supervision
- **Objectif utilisateur principal** : Consulter l'historique technique des variations d'XP.
- **Action principale attendue** : Filtrer, vérifier et auditer les écritures `xp_audit`.
- **Palette attendue** : amber / brun sombre
- **Scope** : à corriger
- **Terminée** : non
- **Couleurs actuellement détectées** : admin — canvas #15111d, halo rgba(245, 158, 11, 0.20)
- **Incohérences de couleurs** : Aucune incohérence de couleur détectée avec la règle actuelle.
- **Risque de conflit avec les couleurs existantes** : moyen à élevé : la palette doit rester technique et ne pas ressembler au pilotage.
- **Niveau de surcharge textuelle** : fort
- **Textes à conserver** :
- Totaux journaliers
- entrées d'audit
- filtres de période
- identifiants utilisateurs
- **Textes à réduire ou supprimer** :
- Bannières techniques
- rappels de contexte
- textes non essentiels
- **Bulles / cartes / contextes trop nombreux** : L'outil concentre des tableaux techniques et doit rester lisible.
- **Composants UI concernés** :
- tableaux
- filtres
- listes d'audit
- panneaux de supervision
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : moyenne

## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
