---
name: cleanmymap-analytics
description: "Use this skill when a task touches analytics events, consent, funnels, tracking, or product metrics in CleanMyMap."
category: repository
risk: medium
source: local
tags: "[analytics, posthog, consent, metrics, funnels]"
date_added: "2026-05-24"
---

# CleanMyMap — analytics et consentement

## Activer quand

Une modification concerne PostHog, pageviews, funnels, tracking de navigation, consentement ou mesures produit.

## Sources CURRENT

- `apps/web/src/lib/analytics/sanitize-analytics-payload.ts` : allowlists et normalisation des routes, métadonnées et identifiants de session.
- `apps/web/src/lib/posthog/client.ts` : configuration SDK, filtre `before_send`, capture automatique autorisée et persistance.
- `apps/web/src/lib/analytics/funnel-client.ts` et `apps/web/src/app/api/analytics/funnel/route.ts` : frontière client/API, validation et ingestion.
- `apps/web/src/lib/analytics-consent.ts` et contrôles des mineurs : décision de consentement applicable.
- `documentation/security/README.md`, gouvernance des données et documentation légale pour les obligations transverses.

## Invariants

- Aucun événement, initialisation active ou stockage analytique sans consentement valide ; revérifier le consentement après chargement asynchrone du SDK.
- Les routes dynamiques sont catégorisées : invitation, mission et route inconnue ne contiennent jamais token, UUID, paramètres ni fragment dans l'analytics.
- Pas de PII, coordonnées précises, valeurs de formulaire, URL/referrer libre, identifiant utilisateur ou de session arbitraire dans les propriétés ; vérifier aussi les propriétés automatiques `$pathname`, `$referrer` et campagne.
- Les catégories métiers autorisées et le comptage de funnel restent stables. Le script de normalisation est un owner unique, pas une fonction copiée dans chaque tracker.
- Le filtrage côté client ne remplace pas la validation de l'API ni les restrictions de stockage local. Un test mocké n'est pas une preuve d'émission réseau réelle.

## Validation

Tester séparément consentement absent/révoqué, événements auto/explicites, routes dynamiques, clés privées, déduplication session et ingestion malformée, puis les parcours admissibles positifs. Exécuter les tests ciblés des modules affectés. Ne jamais considérer `capture_pageview` ou le seul `before_send` comme garantie exhaustive de confidentialité.
