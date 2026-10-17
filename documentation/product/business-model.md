# Business model - CleanMyMap

> **Statut documentaire : `PLAN` (hypothèses économiques, non déployées).**
>
> **Référence de cadrage : 17 octobre 2026.** Les fourchettes, tarifs pilotes, scénarios et priorités commerciales ci-dessous sont des propositions de travail, **pas** des prix acceptés par des clients, des contrats conclus, des recettes observées ou une promesse de financement.
>
> **Source canonique économique :** ce document. **Source des priorités produit :** [`roadmap-priorisee.md`](./roadmap-priorisee.md). Les comportements effectivement livrés relèvent du code sur `main` et des fiches `CURRENT` des pages. La doctrine juridique et fiscale relève de [`../legal/README.md`](../legal/README.md) et du [plan de transition associative](../legal/association-ess-transition-plan.md). Ne pas dupliquer ces contrats ici.

## 1. Objectif et principes

CleanMyMap vise un modèle économique hybride qui préserve **l'accès citoyen gratuit aux fonctions essentielles** (signaler, rejoindre et organiser une action, consulter la carte, accéder aux données publiques autorisées et à une lecture intelligible des résultats), tout en finançant durablement :

- l'infrastructure web/mobile, l'hébergement, la sécurité et la maintenance ;
- la fiabilité scientifique, la vérification des données et les livrables ;
- la coordination de bénévoles et d'organisations ;
- les collectes terrain, la logistique, le matériel et l'animation ;
- l'accompagnement de collectivités, entreprises, établissements et partenaires.

**Positionnement proposé :** vendre une **prestation, un accompagnement, une configuration, une restitution personnalisée ou un service continu**, et non la donnée personnelle, le pouvoir de modération, la priorité artificielle d'un partenaire ou l'exclusivité d'un code open source.

Publicité, cagnotte de dons et achat de visibilité publicitaire ne sont **pas** les axes retenus pour cette étude. Le mécénat, les subventions et les financements fléchés restent pertinents car ils diffèrent d'une simple cagnotte publique.

## 2. État actuel et frontières de vérité

### 2.1 Statut juridique et financement

Selon les sources canoniques du dépôt consultées pour ce cadrage :

- CleanMyMap est actuellement édité par une **personne physique à titre non professionnel**. L'association loi 1901 et son exploitation juridique du service sont `TARGET`, **non acquises** ;
- le plan de transition associatif prévoit gouvernance, formalités, assurance, compte bancaire, SIRET éventuel, inventaire des actifs, conventions d'exploitation, contrats cloud et revue RGPD ;
- la page de financement prévoit la cagnotte externe OnParticipe lorsqu'elle est configurée ; le backend Stripe est `IMPLEMENTED / NOT CURRENTLY EXPOSED` pour initier une contribution depuis cette UI ;
- aucun reçu fiscal, avantage fiscal, agrément ESUS ou statut d'organisme d'intérêt général n'est acquis ;
- aucune prestation vendue, volonté de payer, recette récurrente, subvention ou convention commerciale n'est démontrée par le dépôt.

**Condition opérationnelle :** une association future ne doit pas facturer ni se présenter comme exploitante de CleanMyMap avant sa constitution et les conventions nécessaires. Toute expérimentation antérieure doit préciser honnêtement le véritable cocontractant et respecter son régime légal et fiscal.

### 2.2 Capacités techniques mobilisables, sans présumer une offre commercialisable

