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
- **Objectif utilisateur principal** : Comprendre les deux familles de besoins soutenues, la stratégie de financement et la séparation entre contributions, transparence et indépendance de la modération.
- **Action principale attendue** : Consulter les besoins et les agrégats Stripe nets ; si la configuration est présente, accéder à la cagnotte commune hébergée par OnParticipe.
- **Palette attendue** : rose / pink / fuchsia sur fond réseau sombre
- **Scope réel** : présentation publique des deux catégories et des agrégats nets Stripe confirmés, avec garanties d'indépendance. OnParticipe est un lien direct vers une collecte hébergée séparée ; ses montants ne sont ni importés ni fusionnés avec les agrégats Stripe.
- **Terminée** : oui
- **Captures attendues** : desktop, mobile
- **État du backend Stripe** : `IMPLEMENTED / NOT CURRENTLY EXPOSED` — Checkout, les routes, le webhook, les tables/RPC, les agrégats et les tests backend sont conservés ; la page ne l'appelle pas pour initier un paiement. Le statut et les limites des fournisseurs sont détaillés dans [la stratégie de financement](./funding-presentation-detaillee.md).

## Stratégie de financement — CURRENT et TARGET

- **CURRENT — portage par une personne physique** : CleanMyMap est actuellement porté par une personne physique. OnParticipe est la voie de collecte externe prévue : [cagnotte CleanMyMap](https://www.onparticipe.fr/c/PUI9aOsy). Le parcours s'active uniquement si `FUNDING_ONPARTICIPE_URL` contient l'URL HTTPS réelle. Aucune intégration API n'est supposée ni à créer.
- L'URL applicative optionnelle `FUNDING_ONPARTICIPE_URL` active les CTA seulement lorsqu'elle contient l'URL HTTPS réelle de la cagnotte. Absente ou vide, chaque carte conserve un bouton désactivé `Non disponible` / `Unavailable`.
- Les deux cartes présentent des familles de besoins et utilisent la même cagnotte OnParticipe commune : cliquer sur un bouton ne choisit pas une catégorie. CleanMyMap ne transmet aucun montant, catégorie ou donnée de contributeur, et ne garantit aucune affectation par catégorie. Aucun total OnParticipe n'est affiché.
- **Stripe — `IMPLEMENTED / NOT CURRENTLY EXPOSED`** : conserver Checkout backend, webhook, RPC/tables, agrégats et tests backend. Stripe n'est pas proposé par l'UI funding et le parcours OnParticipe ne bascule jamais vers Stripe. Sa part fixe pèse davantage sur 1 € ; Stripe peut convenir à d'autres paiements ou montants plus élevés. Les tarifs dépendent du fournisseur et doivent être vérifiés au moment d'une décision opérationnelle.
- **TARGET — HelloAsso via association partenaire** : aucune association porteuse n'est actuellement configurée. L'activation exige une association réelle et consentante, une campagne créée sous son compte, sa vérification par HelloAsso, un RIB au nom de l'association et un accord explicite d'affectation des fonds au projet CleanMyMap. L'association peut ajouter un administrateur de campagne CleanMyMap avec les droits adaptés. Les fonds restent versés à l'association. Aucun runtime HelloAsso ne doit être créé avant réunion des conditions et décision distincte.
- Les états conceptuels HelloAsso `not_available_no_associative_host` et `available_via_associative_host` restent documentaires tant qu'aucun consommateur runtime ne les exige. Une future intégration séparera le nom public de l'association, l'URL réelle de campagne et le statut d'activation ; aucune de ces valeurs n'est inventée ou configurée maintenant.
- Le virement bancaire peut rester une possibilité manuelle à très faible coût ; aucun IBAN ni renseignement bancaire ne doit être versionné dans le dépôt.
- PayPal et Leetchi ne sont pas retenus comme solutions canoniques actuelles.
- **Collecte Stripe** : inactive comme parcours proposé aux utilisateurs ; le backend `IMPLEMENTED / NOT EXPOSED` n'implique pas que la collecte soit active.

Le lien OnParticipe est direct et uniquement activé par la configuration facultative de son URL réelle. Aucun avantage ou traitement fiscal particulier n'est annoncé. Stripe n'est actuellement pas une voie de contribution proposée aux utilisateurs depuis cette page.

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
- **Information juridique** : la page parle de contribution et de soutien volontaire. Les confirmations de paiement attestent uniquement du traitement technique de la transaction ; aucune qualification ou promesse fiscale n'est formulée.
- **Remboursement** : le runtime public ne traite aucun paiement ; lorsque l'URL réelle est configurée, il expose un lien direct vers la collecte externe OnParticipe. Le backend conserve son traitement des remboursements Stripe pour les contributions historiques ; seuls les remboursements effectivement réalisés modifient ensuite l'agrégat via webhook.

## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour le comportement actuel de la page.
- Le backend Stripe reste implémenté, mais n'est pas exposé depuis l'interface publique de financement. Ne pas déclarer la collecte Stripe active.

## Fichiers associés

- [Présentation détaillée](./funding-presentation-detaillee.md)
- [Liste des propositions à traiter](./funding-liste-propositions-a-traiter.md)
- [Objectifs non pertinents](./funding-objectifs-non-pertinents.md)
