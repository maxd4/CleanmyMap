# Contrôles à Faire Avant Merge

Utiliser cette page comme checklist commune pour les humains et les agents IA.

## 1. Routes publiques vs privées

- Vérifier que les routes sensibles figurent dans `src/lib/auth/protected-routes.ts`.
- Vérifier que les routes privées ne sont pas exposées dans `src/lib/seo/indexability.ts`.
- Vérifier qu'aucune nouvelle route interne n'est indexable par erreur.
- Vérifier que les pages `admin`, `dashboard`, `partners/dashboard`, `admin/services` et l'espace créateur passent par une garde Clerk côté serveur.
- Vérifier que les routes API sensibles (`/api/admin/*`, `/api/actions/*`, `/api/community/*`, `/api/chat/*`, `/api/analytics/*`, `/api/send`, `/api/services`) sont bloquées côté serveur, pas seulement masquées dans l'interface.

## 2. Robots / sitemap / noindex

- Les pages internes doivent avoir `robots.index = false`.
- Les routes publiques indexables doivent rester dans `sitemap.ts`.
- Les routes privées ne doivent pas être ajoutées au sitemap.

## 3. Validation d'URL

- Utiliser `new URL()` ou `src/lib/security/validation.ts`.
- Refuser les hôtes placeholders (`example.com`, `localhost`, `127.0.0.1`, `::1`).
- Ne pas valider une URL avec `startsWith("http")`, `includes("http")` ou `indexOf("http")`.

## 4. Regex à risque

- Interdire les quantificateurs imbriqués.
- Limiter la longueur avant toute validation regex.
- Préférer le parsing explicite quand c'est possible.
- Ordonner les alternatives de la plus longue à la plus courte.

## 5. Rate limiting et anti-spam

- Les formulaires publics doivent utiliser `createPublicRateLimitResponse()`.
- Les garde-fous `honeypot` et `submittedAt` doivent être testés de façon déterministe.
- Les réponses 429 doivent garder la même structure: `error`, `kind`, `status`.
- Les formulaires publics ne doivent jamais écrire directement en base sans validation serveur stricte.

## 6. Secrets et variables d'environnement

- Lancer `npm run security:secrets`.
- Ne jamais ajouter de clé, token ou DSN en clair dans le repo.
- Documenter toute nouvelle variable d'environnement serveur ou client.
- Les clés privées ne doivent jamais arriver dans le frontend.
- Resend doit rester côté serveur uniquement.
- Sentry, PostHog et Vercel Analytics doivent rester conditionnés par la configuration prévue.

## 7. GitHub Actions

- Garder des permissions minimales par job.
- Séparer les jobs rapides des jobs sécurité.
- Les changements Dependabot qui touchent l'auth, les secrets, la CI ou le routage doivent passer en revue renforcée.
- Les protections bot/rate limiting doivent rester actives sur les surfaces publiques exposées.

## 8. Vérification finale

- Aucun placeholder ou `TODO` bloquant.
- Aucun test de sécurité désactivé.
- Les tests ciblés passent.
- Les workflows référencent bien les nouveaux tests ou scripts.
- Les pages de test ou brouillons ne doivent pas réapparaître dans la navigation publique ni dans le sitemap.

## 9. Performance / Quotas Vercel

- Une nouvelle route API doit avoir un besoin clair et des bornes explicites.
- Une nouvelle page dynamique doit justifier l'absence de cache.
- Un nouveau middleware doit rester léger et ciblé.
- Une nouvelle requête Supabase doit être bornée et relue pour son coût.
- Un nouveau polling doit être justifié face à un cache ou à une alternative moins coûteuse.
- Un nouveau composant Leaflet doit être chargé seulement là où il apporte un gain réel.
- Un nouveau fetch serveur doit expliquer son impact sur l'origine et le transfert.
- Un nouveau PDF ou export doit être borné, protégé et mesuré.
- Une nouvelle dépendance lourde doit être justifiée par le besoin métier et le bundle.
- Si le changement augmente un quota Vercel volontairement, la PR doit l'indiquer explicitement.
