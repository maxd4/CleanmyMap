# Soutenir CleanMyMap

## Fiche canonique

- **Route** : `/sections/funding`
- **Fichier(s) source(s)** :
  - `apps/web/src/lib/sections-registry/config.ts`
  - `apps/web/src/app/(app)/sections/[sectionId]/page.tsx`
  - `apps/web/src/components/sections/rubriques/funding-section.tsx`
  - `apps/web/src/app/api/funding/checkout/route.ts`
  - `apps/web/src/app/api/funding/aggregate/route.ts`
  - `apps/web/src/app/api/funding/checkout-status/route.ts`
  - `apps/web/src/app/api/stripe/webhook/route.ts`
- **Type fonctionnel** : section de réseau
- **Famille / bloc fonctionnel** : Réseau & Discussions (bloc)
- **Accès runtime** : `public-visible` ; la présentation du modèle économique est consultable sans compte. Les éventuels parcours partenaire ou de financement restent séparés et conservent leurs propres contrôles.
- **Objectif utilisateur principal** : Comprendre les deux affectations de soutien du projet, la stratégie de financement et la séparation entre contributions, transparence et indépendance de la modération.
- **Action principale attendue** : Consulter les affectations et la stratégie de soutien ; l'implémentation actuelle propose aussi des CTA Stripe existants pour choisir une catégorie et un montant.
- **Palette attendue** : rose / pink / fuchsia sur fond réseau sombre
- **Scope réel** : page publique présentant deux catégories, agrégats nets confirmés par webhook Stripe, Checkout et garanties d'indépendance ; aucun objectif n'est affiché sans source canonique. Le runtime actuel n'est donc pas une présentation statique.
- **Terminée** : oui
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : maintenance courante — le runtime existant dépend de Stripe et de la migration funding service-only. Cette fiche décrit l'état du code ; la décision fournisseur et ses limites sont détaillées dans [la stratégie de financement](./funding-presentation-detaillee.md).

## Stratégie de financement — CURRENT

- **OnParticipe** est la solution externe hébergée privilégiée pour les micro-contributions tant que CleanMyMap est porté par une personne physique. Aucune intégration API n'est supposée ni à créer.
- **Stripe** reste une intégration technique existante à conserver. Sa part fixe de frais pèse proportionnellement davantage sur un paiement de 1 € ; Stripe n'est donc pas le choix privilégié pour ces micro-contributions. Il reste utilisable pour d'autres paiements ou des montants plus élevés. Les conditions tarifaires évoluent et doivent être vérifiées auprès du fournisseur avant toute décision opérationnelle.
- **HelloAsso** est une cible conditionnelle à la création d'une structure associative éligible. La disponibilité de son API/Checkout ne justifie aucun runtime CleanMyMap avant cette condition.
- Le virement bancaire peut rester une possibilité manuelle à très faible coût ; aucun IBAN ni renseignement bancaire ne doit être versionné dans le dépôt.
- PayPal et Leetchi ne sont pas retenus comme solutions canoniques actuelles.

Cette stratégie ne crée ni lien fournisseur, ni bouton, ni parcours ou route. Elle ne promet aucun reçu fiscal ni avantage fiscal. L'implémentation Stripe déjà présente dans le code est documentée ci-dessous comme état réel, mais son exposition depuis cette page n'est pas alignée avec l'objectif demandé d'une présentation statique sans paiement runtime.

## États à documenter

- **loading** : les totaux affichent `Chargement…` pendant la lecture de l'agrégat public.
- **error** : les totaux indiquent leur indisponibilité et proposent une nouvelle tentative ; les CTA sont désactivés pendant cette erreur.
- **redirecting** : le CTA affiche `Redirection vers Stripe…` jusqu'à la navigation Checkout.
- **cancelled** : retour Stripe affiché comme paiement annulé, sans montant confirmé.
- **success** : retour affiché comme `Paiement reçu par Stripe · confirmation en cours` jusqu'à confirmation backend du webhook.
- **access refused** : non applicable à cette présentation publique.
- **Architecture commune** : `SectionShell`/`PageHeader`, `CmmCard` et `CmmButton` ; famille Réseau & Discussions.
- **Variantes** : français/anglais, mobile/desktop, deux catégories `equipment` et `development`.
- **Règle** : le financement n'accorde aucun pouvoir de modération ; les montants publics proviennent des paiements Stripe confirmés moins les remboursements enregistrés, sans PII.
- **Information juridique** : la page parle de contribution et de soutien volontaire. La confirmation ou le reçu Stripe confirme le traitement du paiement mais n'est pas un reçu fiscal ; aucun avantage fiscal ni mécénat fiscal n'est annoncé.
- **Remboursement** : le runtime ne propose pas de bouton automatisé. Une demande passe par le contact ; seul un remboursement effectivement réalisé dans Stripe modifie ensuite l'agrégat via webhook.

## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour le comportement actuel de la page.
- Le code conserve des CTA et le parcours Checkout Stripe ; la décision de financement externe n'est pas encore reflétée dans ce runtime. Ne pas présenter la page comme statique tant que ce code existe.

## Fichiers associés

- [Présentation détaillée](./funding-presentation-detaillee.md)
- [Liste des propositions à traiter](./funding-liste-propositions-a-traiter.md)
- [Objectifs non pertinents](./funding-objectifs-non-pertinents.md)
