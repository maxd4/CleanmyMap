# Workflow de validation des contenus

Ce contrat couvre les contenus environnementaux et institutionnels publiés dans
CleanMyMap. Il est distinct du cycle de validation des actions (`pending`,
`approved`, `rejected`) décrit dans `data-governance.md`.

## Contrat obligatoire

Le type canonique est :

```txt
apps/web/src/lib/content/content-validation.ts
```

Chaque contenu possède :

- `status` : `draft`, `in_review`, `published` ou `rejected` ;
- `owner` : responsable éditorial ou institutionnel identifiable ;
- `source.name` et `source.url` ;
- `source.date`, `source.datePrecision` et `source.dateBasis` pour ne pas donner
  une fausse précision à une date connue seulement au mois ou à l’année ;
- `evidenceLevel` : `insufficient`, `limited`, `moderate` ou `strong` ;
- `lastReviewedAt` et `reviewedBy` ;
- `claims.fact`, `claims.estimate` et `claims.recommendation`.

Un claim porte son type, son texte localisé, ses pages source éventuelles et sa
limite d’interprétation. Un fait d’enquête ne doit donc pas être consommé comme
une observation terrain, une estimation ou une recommandation.

## Transitions humaines

```txt
draft -> in_review -> published
                   -> rejected -> draft
published -> in_review
```

Une publication est bloquée si le responsable, la source, la date, le niveau de
preuve, la revue ou la séparation des claims est incomplet. Les brouillons
peuvent rester incomplets, mais ne sont jamais considérés comme publiables.

## Sources intégrées dans `/learn/bonnes-pratiques`

| Contenu | Source | Date retenue | Preuve | Lecture autorisée |
|---|---|---:|---|---|
| Baromètre national | PDF IFOP × Gestes Propres | document, 2025-12-17 | strong | perceptions, croyances et pratiques déclarées |
| Dépôts sauvages | PDF IFOP × Gestes Propres | document, mai 2025 | strong | réponses d’enquête sur une étude menée en 2024 |
| Campagne « Ça va pas s’faire tout seul ! » | page Gestes Propres | campagne, 2025 | moderate | campagne diffusée en 2025 puis redéployée en 2026 |
| Éclairages Gestes Propres | articles source | date de publication indiquée | moderate | synthèses reformulées, recommandations séparées |
| Sobriété numérique — procédures Gmail | Aide Gmail officielle | consultation du document, 2026-09-01 | strong | chemin de gestion des abonnements, fallback de désabonnement, nettoyage du spam et de la corbeille |
| Sobriété numérique — facteurs d’impact | Impact CO₂, données Base Empreinte ADEME | consultation des pages, 2026-09-01 | strong | facteurs de spam non lu, stockage cloud et voiture thermique moyenne essence |
| Mode École — ressources territoriales | sites officiels Ville de Paris et Académie du Climat | revue des pages, 2026-09-02 | strong | description stable du lieu, territoire, public scolaire lorsque publié ; programmation et modalités à revérifier |

Les pages d’aide et les pages de facteurs ne fournissent pas toutes une date de
publication visible. Pour ces sources web vivantes, `source.date` conserve la
date de consultation déclarée avec `dateBasis: "document"`; cette convention
évite d’inventer une date éditoriale et impose une nouvelle revue si le contenu
source évolue.

Dans `/learn/bonnes-pratiques`, les contenus de sobriété numérique séparent
explicitement :

- les `fact` sourcés (procédure Gmail et facteurs publiés) ;
- les `estimate` dérivés des facteurs centralisés dans
  `apps/web/src/lib/learning/practice/numerique.ts` ;
- les `recommendation` (ordre des gestes et priorité donnée à l’évitement des
  futurs envois).

La suppression d’un message déjà reçu n’est pas enregistrée comme une émission
évitée : la transmission appartient à l’historique du message. Les kilomètres
affichés sont donc des équivalences pédagogiques, pas des déplacements réels
évités ni une mesure personnalisée d’une boîte Gmail.

Les valeurs de sondage restent accompagnées de leur limite d’interprétation dans
les données et dans le rendu. Les visuels ou images partenaires restent soumis à
leur propre statut de permission ; ce statut n’est pas confondu avec la
validation éditoriale du texte.