| Brique actuelle | Utilité économique possible | Frontière / limite à respecter |
| --- | --- | --- |
| Actions, inscriptions, préparation, coordination, données post-action | Exécuter une cleanwalk et en documenter le résultat | Valider le parcours réel, la persistance, la présence et les preuves terrain |
| `/reports`, PDF/CSV, historique et snapshots | Livrer un bilan exploitable à un partenaire | Résolution serveur des scopes, provenance, qualité des observations et versionnement ; ne pas promettre une certification |
| `/actions/map`, signalements, suivi de zones | Aider à préparer et suivre un programme territorial | Historique et projection ne sont pas une mesure actuelle exhaustive de pollution |
| `/pilotage` | Coordination d'actions effectivement organisées | Périmètre limité aux relations métier autorisées, pas à toutes les données d'une structure |
| `/sponsor-portal` | Présenter des synthèses à des partenaires | **Pas encore un espace client privé par organisation/territoire** ; ne pas le vendre comme tel |
| Réseau, annuaire et outils de partenariat | Relation avec les structures et prospection | Aucun classement, niveau de confiance ou modération ne doit être acheté |
| Apprentissage, quiz, pédagogie | Préparer des ateliers accompagnés | L'animation humaine et son contenu constituent la prestation, pas un accès payant aux guides généraux |
| Domaine événementiel SPOGOMI (`CURRENT PARTIEL`) | Aide à l'organisation d'événements, selon les droits réels | Ne pas revendiquer de licence ou partenariat officiel, d'homologation ou de règlement non vérifié |
| Mobile GPS (`NOT_PRODUCTION_READY`) | Extension future du suivi terrain | Pas de promesse commerciale dépendant de sa disponibilité en production |

**Point de vigilance vérifié dans `apps/web/src/app/(app)/sponsor-portal/page.tsx` au cadrage :** plusieurs `deltaPercent` sont littéralement codés (`+12%`, `+8%`, `+24%`, `+15%`), et le bouton « Exporter le bilan certifié » n'est pas raccordé à un export probant. Ces éléments **ne peuvent pas servir de support contractuel ni de preuve RSE certifiée**. Toute correction fait l'objet d'un lot technique distinct ; le présent document ne prescrit aucune mutation runtime.

Les indicateurs dérivés de CleanMyMap restent des **proxys méthodologiques**. Notamment, la masse collectée et le nombre de mégots ne permettent pas d'affirmer une quantité mesurée de CO2 évitée ou d'eau dépolluée. Voir [`SCIENTIFIC_PROTOCOL.md`](./SCIENTIFIC_PROTOCOL.md).

## 3. Segments, acheteurs et mécanismes de financement

| Segment | Problème susceptible de justifier un budget | Acheteur ou financeur potentiel | Modèle à tester |
| --- | --- | --- | --- |
| PME et grandes entreprises | Animation RSE, cohésion d'équipe, programme local, restitution | Direction RSE, RH, communication, établissement | Prestation par événement, forfait de programme |
| Collectivités et établissements publics | Coordination d'actions, mobilisation, connaissance territoriale, bilans | Service propreté, transition écologique, jeunesse, vie associative | Marché/prestation, convention de projet ou subvention selon la réalité juridique |
| Associations, collectifs et coordinateurs | Organisation et reporting avec peu de moyens | Association, tête de réseau, fondation financeuse | Socle gratuit ; accompagnement ou support optionnel financé |
| Écoles et universités | Sensibilisation, engagement étudiant, restitution pédagogique | Établissement, partenaire, dispositif de projet | Atelier, programme ou subvention |
| Fondations et mécènes | Financement d'un programme environnemental d'intérêt général | Fondation, entreprise, fonds dédié | Mécénat à vérifier, financement pluriannuel |
| Recherche / enseignement supérieur | Suivi d'un protocole, restitution méthodologique | Laboratoire, projet financé, établissement | Convention spécifique, expertise et services, sans privatiser la donnée ouverte |

L'utilisateur, le bénéficiaire et le payeur peuvent être des acteurs différents. **Aucun segment ne dispose d'une volonté de payer prouvée** à ce stade.

### Distinctions juridiques

- **Prestation** : besoin commandé, livrable défini, prix et obligations contractuelles. Une association peut exercer une activité commerciale mais n'est pas automatiquement exonérée d'impôts commerciaux.
- **Abonnement** : prestation continue (service hébergé, assistance, configuration, support, suivi), nécessitant engagements, coûts de support et règles de résiliation.
- **Mécénat** : soutien sans contrepartie commerciale équivalente. Une reconnaissance sobre est envisageable dans les limites applicables ; l'avantage fiscal n'est jamais présumé.
- **Parrainage / sponsoring** : financement assorti d'une véritable visibilité promotionnelle ; à qualifier comme activité commerciale, et non comme don ouvrant automatiquement un droit fiscal.
- **Subvention** : soutien à un projet d'intérêt général initié et mis en oeuvre par l'association, sans paiement d'une prestation individualisée correspondant au besoin de l'administration ; ne pas confondre avec un marché public.
- **Cotisation et contribution volontaire** : financement associatif distinct des achats professionnels, non central dans cette stratégie. Les reçus fiscaux restent conditionnels.

