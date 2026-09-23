# Stratégie de financement de CleanMyMap

## Statut et portée

Cette page détaille la décision CURRENT et le contrat TARGET de financement. La fiche canonique de la route [`/sections/funding`](./funding-README.md) décrit séparément le runtime réellement présent.

## CURRENT — portage par une personne physique

CleanMyMap est actuellement porté par une personne physique. OnParticipe est la voie de collecte externe prévue dans cette situation : [cagnotte CleanMyMap](https://www.onparticipe.fr/c/PUI9aOsy). Elle devient disponible dans l'interface uniquement lorsque `FUNDING_ONPARTICIPE_URL` contient l'URL HTTPS réelle. La collecte reste hébergée par OnParticipe ; CleanMyMap ne traite pas le paiement, ne transmet aucun montant ni donnée de contributeur et n'importe pas les totaux OnParticipe.

Stripe reste `IMPLEMENTED / NOT CURRENTLY EXPOSED` : son backend Checkout, le webhook, les RPC/tables, les agrégats et les tests backend sont conservés. Le clic OnParticipe ne redirige jamais vers Stripe. Stripe peut servir à d'autres paiements ou à des montants plus élevés, mais n'est pas la voie actuelle proposée pour les micro-contributions.

## Solutions retenues ou écartées

### OnParticipe — CURRENT privilégiée pour les micro-contributions

OnParticipe est la solution privilégiée pour proposer des micro-contributions dans la situation actuelle de CleanMyMap. La collecte est hébergée par le fournisseur : aucun paiement n'est traité dans CleanMyMap et aucune intégration API n'est supposée. Le lien direct est configuré par `FUNDING_ONPARTICIPE_URL`, optionnelle et limitée à la vraie URL HTTPS de la cagnotte. Tant qu'elle est absente, les boutons restent désactivés ; lorsqu'elle est définie, les deux boutons ouvrent la même cagnotte commune, sans transmettre montant, catégorie ou donnée de contributeur. Leur emplacement sous deux familles de besoins ne sélectionne pas une affectation ; CleanMyMap ne garantit pas d'affectation des contributions par catégorie. Aucun montant OnParticipe n'est importé. Le parcours OnParticipe n'a aucun fallback vers Stripe.

## TARGET — HelloAsso via une association partenaire

HelloAsso est une cible conditionnelle, uniquement via une association partenaire réelle et consentante. CleanMyMap n'a actuellement aucune association partenaire configurée. L'activation nécessitera que toutes les conditions suivantes soient réunies :

- l'association porteuse réelle accepte explicitement ce rôle ;
- la campagne HelloAsso est créée sous le compte de cette association ;
- HelloAsso a vérifié l'association ;
- le RIB de versement est au nom de l'association ;
- l'association et CleanMyMap s'accordent explicitement sur l'affectation des fonds au projet CleanMyMap ;
- l'association peut, si elle le souhaite, ajouter une personne administratrice de campagne côté CleanMyMap avec les droits adaptés.

Les fonds restent versés à l'association porteuse. CleanMyMap peut gérer la campagne uniquement si l'association lui accorde les droits adaptés. Aucune collecte, campagne, association ou URL HelloAsso n'est configurée maintenant ; aucun client API, Checkout, route, variable d'environnement ni autre runtime HelloAsso ne doit être créé avant satisfaction de ces conditions et décision distincte.

Les états métier `not_available_no_associative_host` et `available_via_associative_host` sont conceptuels et documentaires uniquement. Aucun état runtime n'est nécessaire tant qu'aucun consommateur réel ne le requiert. Une future intégration devra conserver séparément le nom public de l'association porteuse, l'URL réelle de sa campagne HelloAsso et le statut d'activation. Aucune de ces trois valeurs n'est configurée ou inventée aujourd'hui.

### Stripe — intégration existante conservée, usage non privilégié pour 1 €

L'intégration Stripe existante est conservée techniquement. Une composante fixe de frais pèse proportionnellement davantage sur une contribution de 1 €, ce qui rend Stripe moins adapté aux micro-dons de ce montant. Stripe peut rester utile pour d'autres paiements ou des montants plus élevés.

Aucun tarif n'est figé dans cette décision : les frais dépendent de l'offre, du pays, du moyen de paiement et des conditions du fournisseur. Ils doivent être vérifiés auprès de Stripe au moment d'une décision opérationnelle.

Le backend Stripe demeure implémenté, mais l'interface publique `/sections/funding` ne propose plus Stripe comme voie de contribution et n'appelle plus `/api/funding/checkout`. Les routes Checkout et de statut, l'agrégat, le webhook, les tables/RPC et la migration restent conservés pour les traitements historiques ou une activation future décidée séparément. La collecte Stripe n'est pas déclarée active. Les agrégats publics qui restent affichés sont libellés comme nets Stripe et ne représentent pas un total global lorsqu'il existe des contributions OnParticipe. Les anciens retours success/cancelled peuvent rester affichés pour des sessions initiées avant le débranchement.

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
- Ne pas annoncer d'avantage ou de traitement fiscal particulier sans validation juridique et confirmation de l'éligibilité réelle.
