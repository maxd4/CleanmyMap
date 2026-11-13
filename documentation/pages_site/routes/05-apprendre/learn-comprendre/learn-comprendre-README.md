# Apprendre - Ordres de grandeur

## Fiche canonique

- **Route** : `/learn/comprendre`
- **Fichier(s) source(s)** :
- `apps/web/src/app/learn/comprendre/page.tsx`
- `apps/web/src/app/learn/comprendre/client.tsx`
- `apps/web/src/components/learn/environmental-policy-explorer.tsx`
- `apps/web/src/components/learn/presidential-environmental-archive.tsx`
- `apps/web/src/lib/learning/policies/environmental-policy-registry.ts`
- `apps/web/src/lib/learning/policies/presidential-environmental-corpus.ts`
- **Type fonctionnel** : page éducative
- **Famille / bloc fonctionnel** : Apprendre (bloc)
- **Statut** : public
- **Contexte nécessaire** : Aucun
- **Objectif utilisateur principal** : Comprendre les notions environnementales et la méthodologie avant de passer à l'entraînement.
- **Action principale attendue** : Lire les cartes de vulgarisation, consulter la méthodologie et ouvrir le quiz.
- **Palette attendue** : yellow
- **Scope** : page de vulgarisation avec introduction visuelle, chronologie des politiques environnementales Monde prioritaire, vue France secondaire, filtres communs, archive présidentielle 2012/2017 par année et thème, cartes pédagogiques, ressources différées, lien vers `/learn/sentrainer` et méthodologie.
- **Performance** : wrapper serveur avec metadata de route et ISR à 24 h ; les interactions lourdes restent chargées à l'approche de leur section via `next/dynamic` et `use-in-view-once`.
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

Le corpus initial comprend onze fiches internationales et cinq fiches françaises : AGEC, tri à la source des biodéchets, Climat et Résilience, accélération des énergies renouvelables et Industrie verte. Les sources officielles et les dates documentaires sont renseignées, mais une revue humaine éditoriale doit encore être enregistrée avant toute exposition publique des décisions. Le registre conserve l’historique des étapes par identifiant stable, version et source ; un amendement signalé mais non contrôlé reste `needs_review` et n’est pas une nouvelle décision publiée. Les échéances DPE sont limitées aux conditions documentées par les sources officielles et la disponibilité locale des solutions biodéchets n’est pas déduite de l’obligation nationale. Aucun résultat environnemental, classement, score politique, scraping, actualisation automatique ou comparateur électoral n’est ajouté.

La même page contient une archive présidentielle secondaire pour 2012 et 2017 : elle affiche le millésime, les candidatures officielles issues des listes institutionnelles et l’origine de la source. Toutes les candidatures restent visibles même lorsque le corpus environnemental est `not_collected`. Les engagements sont filtrés par année et thème mais ne sont rendus publics qu'après validation éditoriale effective via `ContentValidationRecord` ; les entrées préparatoires et les sources seules secondaires, discours ou programmes non revus restent masqués.




## Références legacy

- Référence legacy non versionnée dans le dépôt actuel ; consulter les documents canoniques de cette page et ne pas recréer l'ancien chemin.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
