# Checklist Performance & Quotas Vercel

Utiliser cette checklist avant chaque PR pour éviter d'introduire une régression de coût ou une surface Vercel trop dynamique.

## Utilisation

- cocher chaque point avant de demander une revue,
- si une case est cochée "oui", vérifier le fichier concerné et estimer l'impact,
- si l'impact est élevé ou incertain, ajouter un test, une borne ou un cache,
- si la modification augmente un quota Vercel de façon volontaire, le documenter dans la PR.

## Vérifications minimales

- [ ] Nouvelle route API ?
  - Vérifier si le handler est réellement nécessaire.
  - Confirmer le runtime, les bornes de pagination et la taille de réponse.
  - Pour une route lourde, documenter l'effet attendu sur `Invocations` et `Fast Origin Transfer`.

- [ ] Nouvelle page dynamique ?
  - Vérifier l'usage de `force-dynamic`, `revalidate = 0` et des fetchs `no-store`.
  - Éviter de rendre dynamique une page qui peut rester partiellement statique.
  - Si la page reste dynamique, expliquer pourquoi le cache n'est pas possible.

- [ ] Nouveau middleware ?
  - Vérifier que la logique ne s'exécute pas sur des routes inutiles.
  - Confirmer que le middleware n'ajoute pas de calcul, de fetch ou de parsing coûteux sur chaque requête.
  - Préférer une protection ciblée au lieu d'un traitement global.

- [ ] Nouvelle requête Supabase ?
  - Vérifier que la requête est bornée, paginée ou agrégée.
  - Éviter les `select("*")` et les scans inutiles.
  - Vérifier l'impact sur la latence, les lectures et le transfert.
  - Garder en tête le tri CleanMyMap: prioriser les lectures non filtrées, les lectures sans `limit`, les sur-sélections de colonnes, les accès répétés inutiles et les usages critiques sur `profiles`, `participants`, `map`, `actions` et `notifications`.
  - Appliquer la hiérarchie d'audit: `profiles` d'abord, puis `event_rsvps` et `action_participants`, puis `spots`, `trash_spotter_spots` et `community_events`, et `actions` seulement en contrôle final.

- [ ] Nouvelle donnée persistée ?
  - Dire explicitement où la donnée vit: Git, `localStorage`, Supabase ou fichier.
  - Compter les écritures attendues et refuser les écritures à chaque frappe si une soumission finale suffit.
  - Compter les lectures attendues et refuser de charger toute une table pour un simple compteur.
  - Préciser la borne, le cache ou l'agrégat qui limite la consommation.
  - Si la donnée est pédagogique, vérifier qu'elle ne devrait pas rester dans Git plutôt qu'en base.
  - Pour chaque nouvelle fonctionnalité, exiger la réponse à: où les données sont stockées, combien on écrit, combien on lit, comment c'est borné, et pourquoi Supabase est justifié ou non.

- [ ] Nouveau polling ?
  - Vérifier la fréquence et la durée de vie du polling.
  - Confirmer qu'un cache, un `revalidate`, un SSE ou un push n'est pas plus adapté.
  - S'assurer que le polling ne déclenche pas plusieurs requêtes en cascade.

- [ ] Nouveau salon de discussion ?
  - Vérifier d'abord si un lien externe vers Discord, WhatsApp, Signal, Mattermost, Matrix ou un formulaire de contact suffit pour la première version.
  - Si Supabase est quand même utilisé, documenter clairement les lectures, les écritures, la modération, le spam, les notifications et la rétention.
  - Refuser tout chat Supabase non borné ou non justifié.

- [ ] Nouveau composant Leaflet ?
  - Vérifier que le chargement reste côté client si nécessaire, avec `next/dynamic` et `ssr: false`.
  - Éviter de multiplier les couches, les marqueurs et les re-renders coûteux.
  - Si la carte n'est pas visible au premier écran, la charger seulement quand elle entre dans le viewport utile.
  - Tester le coût sur la page réelle, pas seulement dans l'abstrait.
  - Traiter la cartographie comme une zone à risque: ne jamais charger toute la table `spots`, `actions`, `trash_spotter_spots` ou `community_events`, seulement la zone visible avec une limite et des filtres, éventuellement des clusters ou des couches simplifiées.