Sources de cadrage : [Service-Public, activité commerciale associative](https://www.service-public.fr/particuliers/vosdroits/F31838), [gestion désintéressée](https://www.service-public.fr/particuliers/vosdroits/F31839), [Associations.gouv.fr, différence subvention et marché public](https://associations.gouv.fr/subvention-et-marche-public-quelles-differences), [définition de la subvention](https://associations.gouv.fr/quest-ce-quune-subvention) et [modèle officiel de rescrit pour organisme recevant des dons](https://www.service-public.fr/particuliers/vosdroits/R47828). Ces références encadrent la décision, sans constituer un avis fiscal individuel.

## 4. Catalogue d'offres hypothétiques et fourchettes

Les chiffres suivants sont des **hypothèses de prix à tester en France** et non des tarifs publiés par CleanMyMap. Les montants sont exprimés **hors taxes éventuelles** par convention de comparaison ; le traitement réel de TVA et le montant facturé dépendront de la structure et de son régime. Les périmètres proposés ne sont pas tous livrables en autonomie aujourd'hui.

| Offre | Modèle | Fourchette à tester | Maturité commerciale | Priorité de validation |
| --- | --- | ---: | --- | --- |
| Cleanwalk d'entreprise avec animation et bilan | Prestation ponctuelle | **500 à 2 000 EUR / événement** | Capacité applicative partielle, intervention humaine et validation terrain nécessaires | **P0 commercial** |
| Atelier déchets, prévention, tri, sensibilisation | Prestation | **250 à 800 EUR / séance** | Offre humaine possible ; programme à formaliser | **P0 commercial** |
| Programme d'une collectivité | Convention / prestation | **2 000 à 12 000 EUR / an** | Nécessite cadrage, périmètre fiable, capacité de réalisation | **P1 commercial** |
| Espace de gestion professionnel | Abonnement hébergé et support | **39 à 199 EUR / mois** | `TARGET`, pas de tenancy organisationnelle payante prouvée | **P2 conditionnel** |
| Rapport environnemental personnalisé | Prestation | **300 à 1 500 EUR / rapport** | Moteur existant ; validation des données et travail éditorial à prévoir | **P0 commercial** |
| Programme de nettoyage d'une zone | Parrainage / programme financé | **1 000 à 5 000 EUR / an** | Nécessite programme opérationnel et indépendance des choix | **P1 commercial** |
| Mécénat d'entreprise | Financement affecté ou général selon convention | **500 à 10 000 EUR / an** | Dépend de la structuration légale et de l'intérêt du mécène | **P0 structuration** |
| Hébergement, mise en place et support | Contrat de service, non licence exclusive | **500 à 3 000 EUR / an** | À limiter au vrai service rendu et à sa capacité de maintenance | **P2 conditionnel** |
| Programme scolaire ou universitaire | Prestation / projet financé | **300 à 2 000 EUR / programme** | Besoin de pédagogie adaptée, encadrement et sécurité | **P1 commercial** |
| Campagne territoriale multi-acteurs | Convention / projet | **3 000 à 20 000 EUR / campagne** | Dépend de coordination, partenaires, autorisations et preuves | **P2 conditionnel** |

Une grande fourchette n'est pas une preuve de demande. Définir un **prix test** et un périmètre de prestation avant chaque proposition commerciale.

### Référence de marché partielle

À la consultation du 17 octobre 2026, [Happy Unity](https://www.happy-unity.com/team-building/atelier-eco-responsable) affichait, pour **un atelier différent** de fabrication de produits écoresponsables, une grille publiée de **990 EUR HT jusqu'à 10 personnes, 1 190 EUR HT jusqu'à 20 et 1 390 EUR HT jusqu'à 30**, limitée aux Hauts-de-France, avec un devis ailleurs. C'est un repère du marché de l'animation RSE, **pas une preuve du juste prix d'une cleanwalk CleanMyMap**. Les prix ci-dessus restent des hypothèses internes à tester, et ne découlent pas mécaniquement de ce comparateur.

## 5. Trois offres pilotes prioritaires

### A. « Cleanwalk entreprise » : prix test 900 EUR par événement

**Hypothèse de périmètre** : groupe d'environ 20 personnes, événement local, préparation logistique raisonnable, animation, matériel de collecte défini, consignes de sécurité, collecte des mesures disponibles et bilan factuel de l'action.

**À chiffrer au devis** : déplacement, consommables, autorisations, assurance, nombre d'animateurs, traitement et filière des déchets, équipement de protection, accès du site, taille et durée du groupe, photos consenties, restitution.

**Livrable** : compte rendu daté, participants effectivement recensés selon la source, quantité de déchets selon la mesure disponible, photos autorisées, limites méthodologiques et rapport. Ne pas promettre un résultat physique garanti, un nettoyage intégral ou une certification RSE.

**Critère de vente** : au moins un organisateur accepte un devis écrit et un périmètre livrable ; relevé du temps et de la marge après réalisation.

### B. « Programme territorial » : prix test 4 000 EUR par an

**Hypothèse de périmètre** : accompagnement d'une commune ou d'un réseau local pour préparer plusieurs opérations, exploiter les données publiques autorisées, produire des points de situation périodiques et un bilan annuel. **Ce prix ne comprend pas** une surveillance exhaustive des rues, une garantie de propreté, un service d'astreinte ni une plateforme dédiée avec toutes les données privées du territoire.

**Livrables** : calendrier et résultats des opérations suivies, cartographies contextualisées, limites de couverture, synthèses de mobilisation, propositions de priorisation clairement présentées comme recommandations.

**Condition** : déterminer au cas par cas si le financement relève d'un marché/prestation ou d'une subvention, selon le besoin et l'initiative réels. Valider le périmètre géographique et les données admissibles avant toute affirmation.

### C. « Partenaire fondateur » : contribution test 2 000 EUR par an

**Hypothèse de périmètre** : soutien à l'infrastructure, au matériel ou à un programme environnemental précis, avec communication factuelle limitée à l'existence du soutien et un compte rendu des dépenses et activités financées.

**Condition** : qualifier séparément mécénat ou parrainage selon les contreparties réelles. Pas de promesse de réduction fiscale, de publicité déguisée en don, de droit de regard éditorial ou de logo imposé dans les espaces citoyens.

### Pourquoi les prestations avant l'abonnement ?

- Les fonctionnalités nécessaires à une **offre accompagnée** sont en partie présentes, et les lacunes peuvent être compensées explicitement par un travail humain contractualisé.
- Un **abonnement professionnel** exige des droits d'accès organisationnels vérifiés, une capacité de support récurrent, des conditions contractuelles et une valeur démontrée chaque mois.
- Les petites associations disposent souvent de budgets limités ; elles ne sont pas le meilleur segment à facturer dès le lancement. Préserver un socle gratuit augmente la compatibilité avec la mission d'intérêt collectif.

## 6. Abonnements : pistes, pas chantier immédiat

| Client | Hypothèse tarifaire | Contenu finançable | Dépendance principale |
| --- | ---: | --- | --- |
| Citoyen, bénévole, association ordinaire | Gratuit | Parcours essentiels et données publiques autorisées | Maintien des fonctions gratuites |
| Entreprise organisant plusieurs collectes | **79 à 149 EUR / mois** à tester | Accompagnement, historique propre, support et rapports récurrents | Scope d'organisation réel, budget support, consentements |
| Collectivité, réseau multi-organisations | **2 000 à 8 000 EUR / an** à tester | Mise en place, support, exports et suivi convenus | Contrats de territoire, propriété des données et AuthZ serveur |

Les offres « espace professionnel » et « hébergement + support » ne doivent pas être additionnées comme si elles représentaient nécessairement des marchés indépendants. Choisir une seule formule claire pour chaque client.

**Règle AGPL-3.0-only :** vendre l'hébergement, le déploiement, l'assistance, l'intégration ou une prestation liée au logiciel est possible ; ne pas promettre une licence **exclusive** sur le code déjà librement distribué. Respecter les obligations de l'AGPL pour les versions modifiées accessibles par réseau, les droits des contributeurs et les licences tierces. Références : [`../../LICENSE`](../../LICENSE), [`../legal/README.md`](../legal/README.md), [GNU AGPL](https://www.gnu.org/licenses/agpl-3.0.html).

**Décision de développement :** pas de paywall, d'abonnement Stripe, de facturation récurrente ni de nouvelle table `organizations` uniquement « parce que l'offre pourrait se vendre ». Revenir à ce chantier après au moins deux cas réels de besoin récurrent documentés, avec sécurité et coûts compatibles.

## 7. Simulation des recettes annuelles : trois scénarios

**Méthode** : scénarios de volume × prix, purement exploratoires, sur 12 mois complets. Tous les montants en EUR, hors TVA éventuelle, **avant charges**. Un « partenaire » désigne ici une contribution annuelle ; sa qualification comptable/fiscale dépendra de la convention. Les offres sont alternatives lorsque leurs périmètres se recouvrent : ne pas facturer deux fois une même prestation.

| Flux et hypothèses | Prudent | Intermédiaire | Développement soutenu |
| --- | ---: | ---: | ---: |
| Cleanwalks | 6 × 750 = **4 500** | 12 × 1 100 = **13 200** | 24 × 1 300 = **31 200** |
| Ateliers | 4 × 400 = **1 600** | 8 × 500 = **4 000** | 12 × 600 = **7 200** |
| Conventions territoriales | 1 × 2 500 = **2 500** | 2 × 4 000 = **8 000** | 4 × 6 000 = **24 000** |
| Partenaires financiers | 2 × 750 = **1 500** | 3 × 2 000 = **6 000** | 5 × 3 000 = **15 000** |
| Rapports spécifiques | 0 | 3 × 750 = **2 250** | 5 × 900 = **4 500** |
| Abonnements professionnels | 0 | 0 | 4 × 99 × 12 = **4 752** |
| **Total brut annuel hypothétique** | **10 100 EUR** | **33 450 EUR** | **86 652 EUR** |

Ces totaux sont des sommes arithmétiques de **scénarios arbitraires**, pas des estimations de probabilité, une analyse de marché, ni un budget sécurisé. Le scénario soutenu suppose notamment une capacité d'animation, de prospection et de support significative, **non prouvée**. Le scénario prudent est un exemple d'objectif d'expérimentation, pas un minimum prévisible.

Distinguer dans la comptabilité : chiffre d'affaires commercial éventuel, mécénat, cotisations, subventions, trésorerie encaissée et contributions en nature. Le « total de ressources » ne doit pas devenir indifféremment un « chiffre d'affaires ».

## 8. Économie unitaire et coûts complets

Exemple **hypothétique** d'une cleanwalk facturée 1 000 EUR :

| Poste | Hypothèse |
| --- | ---: |
| Matériel et consommables | 80 EUR |
| Transport et logistique | 90 EUR |
| Assurance imputée à l'événement | 30 EUR |
| Préparation, animation, coordination et rapport : 12 h × 30 EUR/h | 360 EUR |
| **Coût direct et temps valorisé** | **560 EUR** |
| **Contribution après ces coûts** | **440 EUR** |

Ce solde **n'est ni un bénéfice net ni une trésorerie automatiquement disponible** : prospection, administration, maintenance, hébergement, renouvellement du matériel, fiscalité éventuelle et imprévus restent à imputer. Le temps bénévole est une ressource rare, même lorsqu'il ne génère pas de décaissement.

Pour chaque pilote, relever `prix signé`, `recette encaissée`, `frais variables`, `heures bénévoles`, `heures rémunérées`, `coût logistique`, `temps de préparation`, `satisfaction`, `incident`, `livrable livré`, `réachat ou renouvellement`. Ne jamais convertir implicitement la valeur du bénévolat en recettes de trésorerie.

## 9. Priorités économiques pour orienter la roadmap

Le document produit [`roadmap-priorisee.md`](./roadmap-priorisee.md) reste **l'unique source de l'ordre de développement**. Le tableau ci-dessous énonce les **arguments économiques** à y intégrer, pas une seconde roadmap autonome. La priorité commerciale ne remplace jamais la sécurité, les contrats d'accès, la fiabilité des données et les P0 terrain/rapports.

| Opportunité | Délai potentiel avant première vente | Effort technique supplémentaire | Hypothèse de revenu | Orientation |
| --- | --- | --- | --- | --- |
| Offre accompagnée cleanwalk et atelier | Court si opérateurs, assurance et autorisations disponibles | Faible à modéré ; réutiliser Actions et Reports | 250 à 2 000 EUR par opération | **Tester d'abord** |
| Rapport personnalisé ponctuel | Court si source admissible et document honnête | Faible à modéré ; consolider le livrable existant | 300 à 1 500 EUR par rapport | **Tester d'abord** |
| Mécénat et soutien de programmes | Variable, dépendant du statut et du partenaire | Faible en logiciel, fort en gouvernance/commercial | 500 à 10 000 EUR / an | **Préparer en parallèle** |
| Convention de suivi territorial | Moyen ; vente institutionnelle et cadrage | Moyen ; intégration humaine et scope de données | 2 000 à 12 000 EUR / an | **Après preuve pilote** |
| Portail payant multi-organisations | Moyen à long | Élevé : AuthZ, modèle organisation, support, facturation | 39 à 199 EUR / mois à tester | **Différer** |
| API/données privées payantes ou exclusivité territoriale | Non retenu | Élevé et risqué | Non évalué | **Exclure** |

**Séquence de validation commerciale recommandée** (jalons de preuve, sans calendrier ou revenu garanti) :

1. **Jalon 0, portage et sécurité** : clarifier la structure qui peut signer et facturer, les droits du logiciel et des données, le contrat et l'assurance. Aucune anticipation de la création de l'association.
2. **Jalon 1, offre minimale** : rédiger deux fiches de prestation simples, avec périmètre, coût complet estimé, exclusion de certification et conditions de sécurité, sans développer de nouveau produit.
3. **Jalon 2, découverte du payeur** : échanger avec plusieurs responsables RH/RSE, associations et collectivités ; noter problème, fréquence, budget, processus d'achat, objections et conditions nécessaires.
4. **Jalon 3, pilotes contractuels** : obtenir des accords écrits, réaliser au moins un événement et une restitution, comptabiliser coûts et temps, enregistrer les retours.
5. **Jalon 4, récurrence** : chercher un deuxième événement, un renouvellement, une convention ou un partenaire financeur réel.
6. **Jalon 5, industrialisation conditionnelle** : prioriser uniquement les fonctions demandées à plusieurs reprises et dont la réalisation humaine devient trop coûteuse ; envisager alors périmètres organisationnels et abonnements.

Aucun seuil quantitatif ci-dessus n'est un KPI observé ; ce sont des **critères de décision proposés**. La roadmap peut détailler leur vérification sans figer une livraison technique anticipée.

### Critères avant de développer une fonction potentiellement payante

Exiger une réponse étayée aux questions suivantes :

1. Quel acheteur précis la demande et pour quel problème ?
2. Quel budget, preuve de volonté de payer et fréquence de réutilisation ?
3. Pourquoi les fonctions et exports existants avec assistance humaine ne suffisent-ils pas ?
4. Quelles dépendances AuthN/AuthZ, RGPD, contrat de données, assurance, fiscalité, licences, maintenance et support ?
5. Quelle amélioration attendue du temps de travail, de la qualité du livrable ou de la marge ?
6. Quel test pilote et quel critère d'arrêt si la demande ne se matérialise pas ?

Ne pas déplacer les P0 fiables du parcours bénévole ou des rapports au profit d'une fonctionnalité spéculative. Prioriser la qualité du livrable et l'usage réel sur le nombre de pages, les mécanismes de paiement ou le perfectionnement esthétique.

## 10. Conditions juridiques, scientifiques et éthiques

### Transparence et indépendance

- Aucun client, mécène ou partenaire n'achète un rôle privilégié, une capacité de modération, une priorité des signalements, une modification des méthodes ou des classements.
- Aucun contrat n'autorise à afficher des mesures fictives, des volumes « économisés » non mesurés, des labels « certifiés » non établis ou des comparaisons de pollution présentées comme observations temps réel.
- Aucune vente de données personnelles ni d'accès non autorisé aux données de participation, photos, GPS, messagerie ou identité. Les données ouvertes restent accessibles selon les contrats de publication et les droits tiers.
- Les soutiens financiers et contreparties sont traçables et compréhensibles pour les usagers. Les partenaires ne dictent ni la modération ni la qualité des données.

### Gouvernance et conformité avant encaissement

- Vérifier statuts, gouvernance désintéressée, capacité à facturer, compte bancaire au bon nom, assurance RC et modalités de sécurité terrain.
- Examiner activité lucrative, impôts commerciaux et TVA. Le montant d'une prestation n'établit pas à lui seul le traitement fiscal.
- Séparer mécénat, parrainage, subvention, prestations et cotisations dans les conventions et la comptabilité. Aucun reçu fiscal sans éligibilité légalement établie ; rescrit si pertinent.
- Clarifier la titularité de la marque, la licence du logiciel, les conventions d'exploitation, les fournisseurs et les responsabilités RGPD avant transfert vers une future association.
- Éviter de déclarer un statut ESS, ESUS, partenaire officiel SPOGOMI, programme certifié ou autorisation territoriale non acquis.

Sources internes : [`../legal/association-ess-transition-plan.md`](../legal/association-ess-transition-plan.md), [`../legal/README.md`](../legal/README.md), [`../architecture/data-governance.md`](../architecture/data-governance.md), [`../security/authz-authn-regles.md`](../security/authz-authn-regles.md), [`SCIENTIFIC_PROTOCOL.md`](./SCIENTIFIC_PROTOCOL.md).

## 11. Budget de fonctionnement à documenter

Distinguer dépenses observées, devis, hypothèses et inconnues pour :

- domaine, infrastructure, API, services et stockage ;
- qualité/sécurité, supervision, maintenance et développement ;
- assurance, banque, comptabilité, obligations légales ;
- matériel et logistique de terrain ;
- transport, animation, achats, gestion des déchets et sécurité ;
- communication, prospection, préparation de dossier et relation partenaire ;
- prestataires externes, éventuels emplois et rémunérations ;
- bénévolat valorisé **hors trésorerie** ;
- réserve opérationnelle et imprévus.

Aucun budget de dépenses annuel global n'est fixé tant que des coûts observés ou devis n'ont pas été réunis.

## 12. Questions à valider et critères de stabilisation

### Questions

1. Quel segment rencontre le problème le plus fréquent et le plus coûteux ?
2. Qui utilise CleanMyMap, qui en bénéficie et qui dispose réellement d'un budget ?
3. Quelle fonction produit assez de valeur pour justifier un contrat plutôt qu'une simple aide gratuite ?
4. Quelle part doit rester un commun accessible et quelle part peut devenir un service financé ?
5. Quelle combinaison de ressources réduit la dépendance à un financeur unique ?
6. À quelles conditions une activité économique reste-t-elle compatible avec la structure juridique retenue ?

### Passage de `PLAN` à une stratégie étayée

Le modèle pourra être stabilisé lorsqu'existeront au minimum :

- des entretiens avec des acheteurs documentés ;
- au moins une proposition de valeur et un périmètre testés sur un besoin réel ;
- des prix ou devis réellement acceptés, distincts des prix hypothétiques ;
- un budget de coûts fondé sur des mesures et des devis ;
- une analyse juridique, fiscale, assurantielle et contractuelle adaptée ;
- au moins un scénario de recettes avec des clients et conventions **identifiés**, sans le confondre avec des recettes déjà encaissées ;
- une mesure du temps et de la qualité des prestations pilotes.

**Critère d'arrêt :** si les acheteurs ne valorisent pas la prestation, si les risques contractuels dépassent les moyens disponibles ou si la contribution après coûts est trop faible, **ne pas construire un module payant pour compenser l'absence de demande**. Réduire le périmètre, proposer une prestation adaptée ou rechercher un financement de projet plus cohérent.
