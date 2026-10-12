# Découverte SPOGOMI

## Fiche canonique

- **Route** : `/spogomi`
- **Source** : `apps/web/src/app/(app)/spogomi/page.tsx`
- **Type fonctionnel** : découverte publique
- **Famille / bloc fonctionnel** : Agir
- **Statut** : CURRENT — lot 3
- **Accès / SEO** : `public-visible` ; indexable seulement pour le contenu réellement rendu ; aucun brouillon n'est chargé
- **Données** : modes Casual et World Cup, événements dont `public_visibility = published`, états temporels calculés depuis leurs dates réelles
- **État vide** : les événements privés, incomplets ou annulés restent absents et un état vide explicite est rendu
- **Limites** : aucun roster nominatif, classement, résultat ou score fictif

Le contrat métier est [`documentation/features/spogomi.md`](../../../../features/spogomi.md).
