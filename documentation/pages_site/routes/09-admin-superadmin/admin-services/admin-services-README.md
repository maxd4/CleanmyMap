# Administration des services

## Fiche canonique

- **Route** : `/admin/services`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/admin/services/page.tsx`
- **Type fonctionnel** : administration
- **Famille / bloc fonctionnel** : Admin & Super-admin (hors bloc)
- **Statut** : technique
- **Contexte nécessaire** : Compte connecté avec accès administrateur effectif ; les autres comptes voient un état d'accès refusé.
- **Objectif utilisateur principal** : Superviser les intégrations, quotas, stockage, entraînement vision et rapports internes de gouvernance.
- **Action principale attendue** : Lire l'état des services, les métriques de stockage, les métriques descriptives vision et le dernier rapport mensuel disponible.
- **Palette attendue** : amber / brun sombre
- **Scope** : cockpit de santé des services avec intégrations Codex, impact, plans gratuits, stockage Supabase, métriques bornées de `training_examples` et archive de gouvernance mensuelle. La vue vision expose le volume, les états, les erreurs comparables et la dernière version observée ; elle n'invente pas de seuil de suffisance scientifique.
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

## Chargement volontaire des panneaux détaillés

Les alertes et indicateurs minimaux de supervision restent disponibles au
chargement de la page, notamment via le panneau d'état système. Les lectures
détaillées qui ne sont pas nécessaires à cette supervision sont déclenchées
par intention explicite :

- **Codex** : le bouton « Consulter le suivi Codex » monte le journal, ses
  agrégats et son historique. Le formulaire et l'enregistrement restent
  réservés aux contrôles administratifs existants.
- **Stockage** : le bouton « Consulter l'utilisation du stockage » monte la
  lecture Supabase/Vercel, ses graphiques, son historique, ses détails et son
  actualisation manuelle. La proximité du viewport ne déclenche pas cette
  lecture.

Après ouverture, une réduction puis une réouverture réutilise le panneau déjà
monté et son résultat en mémoire ; aucune autorisation serveur n'est déplacée
vers le contrôle d'interface.




## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
