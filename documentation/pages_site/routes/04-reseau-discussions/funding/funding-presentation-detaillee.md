# Stratégie de financement de CleanMyMap

## Statut et portée

Cette page détaille la décision CURRENT de financement. La fiche canonique de la route [`/sections/funding`](./funding-README.md) décrit séparément le runtime réellement présent. Cette décision n'ajoute aucun lien fournisseur, bouton, CTA, API, parcours de paiement ni route à CleanMyMap.

Tant que le projet est porté par une personne physique, la priorité est une collecte externe hébergée, distincte du runtime applicatif. Aucune promesse de reçu fiscal ou de défiscalisation ne doit être faite.

## Solutions retenues ou écartées

### OnParticipe — CURRENT privilégiée pour les micro-contributions

OnParticipe est la solution privilégiée pour proposer des micro-contributions dans la situation actuelle de CleanMyMap. La collecte est hébergée par le fournisseur : aucun paiement n'est traité dans CleanMyMap et aucune intégration API n'est supposée. La page funding peut expliquer cette stratégie sans ajouter de lien ou de CTA dans le cadre de cette décision documentaire.

### HelloAsso — TARGET conditionnelle

HelloAsso pourra être réévalué si CleanMyMap est porté par une future structure associative éligible. La disponibilité d'une API et d'un Checkout ne justifie pas la création d'un runtime CleanMyMap aujourd'hui. L'éligibilité, les conditions et les fonctionnalités devront être vérifiées au moment où cette condition se réalisera.

### Stripe — intégration existante conservée, usage non privilégié pour 1 €

L'intégration Stripe existante est conservée techniquement. Une composante fixe de frais pèse proportionnellement davantage sur une contribution de 1 €, ce qui rend Stripe moins adapté aux micro-dons de ce montant. Stripe peut rester utile pour d'autres paiements ou des montants plus élevés.

Aucun tarif n'est figé dans cette décision : les frais dépendent de l'offre, du pays, du moyen de paiement et des conditions du fournisseur. Ils doivent être vérifiés auprès de Stripe au moment d'une décision opérationnelle.

Le backend Stripe demeure implémenté, mais l'interface publique `/sections/funding` ne propose plus Stripe comme voie de contribution et n'appelle plus `/api/funding/checkout`. Les routes Checkout et de statut, l'agrégat, le webhook, les tables/RPC et la migration restent conservés pour les traitements historiques ou une activation future décidée séparément. La collecte Stripe n'est pas déclarée active. Les anciens retours success/cancelled peuvent rester affichés pour des sessions initiées avant le débranchement.

### Virement bancaire — possibilité manuelle

Un virement peut constituer une possibilité manuelle à très faible coût. Aucun IBAN, coordonnées ou autre donnée bancaire ne doit être stocké dans le dépôt. Aucun parcours automatisé n'est défini par cette décision.

### PayPal et Leetchi — non retenus

PayPal et Leetchi ne sont pas retenus comme solutions canoniques actuelles. Une éventuelle réévaluation nécessiterait une nouvelle décision documentée ; aucun lien ou parcours n'est ajouté.

## Règles durables

- Séparer la présentation publique du financement de toute collecte hébergée par un tiers.
- Ne pas supposer une intégration API pour un fournisseur dont le rôle retenu est la collecte hébergée.
- Ne créer aucun runtime HelloAsso avant qu'une structure éligible existe et qu'une décision distincte l'autorise.
- Ne pas présenter des frais fournisseur comme des constantes durables ; dater et sourcer toute donnée chiffrée si elle est ajoutée ultérieurement.
- Ne jamais versionner de secret, d'identifiant de compte, d'IBAN ou de donnée bancaire.
- Ne promettre ni reçu fiscal, ni réduction fiscale, ni défiscalisation.