Le registre territorial de `atelier-60` est centralisé dans
`apps/web/src/lib/learning/quiz/school/quiz-school-territorial-resources.ts`.
Chaque ressource possède un `ContentValidationRecord` publié, une URL officielle,
une date de revue et un statut scolaire explicite. Seules les ressources
`validated` et publiées peuvent apparaître dans le bilan ; une ressource
`needsReview` est conservée pour la revue éditoriale mais exclue du parcours
public. Les descriptions ne codent pas en dur les créneaux, tarifs, ateliers ou
réservations susceptibles de changer. L’Académie du Climat est présentée comme
un prolongement possible, sans relation de partenariat avec CleanMyMap.

## Contrôles

- `validateContentRecord` produit les anomalies structurées ;
- `assertPublishedContent` empêche l’usage d’un enregistrement publié mais
  incomplet dans un registre ou un import ;
- les tests du contrat couvrent les champs obligatoires, la séparation des
  claims et la machine à états ;
- les tests de la page couvrent le baromètre, l’étude IFOP et leurs liens PDF.

Avant une nouvelle source Gestes Propres, une source de sobriété numérique ou
une page « Apprendre », la fiche doit être créée dans ce contrat, revue par le
responsable identifié, puis seulement passer à `published`. Les enregistrements
de sobriété numérique sont centralisés dans
`apps/web/src/lib/learning/practice/numerique.ts` et validés par
`apps/web/src/lib/learning/practice/numerique.test.ts`.

