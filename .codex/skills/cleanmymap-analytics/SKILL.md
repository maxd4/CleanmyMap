---
name: cleanmymap-analytics
description: "PostHog, analytics, consentement, funnels et métriques produit CleanMyMap, avec confidentialité et définition des événements."
category: repository
risk: medium
source: local
tags: "[analytics]"
---

# Analytics, consentement et métriques produit

## Déclenchement

Activer pour PostHog, événements analytics, funnel, tracking de navigation, métadonnées de campagne, consentement, KPI produit ou instrumentation.

## Sources

- `apps/web/src/lib/analytics/sanitize-analytics-payload.ts`, `apps/web/src/lib/posthog/client.ts`, `apps/web/src/lib/analytics/funnel-client.ts` et l'API funnel : vérifier leur présence/consommateurs sur `main`.
- `apps/web/src/lib/analytics-consent.ts`, documentation `security/`, `legal/`, `architecture/data-governance.md` et consommateurs mobiles si impact partagé.

## Procédure

1. Définir la question produit que la mesure doit répondre, l'événement canonique, son déclencheur et sa granularité ; éviter le tracking sans décision exploitable.
2. Vérifier consentement valide **avant émission et persistance**, notamment après chargement asynchrone du SDK ; prévoir absence et révocation.
3. Établir une allowlist de propriétés. Ne jamais émettre coordonnées précises, ID personnel arbitraire, token, valeur de formulaire, URL/referrer complet ni contenu privé.
4. Normaliser les routes dynamiques et vérifier les propriétés automatiques du SDK ainsi que l'API d'ingestion ; un filtre navigateur seul est insuffisant.
5. Définir déduplication/session, définition du numérateur/dénominateur, période, exclusions et événements tardifs ; ne pas confondre nombre d'événements et nombre d'utilisateurs.

## Validation

Scénarios sans consentement, consentement révoqué, route dynamique secrète, événement valide, double émission, donnée malformée et ingestion serveur. Distinguer simulation, requête réseau effectivement interceptée et état PostHog distant réellement observé.
