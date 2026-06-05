# Checklist de revue Supabase

À utiliser en revue de PR dès qu'un changement touche la base, le storage, le realtime, les exports ou l'auth.

## Requêtes

- [ ] la requête est bornée par `limit()` ou `range()` quand elle retourne une liste
- [ ] la requête ne fait pas un `select("*")` inutile
- [ ] les colonnes retournées sont exactement celles consommées par l'UI ou le service
- [ ] les compteurs utilisent `head: true` ou un agrégat dédié
- [ ] les requêtes répétées sont regroupées ou cachées

## RLS et rôles

- [ ] les policies restent permissives uniquement pour les rôles attendus
- [ ] aucun `service_role` n'est ajouté côté client
- [ ] les accès publics restent minimaux et lisibles
- [ ] les fonctions RPC sensibles ont un `search_path` explicite et des permissions limitées

## Storage

- [ ] la taille des uploads est bornée
- [ ] les buckets publics ne permettent pas le listing complet sans besoin métier
- [ ] les exports et nettoyages de bucket restent dans des scripts d'administration
- [ ] aucun téléchargement massif n'a été ajouté sur un parcours utilisateur

## Realtime

- [ ] la subscription est nécessaire
- [ ] le filtre d'événements est le plus restrictif possible
- [ ] la cleanup au démontage est en place
- [ ] le polling de secours n'est pas plus agressif que nécessaire

## Auth

- [ ] aucun nouvel appel Supabase Auth n'a été ajouté sans raison
- [ ] le flux d'identité reste cohérent avec Clerk
- [ ] les rate limits d'auth ne sont pas fragilisés

## Dashboards et exports

- [ ] les pages d'admin ne chargent pas plus de données que nécessaire
- [ ] les exports PDF/CSV sont bornés et isolés
- [ ] les agrégats sont faits côté serveur quand c'est pertinent

## Scripts et maintenance

- [ ] les scripts lourds sont hors parcours utilisateur
- [ ] les scripts qui lisent toute une table ont une limite ou un batch size documenté
- [ ] le script `backend:supabase:quota-audit` a été exécuté ou relu

## Test de non-régression

- [ ] le rapport de risque par table n'a pas introduit de hotspot nouveau ou injustifié
- [ ] les tests liés à la table ou à la route modifiée passent
- [ ] les migrations associées sont cohérentes avec l'usage applicatif