Le registre des politiques environnementales est centralisé dans
`apps/web/src/lib/learning/policies/environmental-policy-registry.ts`; ses
dérivations sans données sont dans
`apps/web/src/lib/learning/policies/environmental-policy-filtering.ts`. Il
réutilise `ContentValidationRecord` et appelle `assertPublishedContent` pour
conserver la provenance et séparer l’état de revue éditoriale de la situation
juridique de chaque décision. La page `/learn/comprendre` sélectionne les
fiches `published` dans le Server Component et ne transmet au composant client
que cette liste sérialisable ; les enregistrements `draft` et `in_review`
restent disponibles pour le travail éditorial mais sont exclus de la
chronologie publique et du bundle client. Chaque fiche porte explicitement ses territoires, jalons, sources
officielles, date de consultation, dernière vérification nullable, limites et
versions. Les dates de décision, de publication, d’entrée en vigueur,
d’application, d’objectif et de déploiement gardent leur précision déclarée
(`day`, `month`, `year`, `unknown`) sans jour inventé. Les états juridiques et
d’exécution restent séparés : `modified`, `suspended`, `repealed` et
`execution_undocumented` ne constituent pas un résultat environnemental ni un
abandon implicite.
Pour le cycle de vie des politiques, chaque jalon porte en plus un identifiant
stable, une `category` (`adoption`, `publication`, `entry_into_force`,
`application`, `amendment`, `suspension` ou `repeal` lorsque ces catégories
sont établies), des `sourceIds`, une `versionId` et un
`verificationStatus`. Les jalons antérieurs ne sont pas remplacés lorsqu’une
nouvelle étape est ajoutée ; `getPolicyTimeline` les ordonne par date puis par
identifiant stable, indépendamment de l’ordre d’insertion pour deux étapes le
même jour. Une publication exige des identifiants de sources, versions et
jalons non vides et uniques, des `versionId` existants pour chaque jalon et des
`sourceIds` résolus. Les versions portent leurs liens de sources. `reviewStatus`, `lastVerifiedAt` et
`previousLastVerifiedAt` distinguent une revue à refaire d’une nouvelle
décision. `filterEnvironmentalPolicies` rattache une année à tout jalon daté
de cette année, quelle que soit sa catégorie, tandis que `getPolicyTimeline`
conserve le tri chronologique stable. Les thèmes utilisent une clé dérivée
stable distincte du libellé localisé afin qu’une sélection survive au passage
fr/en. `getPublishedEnvironmentalPolicies` bloque aussi une fiche dont une
source est retirée, dont un événement reste `needs_review` ou dont l’historique
ne peut plus relier ses sources. L’état juridique n’est jamais déduit de la
seule date de publication d’un avis.
Le corpus présidentiel préparatoire est distinct de ce registre juridique et
reste dans `apps/web/src/lib/learning/policies/presidential-environmental-corpus.ts`.
Il réutilise `ContentValidationRecord` pour chaque candidature et chaque
engagement, distingue les sources officielles archivées, les sources
officielles courantes, les discours, les sources secondaires et les preuves en
attente, et conserve les états `not_collected`,
`no_measure_identified_after_review`, `not_quantified`,
`deadline_unspecified`, `source_insufficient` et `draft`. Les engagements 2012, 2017 et
2022 sont actuellement des entrées préparatoires non publiables ; le lot 2022
conserve 16 mesures de travail issues de sept PDF CNCCEP avec leurs pages et
URLs directes, tandis que cinq candidatures restent `not_collected`. 2027 ne
contient aucune candidature ni mesure. Le consommateur public de
`/learn/comprendre` n'expose que les listes officielles 2012/2017/2022 et une
projection publique des candidatures sans leurs validations internes, ainsi que
les résultats officiels du second tour : Hollande est élu en 2012, Macron en
2017 et 2022, avec les périodes de mandat 2012–2017, 2017–2022 et 2022–2027
distinguées par leur état terminé/en cours. Cette information électorale est
indépendante de toute appréciation environnementale. Les résultats sont
versionnés par les archives officielles du ministère de l'Intérieur ; les
engagements passent toujours par `getValidatedPresidentialCommitments` ; cette projection
rejette aussi toute échéance `PolicyDate` mal formée et conserve une durée
annoncée dans `announcedUnits` sans la convertir en année civile. Une source
secondaire, un discours ou un programme sans revue humaine effective ne peut
donc pas fuir dans l'interface. La classification environnementale future
s’inspire des principes du Budget vert français sans reproduire sa cotation
officielle ni produire un score : elle sépare intention, effet attendu et effet
observé, et décrit les domaines climat, biodiversité, eau, pollution, ressources
et déchets. Une classification affichable exige une source primaire vérifiée,
justification, mécanisme, hypothèses, limites, incertitudes, niveau de preuve
et date/relecteur humain ; les valeurs ambiguës restent `undetermined`, les
effets divergents restent `mixed`, et une clé de dédoublonnage écarte les
reformulations identiques. La classification globale doit être cohérente avec
les six domaines : une preuve insuffisante impose `undetermined`, des effets
divergents imposent `mixed` et une justification globale est conservée. La
date de revue est vérifiée comme date civile valide. Les fiches actuellement préparatoires restent sans
classification publiée. La comparaison historique réutilise exactement
les mêmes IDs en vue par thème ou par candidature, expose le niveau de
documentation et garde le suivi `realized`/`partially_realized`/`in_progress`/`modified`/`abandoned`
distinct du statut juridique et du résultat d’impact ; les fiches actuelles
restent `not_documented`. Le squelette 2027 affiche un état préparatoire vide,
sans candidature officielle ni politique imputée. Un engagement validé peut
être publié sans bilan de mandat ; le bilan est facultatif et ne doit jamais
être fabriqué pour un candidat non élu. Lorsqu’il est présent, il sépare
l’objectif initial, la décision juridique ou budgétaire, la mise en œuvre
administrative et financière et le résultat observé ; un texte adopté n’est
jamais traité comme un objectif atteint. Un écart n’est renseigné que si un
résultat observé vérifié existe et que les indicateurs sont effectivement
comparables ; sinon l’écart reste non déterminé. Un mandat officiellement en
cours ne peut pas publier un bilan définitif : il reste provisoire. Chaque bilan porte les institutions responsables,
facteurs externes, hypothèses, limites d’attribution causale, sources et date
de revue. Un rapprochement vers le registre juridique exige un identifiant
existant et une identité confirmée ; les autres rapprochements restent non
confirmés. Les mandats achevés peuvent recevoir un bilan documenté, tandis que
2022–2027 reste un suivi provisoire daté. Aucun bilan n’est actuellement
publié.
La vue `Graphiques` de l’archive présidentielle ne consomme que cette
projection validée. Elle sépare les cinq classifications et n’additionne les
montants annoncés que pour des enregistrements partageant devise, année des
prix, horizon, périmètre et cadence. Un montant financier conserve son
instrument, son statut `announced`/`voted`/`executed`, sa source et sa nature
annuelle ou pluriannuelle ; une estimation porte sa formule, variables,
unités, hypothèses, références, exclusions et incertitude. Une réduction
négative exige une base budgétaire documentée. Les données manquantes,
doublons et incompatibilités sont exclues des agrégats et comptées dans la
couverture ; elles ne deviennent jamais zéro ni classement écologique.
Les ressources territoriales du Mode École sont validées par
`apps/web/src/lib/learning/quiz/school/quiz-school-territorial-resources.test.ts`.