- [ ] Nouveau fetch serveur ?
  - Vérifier si la donnée peut être servie par cache, props serveur ou une route plus stable.
  - Identifier si le fetch parle à une API externe ou à l'origine Vercel.
  - Encadrer les réponses volumineuses.

- [ ] Nouvelle image distante ou média généré ?
  - Vérifier si `next/image` déclenche une optimisation serveur inutile.
  - Préférer des fichiers compressés avant upload et des tailles déjà préparées.
  - Utiliser `unoptimized` si l'image est déjà optimisée, si la source est distante, ou si le flux doit rester gratuit.
  - Ne pas compter sur un resize à la volée pour un usage courant.

- [ ] Nouveau PDF ou export ?
  - Vérifier la taille de sortie et la fréquence d'usage.
  - Confirmer que l'accès est restreint si le livrable est lourd ou sensible.
  - Documenter l'effet sur `Fast Data Transfer` et `Invocations`.

- [ ] Nouvelle dépendance lourde ?
  - Vérifier le poids du bundle, le coût d'hydratation et l'impact sur les pages concernées.
  - Éviter d'ajouter une librairie lourde pour un besoin localisable.
  - Si la dépendance est nécessaire, mesurer son impact avant merge.

- [ ] Nouvelle page très interactive ou lourde ?
  - Vérifier si la page doit vraiment être un client component.
  - Si la page mélange contenu et widgets lourds, extraire les widgets dans un wrapper `dynamic` côté client.
  - Pour une page de lecture, préférer un serveur component avec un tracker client minimal.
  - Relire [Découpage du bundle client et frontière serveur](./client-server-bundle-splitting.md) avant de valider.

## Signaux d'alerte

- une page devient dynamique sans raison métier claire,
- un export admin est accessible sans borne ou sans contrôle d'accès,
- un polling client remplace un cache serveur sans gain visible,
- un composant Leaflet ou graphique ajoute plusieurs fetchs au montage,
- une route nouvelle retourne beaucoup plus de données que nécessaire,
- une dépendance ajoutée augmente nettement le bundle principal.
- une feature ne dit pas où la donnée vit ni combien elle écrit ou lit,
- une feature persiste des brouillons alors qu'une soumission unique suffit,
- un tableau de bord lit des micro-événements alors qu'un agrégat est disponible.
- une optimisation Supabase cherche à faire disparaître tous les `high` au lieu de corriger les vrais points de volume.
- une requête `high` ou `critical` reste non bornée, non filtrée, ou filtrée côté React après chargement complet.
- des contenus pédagogiques ou des pages "apprendre" ont été déplacés hors du dépôt alors qu'ils devraient rester dans Git.
- une carte charge toute une table au lieu de limiter à la zone visible avec filtres et éventuels clusters.
- une feature de chat est construite dans Supabase alors qu'un lien externe ou un formulaire de contact suffisait pour démarrer.
- une image distante passe par `next/image` alors qu'un rendu non optimisé ou un asset préparé à l'avance suffirait.
- un tracker analytics ou PostHog part avant le consentement explicite.
- une carte Leaflet est chargée alors qu'elle n'est pas encore visible à l'écran.

## Validation recommandée

- relire [Gouvernance des quotas Vercel](./vercel-quota-governance.md),
- relire [Playbook anti-régression Vercel](./vercel-anti-regression-playbook.md),
- relire [Découpage du bundle client et frontière serveur](./client-server-bundle-splitting.md),
- exécuter `npm run audit:vercel-quota`,
- exécuter les tests ciblés du fichier touché,
- compléter la section impact dans la PR.
