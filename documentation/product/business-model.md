# Business model — CleanMyMap

> **Statut documentaire : `PLAN`.**
>
> Ce document structure les hypothèses économiques durables du projet. Il ne décrit ni un chiffre d'affaires existant ni une offre commerciale déjà validée. Le comportement réel de la page de financement reste documenté dans `documentation/pages_site/routes/04-reseau-discussions/funding/`.

## Principe

CleanMyMap cherche à préserver un **socle citoyen accessible** tout en construisant un modèle capable de financer durablement :

- l'infrastructure numérique ;
- le développement et la maintenance ;
- la sécurité et la qualité des données ;
- l'animation et les partenariats ;
- les actions de terrain et leur équipement lorsque le projet les porte ;
- la production de livrables utiles aux acteurs locaux.

Le modèle économique cible n'est pas encore validé. La stratégie doit être testée à partir des besoins réels des utilisateurs, des bénéficiaires et des acteurs disposant effectivement d'un budget.

## Situation actuelle

À ce stade :

- CleanMyMap est porté par une personne physique ;
- aucune association ou société n'exploite encore juridiquement le service ;
- OnParticipe est la voie de collecte externe actuellement prévue lorsque sa configuration réelle est présente ;
- le backend Stripe existe mais n'est pas proposé comme voie publique actuelle de contribution ;
- aucun avantage fiscal ni reçu fiscal n'est annoncé ;
- aucune offre commerciale récurrente n'est considérée comme validée.

Les détails runtime et juridiques restent respectivement canoniques dans :

- [`../pages_site/routes/04-reseau-discussions/funding/funding-README.md`](../pages_site/routes/04-reseau-discussions/funding/funding-README.md) ;
- [`../pages_site/routes/04-reseau-discussions/funding/funding-presentation-detaillee.md`](../pages_site/routes/04-reseau-discussions/funding/funding-presentation-detaillee.md) ;
- [`../legal/README.md`](../legal/README.md).

## Acteurs économiques

| Segment | Utilisateur possible | Bénéficiaire | Payeur potentiel |
| --- | --- | --- | --- |
| Citoyens / bénévoles | oui | oui | contribution directe non centrale à ce stade |
| Associations / coordinateurs | oui | oui | possible selon capacité et service rendu |
| Collectivités | oui | oui | possible via convention, prestation ou financement de projet |
| Entreprises / mécènes | parfois | oui indirectement | possible via mécénat, partenariat ou prestation |
| Établissements scolaires | oui | oui | possible via programme ou structure porteuse |
| Recherche / enseignement supérieur | oui | oui | possible via projet, convention ou financement dédié |

Cette table décrit des hypothèses de rôle économique ; elle ne prouve aucune volonté de payer.

## Hypothèses de financement

### Subventions et appels à projets

Hypothèse prioritaire pour la phase de structuration, notamment autour de :

- transition écologique ;
- ESS ;
- innovation sociale ;
- innovation numérique ;
- engagement citoyen ;
- jeunesse et entrepreneuriat étudiant ;
- recherche, pédagogie ou science participative lorsque le projet répond réellement aux critères du dispositif.

### Dons, contributions et cotisations

Une future structure associative pourrait recevoir des cotisations, dons ou autres contributions dans le cadre légal applicable.

La constitution d'une association ne suffit pas à rendre les dons fiscalement déductibles. Aucun reçu fiscal ne doit être promis sans éligibilité établie.

### Mécénat et partenariats

Des entreprises ou fondations peuvent potentiellement soutenir :

- du matériel ;
- des actions ou programmes territoriaux ;
- le développement du projet ;
- des démarches pédagogiques ou scientifiques.

Un financement ne doit jamais acheter un pouvoir de modération, une permission métier, une priorité sur les données personnelles ou une capacité d'influencer leur traitement.

### Services institutionnels

Hypothèses à tester auprès des collectivités et autres structures :

- accompagnement au déploiement local ;
- rapports ou exports adaptés ;
- analyses territoriales ;
- animation ou coordination de campagnes ;
- services autour de données ou d'interopérabilité lorsque le contrat et les droits le permettent.

Aucune offre ni tarification n'est considérée comme validée tant qu'un besoin, un acheteur et un prix acceptable n'ont pas été vérifiés.

## Modèle hybride à tester

La cible actuellement la plus cohérente à explorer est :

```text
socle citoyen accessible
+ subventions et appels à projets
+ mécénat / partenariats
+ services institutionnels éventuels à valeur ajoutée
```

Ce schéma reste une hypothèse de travail, pas un modèle `CURRENT`.

## Invariants

Quel que soit le modèle retenu :

- ne pas vendre de données personnelles ;
- ne pas conditionner une permission métier sensible au paiement ;
- séparer financement et modération ;
- ne pas présenter une estimation comme un revenu acquis ;
- conserver la transparence sur les sources de financement ;
- préserver la finalité environnementale et l'intérêt collectif du projet ;
- vérifier l'impact fiscal et juridique avant d'activer un nouveau flux financier.

## Coûts à documenter

Le budget prévisionnel doit distinguer au minimum :

- infrastructure et services numériques ;
- domaine et communication ;
- assurance et fonctionnement juridique ;
- matériel et logistique terrain ;
- développement et maintenance ;
- animation, partenariats et déplacements ;
- éventuelles prestations externes ;
- rémunérations ou emplois futurs.

Les montants doivent provenir de coûts observés, de devis ou de sources datées ; aucun budget n'est figé ici sans preuve.

## Questions à valider

1. Quel segment rencontre le problème le plus fréquent et le plus coûteux ?
2. Qui utilise CleanMyMap, qui en bénéficie et qui dispose réellement d'un budget ?
3. Quelle fonction produit une valeur assez forte pour justifier un financement ?
4. Quelle part doit rester un commun accessible et quelle part peut devenir un service financé ?
5. Quelle combinaison de ressources réduit la dépendance à un financeur unique ?
6. À quelles conditions une activité économique reste cohérente avec la structure juridique retenue ?

## Critères de stabilisation

Ce document pourra passer de `PLAN` à une stratégie plus stable lorsque le projet disposera au minimum :

- d'entretiens terrain documentés sur les segments prioritaires ;
- d'un payeur ou financeur plausible identifié ;
- d'une proposition de valeur testée ;
- d'un budget de coûts observés ;
- d'au moins un scénario de financement réaliste ;
- d'une analyse juridique et fiscale adaptée aux flux envisagés.
