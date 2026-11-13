# Apprendre - Ordres de grandeur

## Fiche canonique

- **Route** : `/learn/comprendre`
- **Fichier(s) source(s)** :
- `apps/web/src/app/learn/comprendre/page.tsx`
- `apps/web/src/app/learn/comprendre/client.tsx`
- `apps/web/src/components/learn/environmental-policy-explorer.tsx`
- `apps/web/src/components/learn/presidential-environmental-archive.tsx`
- `apps/web/src/lib/learning/policies/environmental-policy-filtering.ts`
- `apps/web/src/lib/learning/policies/environmental-policy-registry.ts`
- `apps/web/src/lib/learning/policies/presidential-environmental-filtering.ts`
- `apps/web/src/lib/learning/policies/presidential-environmental-corpus.ts`
- **Type fonctionnel** : page éducative
- **Famille / bloc fonctionnel** : Apprendre (bloc)
- **Statut** : public
- **Contexte nécessaire** : Aucun
- **Objectif utilisateur principal** : Comprendre les notions environnementales et la méthodologie avant de passer à l'entraînement.
- **Action principale attendue** : Lire les cartes de vulgarisation, consulter la méthodologie et ouvrir le quiz.
- **Palette attendue** : yellow
- **Scope** : page de vulgarisation avec introduction visuelle, chronologie des politiques environnementales Monde prioritaire, vue France secondaire, filtres communs, archive présidentielle 2012/2017/2022 par thème prioritaire et candidat secondaire, cartes pédagogiques, ressources différées, lien vers `/learn/sentrainer` et méthodologie.
- **Performance** : wrapper serveur avec metadata de route et ISR à 24 h ; la sélection éditoriale des politiques est effectuée côté serveur et seules les fiches publiées sérialisables sont transmises au composant client ; les interactions lourdes restent chargées à l'approche de leur section via `next/dynamic` et `use-in-view-once`.
- **Terminée** : partielle : le corpus initial non exhaustif est intégré en `in_review` ; aucune fiche n’est publiée avant revue humaine effective.
- **Couleurs actuellement détectées** : yellow — canvas #fef9c3, halo rgba(234, 179, 8, 0.30)
- **Incohérences de couleurs** : Aucune incohérence de couleur détectée avec la règle actuelle.
- **Risque de conflit avec les couleurs existantes** : faible à moyen : le jaune doit rester lisible sans devenir pâle sur fond clair.
- **Niveau de surcharge textuelle** : fort
- **Textes à conserver** :
- Titre de module
- résumés
- ressources
- CTA d'apprentissage
- **Textes à réduire ou supprimer** :
- Paragraphes introductifs trop longs
- double explication
- bulle d'orientation inutile
- **Bulles / cartes / contextes trop nombreux** : Le contenu pédagogique peut rapidement s'alourdir si l'on empile des encarts d'aide.
- **Composants UI concernés** :
- Cards pédagogiques
- chapitres
- ressources
- CTA
- navigation secondaire
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : moyenne

## Politiques environnementales

Le registre unique `environmental-policy-registry.ts` porte les corpus international et France entière, avec Paris conservé comme périmètre futur possible mais sans rubrique autonome. La vue Monde est prioritaire et ne contient que le corpus international ; la vue France est un filtre national du même registre et conserve les décisions françaises réellement rattachées à `FR`. Les décisions européennes applicables en France ne sont pas dupliquées. La publication passe par `ContentValidationRecord` et `assertPublishedContent` : les fiches `draft` ou `in_review` ne sont jamais rendues publiques. Les dates d’adoption, de publication, d’entrée en vigueur, d’application, d’objectif et de déploiement restent distinctes et conservent leur précision (`day`, `month`, `year`, `unknown`) lorsque la source ne permet pas davantage. Les états historiques et d’exécution sont séparés (`modifiée`, `suspendue`, `abrogée`, `exécution non documentée`) ; aucun objectif ou mécanisme ne devient un résultat environnemental observé sans preuve indépendante. La page affiche la couverture non exhaustive et la date de consultation des sources ; elle ne se présente pas comme une actualité en direct. Le BBNJ est limité aux États parties, tandis que l’Union européenne porte explicitement ses 27 États membres.

