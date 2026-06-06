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

- [ ] Nouveau polling ?
  - Vérifier la fréquence et la durée de vie du polling.
  - Confirmer qu'un cache, un `revalidate`, un SSE ou un push n'est pas plus adapté.
  - S'assurer que le polling ne déclenche pas plusieurs requêtes en cascade.

- [ ] Nouveau composant Leaflet ?
  - Vérifier que le chargement reste côté client si nécessaire, avec `next/dynamic` et `ssr: false`.
  - Éviter de multiplier les couches, les marqueurs et les re-renders coûteux.
  - Tester le coût sur la page réelle, pas seulement dans l'abstrait.

- [ ] Nouveau fetch serveur ?
  - Vérifier si la donnée peut être servie par cache, props serveur ou une route plus stable.
  - Identifier si le fetch parle à une API externe ou à l'origine Vercel.
  - Encadrer les réponses volumineuses.

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

## Validation recommandée

- relire [Gouvernance des quotas Vercel](./vercel-quota-governance.md),
- relire [Découpage du bundle client et frontière serveur](./client-server-bundle-splitting.md),
- exécuter `npm run audit:vercel-quota`,
- exécuter les tests ciblés du fichier touché,
- compléter la section impact dans la PR.
