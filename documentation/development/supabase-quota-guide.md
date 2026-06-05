# Guide développeur Supabase

Objectif: livrer des features sans faire grimper inutilement les quotas Supabase.

## Règles de base

- utiliser le minimum de colonnes nécessaires
- paginer systématiquement les listes métier
- préférer des compteurs `head: true` ou des RPC dédiés pour les dashboards de synthèse
- garder les écritures en lot quand plusieurs lignes sont créées ensemble
- éviter les fetchs déclenchés au montage si la donnée peut être préchargée côté serveur
- réserver `service_role` aux chemins serveur strictement nécessaires

## Ce qu'il faut éviter

- `select("*")` sur les routes de lecture utilisateur quand la réponse est visible en UI
- requêtes sans `limit()` ou `range()` sur les collections qui peuvent grossir
- boucle `await` qui appelle Supabase une ligne après l'autre
- `useEffect(() => { fetch(...) }, [])` quand la page pourrait être rendue avec des props serveur ou un cache
- `storage.list()` sur un bucket entier pour un simple affichage local
- `download()` de masse quand un lien signé ou un aperçu suffit
- subscription Realtime sans seuil clair de désabonnement ou sans filtrage local

## Bonnes pratiques par surface

### Database / PostgREST

- sélectionner les colonnes utiles explicitement
- mettre des bornes sur les listes
- utiliser des index adaptés avant d'augmenter les volumes
- préférer un agrégat côté serveur pour les tableaux de bord

### RPC

- garder les fonctions limitées à un besoin métier précis
- documenter le coût attendu dans le code ou la migration
- éviter les RPC qui remplacent une simple requête paginée

### Storage

- limiter la taille des uploads
- normaliser les formats lourds vers WebP ou AVIF quand c'est possible
- ne pas lister un bucket complet dans une UI
- garder les scripts d'export et de rétention hors des parcours utilisateur

### Auth

- aujourd'hui l'application repose surtout sur Clerk
- ne pas ajouter d'appel Supabase Auth sans besoin explicite
- si un flux `supabase.auth.*` est ajouté, vérifier le coût MAU et les rate limits

### Realtime

- n'activer une subscription que si elle remplace vraiment du polling
- filtrer côté client pour limiter les revalidations
- déconnecter proprement les channels au démontage

### Dashboards et statistiques

- préférer un `count` côté serveur plutôt qu'une lecture complète
- découper les requêtes coûteuses en fonctions réutilisables
- réutiliser `SWR` ou un cache serveur quand la valeur n'a pas besoin d'être fraîche à la seconde

## Checklist avant merge

- [ ] chaque `.select()` a une raison claire
- [ ] aucune liste métier n'est non bornée
- [ ] aucun `select("*")` inutile n'a été ajouté
- [ ] les uploads ont une taille maximale et un bucket cible clair
- [ ] les écrans live ne créent pas une subscription par composant enfant
- [ ] les routes admin lourdes sont commentées et justifiées
- [ ] le script `backend:supabase:quota-audit` ne remonte pas de nouveau hotspot majeur

## Quand accepter un coût élevé

Un coût Supabase plus élevé peut être acceptable si:

- la fonctionnalité est centrale pour l'utilisateur
- la donnée doit être fraîche
- le coût est borné par un limit, un cache ou une fréquence contrôlée
- il existe un dashboard ou une alerte pour surveiller la dérive

## Règle simple

Si une requête sert seulement à afficher un résumé, elle doit être:

1. bornée,
2. paginée ou agrégée,
3. explicitement documentée,
4. couverte par un test ou un audit.

