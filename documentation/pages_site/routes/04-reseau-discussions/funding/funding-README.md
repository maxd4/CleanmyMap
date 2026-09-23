# Soutenir CleanMyMap

## Fiche canonique

- **Route** : `/sections/funding`
- **Fichier(s) source(s)** :
  - `apps/web/src/lib/sections-registry/config.ts`
  - `apps/web/src/app/(app)/sections/[sectionId]/page.tsx`
  - `apps/web/src/components/sections/rubriques/funding-section.tsx`
  - `apps/web/src/app/api/funding/checkout/route.ts` (backend conservé, non appelé par l'UI)
  - `apps/web/src/app/api/funding/aggregate/route.ts`
  - `apps/web/src/app/api/funding/checkout-status/route.ts`
  - `apps/web/src/app/api/stripe/webhook/route.ts`
- **Type fonctionnel** : section de réseau
- **Famille / bloc fonctionnel** : Réseau & Discussions (bloc)
- **Accès runtime** : `public-visible` ; la présentation du modèle économique est consultable sans compte. Les éventuels parcours partenaire ou de financement restent séparés et conservent leurs propres contrôles.
- **Objectif utilisateur principal** : Comprendre les deux affectations de soutien du projet, la stratégie de financement et la séparation entre contributions, transparence et indépendance de la modération.
- **Action principale attendue** : Consulter les deux affectations et les agrégats Stripe nets ; si la configuration est présente, rejoindre directement la collecte externe hébergée OnParticipe.
- **Palette attendue** : rose / pink / fuchsia sur fond réseau sombre
- **Scope réel** : présentation publique des deux catégories et des agrégats nets Stripe confirmés, avec garanties d'indépendance. OnParticipe est un lien direct vers une collecte hébergée séparée ; ses montants ne sont ni importés ni fusionnés avec les agrégats Stripe.
- **Terminée** : oui
- **Captures attendues** : desktop, mobile
- **État du backend Stripe** : `IMPLEMENTED / NOT EXPOSED` — les routes, le webhook, les tables/RPC et la migration sont conservés ; la page ne les appelle pas pour initier un paiement. Le statut et les limites des fournisseurs sont détaillés dans [la stratégie de financement](./funding-presentation-detaillee.md).

## Stratégie de financement — CURRENT

- **OnParticipe** est la solution externe hébergée privilégiée pour les micro-contributions tant que CleanMyMap est porté par une personne physique. Aucune intégration API n'est supposée ni à créer.
- L'URL applicative optionnelle `FUNDING_ONPARTICIPE_URL` active les CTA seulement lorsqu'elle contient l'URL HTTPS réelle de la cagnotte. Absente ou vide, chaque carte conserve un bouton désactivé `Non disponible` / `Unavailable`.
- Le lien OnParticipe navigue directement vers le fournisseur, sans montant, catégorie ni donnée de contributeur transmis depuis CleanMyMap. Aucun total OnParticipe n'est affiché.
- **Stripe** reste une intégration technique existante à conserver. Sa part fixe de frais pèse proportionnellement davantage sur un paiement de 1 € ; Stripe n'est donc pas le choix privilégié pour ces micro-contributions. Il reste utilisable pour d'autres paiements ou des montants plus élevés. Les conditions tarifaires évoluent et doivent être vérifiées auprès du fournisseur avant toute décision opérationnelle.
- **HelloAsso** est une cible conditionnelle à la création d'une structure associative éligible. La disponibilité de son API/Checkout ne justifie aucun runtime CleanMyMap avant cette condition.
- Le virement bancaire peut rester une possibilité manuelle à très faible coût ; aucun IBAN ni renseignement bancaire ne doit être versionné dans le dépôt.
- PayPal et Leetchi ne sont pas retenus comme solutions canoniques actuelles.
- **Collecte Stripe** : inactive comme parcours proposé aux utilisateurs ; le backend `IMPLEMENTED / NOT EXPOSED` n'implique pas que la collecte soit active.

Cette stratégie n'ajoute aucune API fournisseur, aucun proxy ni nouveau parcours de paiement CleanMyMap ; le lien OnParticipe est direct et uniquement activé par la configuration facultative de son URL réelle. Elle ne promet aucun reçu fiscal ni avantage fiscal. Stripe n'est actuellement pas une voie de contribution proposée aux utilisateurs depuis cette page.

## États à documenter

- **loading** : les totaux affichent `Chargement…` pendant la lecture de l'agrégat public.
- **error** : les totaux Stripe indiquent leur indisponibilité et proposent une nouvelle tentative ; l'état du lien OnParticipe reste gouverné séparément par sa configuration.
- **availability** : si l'URL OnParticipe est absente, les deux cartes affichent un bouton désactivé `Non disponible` / `Unavailable`. Si elle est configurée, elles affichent `Soutenir via OnParticipe` / `Support via OnParticipe` et ouvrent la même destination externe sans transmettre montant ou catégorie.
- **cancelled** : un ancien retour Stripe peut encore être affiché comme paiement annulé, sans montant confirmé.
- **success** : une session initiée avant le débranchement peut encore afficher `Paiement reçu par Stripe · confirmation en cours` jusqu'à confirmation backend du webhook.
- **access refused** : non applicable à cette présentation publique.
- **Architecture commune** : `SectionShell`/`PageHeader`, `CmmCard` et `CmmButton` ; famille Réseau & Discussions.
- **Variantes** : français/anglais, mobile/desktop, deux catégories `equipment` et `development`.
- **Règle** : le financement n'accorde aucun pouvoir de modération ; les totaux affichés sont explicitement des totaux nets Stripe confirmés moins les remboursements enregistrés. Ils ne sont pas le total global si des contributions OnParticipe existent et ne contiennent aucune PII.
- **Information juridique** : la page parle de contribution et de soutien volontaire. La confirmation ou le reçu Stripe confirme le traitement du paiement mais n'est pas un reçu fiscal ; aucun avantage fiscal ni mécénat fiscal n'est annoncé.
- **Remboursement** : le runtime public ne propose pas de collecte ni de bouton de paiement. Le backend conserve son traitement des remboursements Stripe pour les contributions historiques ; seuls les remboursements effectivement réalisés modifient ensuite l'agrégat via webhook.

## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour le comportement actuel de la page.
- Le backend Stripe reste implémenté, mais n'est pas exposé depuis l'interface publique de financement. Ne pas déclarer la collecte Stripe active.

## Fichiers associés

- [Présentation détaillée](./funding-presentation-detaillee.md)
- [Liste des propositions à traiter](./funding-liste-propositions-a-traiter.md)
- [Objectifs non pertinents](./funding-objectifs-non-pertinents.md)