Le corpus initial comprend onze fiches internationales et cinq fiches françaises : AGEC, tri à la source des biodéchets, Climat et Résilience, accélération des énergies renouvelables et Industrie verte. Les sources officielles et les dates documentaires sont renseignées, mais une revue humaine éditoriale doit encore être enregistrée avant toute exposition publique des décisions. La page sélectionne les fiches publiables dans son wrapper serveur ; le composant client ne reçoit que cette liste sérialisable et importe uniquement les dérivations de filtrage sans registre de contenu. Le registre conserve l’historique des étapes par identifiant stable, version et source ; une publication exige des IDs de sources, versions et jalons non vides et uniques, des `versionId` existants et des `sourceIds` résolus. Un amendement signalé mais non contrôlé reste `needs_review` et n’est pas une nouvelle décision publiée. Le filtre d’année retient une fiche dès qu’un jalon daté correspond à l’année sélectionnée, quelle que soit sa catégorie ; les thèmes exposent une clé stable indépendante du libellé fr/en. Les échéances DPE sont limitées aux conditions documentées par les sources officielles et la disponibilité locale des solutions biodéchets n’est pas déduite de l’obligation nationale. Aucun résultat environnemental, classement, score politique, scraping, actualisation automatique ou comparateur électoral n’est ajouté.

La même page contient une archive présidentielle secondaire pour 2012, 2017 et 2022 : elle affiche le millésime, les candidatures officielles issues des listes institutionnelles et l’origine de la source. Les résultats officiels du second tour identifient François Hollande comme élu en 2012 et Emmanuel Macron comme élu en 2017 et 2022 ; les périodes 2012–2017 et 2017–2022 sont marquées comme terminées, tandis que 2022–2027 est marquée comme mandat en cours. L’élu est placé en première position avec un repère bleu et le libellé « Élu »/« Elected », sans appréciation sur ses engagements environnementaux. Les résultats et dates de second tour sont sourcés par les archives officielles du ministère de l’Intérieur. `secondRoundDate` conserve la date du scrutin, tandis que la date de publication de l’archive ministérielle reste `unknown` lorsqu’elle n’est pas démontrée ; les proclamations du Conseil constitutionnel sont portées séparément avec leur date et leur source Legifrance. Le wrapper serveur produit une projection publique sans champs de validation interne : les candidatures officielles et leurs métadonnées de liste sont transmises au client, tandis que les engagements passent par `getValidatedPresidentialCommitments` et seuls ceux réellement validés sont sérialisés. Toutes les candidatures restent visibles avec un état `not_collected` ou `draft` ; pour 2022, sept professions de foi CNCCEP sont structurées avec page et URL directe, tandis que cinq candidats restent non dépouillés. Le comparateur propose les mêmes engagements par thème ou par candidature, avec un filtre de niveau de documentation, des détails de version/date/limites et un suivi distinct du statut juridique ; il ne conclut jamais à une réalisation ou à un résultat d’impact sans preuve dédiée. Les engagements ne sont rendus publics qu'après validation éditoriale effective via `ContentValidationRecord` ; les entrées préparatoires et les sources seules secondaires, discours ou programmes non revus restent masqués. Le millésime 2027 est prêt à recevoir des sources mais reste vide : aucune candidature officielle, aucun vainqueur ni aucune politique n'est prérempli.

La classification environnementale, lorsqu’elle sera publiée après revue, s’inspire des principes de lecture transversale du Budget vert français sans reproduire sa cotation officielle ni produire un score. Elle distingue l’intention du programme, l’effet attendu et l’effet observé ; elle conserve une classification globale (`favorable`, `unfavorable`, `mixed`, `neutral` ou `undetermined`) et une analyse séparée pour le climat, la biodiversité, l’eau, la pollution, les ressources et les déchets. Chaque domaine doit fournir une source primaire vérifiée, une justification, un mécanisme, des hypothèses, des limites, des incertitudes, un niveau de preuve et une date/relecture humaine. Une ambiguïté reste `undetermined`, une mesure à effets divergents reste `mixed`, et une clé de dédoublonnage empêche de compter deux fois une même mesure reformulée. Les engagements actuellement préparatoires n’ont aucune classification publiée.

Le bilan de mandat, lorsqu’il sera publié avec une fiche validée, sépare l’objectif annoncé (quantité et échéance), la décision juridique ou budgétaire, la mise en œuvre administrative et financière, puis le résultat observé (unité, période et source). Un texte adopté ne vaut pas objectif atteint. L’écart n’est calculé que si les indicateurs sont comparables ; les responsabilités institutionnelles, facteurs externes, hypothèses et limites d’attribution causale sont exposés. Les rapprochements vers `environmental-policy-registry.ts` exigent un identifiant de politique existant et une identité confirmée ; sinon ils restent non confirmés. Les mandats 2012–2017 et 2017–2022 peuvent recevoir un bilan documenté, tandis que 2022–2027 ne peut afficher qu’un suivi provisoire daté. Les fiches actuelles ne comportent encore aucun bilan publié.




## Références legacy

- Référence legacy non versionnée dans le dépôt actuel ; consulter les documents canoniques de cette page et ne pas recréer l'ancien chemin.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
