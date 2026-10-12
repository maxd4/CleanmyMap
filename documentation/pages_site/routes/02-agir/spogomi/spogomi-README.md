# Découverte SPOGOMI

## Fiche canonique

- **Route** : `/spogomi`
- **Source** : `apps/web/src/app/(app)/spogomi/page.tsx`
- **Type fonctionnel** : découverte publique
- **Famille / bloc fonctionnel** : Agir
- **Statut** : CURRENT — lot 10
- **Accès / SEO** : `public-visible` ; indexable seulement pour le contenu réellement rendu ; aucun brouillon n'est chargé
- **Données** : présentation bilingue du mouvement, distinctions Casual/World Cup, références officielles vérifiées, actualités éditoriales bornées, agenda externe prévisionnel/confirmé séparé des événements CleanMyMap, et événements dont `public_visibility = published`
- **État vide** : les événements privés, incomplets ou annulés restent absents et un état vide explicite est rendu
- **Limites** : aucun roster nominatif, classement, résultat ou score fictif ; l'agenda externe n'est pas exhaustif, ne crée pas d'action et ne publie pas de date non sourcée ; CleanMyMap ne revendique ni représentation mondiale ni partenariat officiel

Le contrat métier est [`documentation/features/spogomi.md`](../../../../features/spogomi.md).
