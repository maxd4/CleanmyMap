# Découverte SPOGOMI

## Fiche canonique

- **Route** : `/spogomi`
- **Source** : `apps/web/src/app/(app)/spogomi/page.tsx`
- **Type fonctionnel** : découverte publique
- **Famille / bloc fonctionnel** : Agir
- **Statut** : CURRENT — orientation publique et compétitions publiées
- **Accès / SEO** : `public-visible` ; indexable seulement pour le contenu réellement rendu ; aucun brouillon n'est chargé
- **Parcours** : `PageHeader` conserve un sous-titre court et les deux actions publiques « Voir les compétitions » (`#spogomi-events`) et « Ouvrir le salon SPOGOMI ». Trois onglets accessibles orientent les bénévoles, les arbitres/modérateurs et les organisateurs ; ils ne modifient aucune permission.
- **Actions autorisées** : les bénévoles consultent les compétitions publiées ; un organisateur authentifié peut ouvrir `/dashboard/spogomi`, dont l'autorisation métier reste contrôlée côté serveur ; aucun accès arbitre générique n'est inventé sur cette page, l'habilitation restant liée à une compétition précise.
- **Données** : parcours d'orientation, compétitions dont `public_visibility = published`, distinctions Casual/World Cup, présentation bilingue du mouvement, références officielles vérifiées, actualités éditoriales bornées et agenda externe prévisionnel/confirmé séparé des événements CleanMyMap
- **État vide** : les compétitions privées, incomplètes ou annulées restent absentes et un état vide explicite est rendu
- **Limites** : aucun roster nominatif, classement, résultat ou score fictif ; l'agenda externe n'est pas exhaustif, ne crée pas d'action et ne publie pas de date non sourcée ; CleanMyMap ne revendique ni représentation mondiale ni partenariat officiel

Le contrat métier est [`documentation/features/spogomi.md`](../../../../features/spogomi.md).
