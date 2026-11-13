# Apprendre - Ordres de grandeur

## Fiche canonique

- **Route** : `/learn/comprendre`
- **Fichier(s) source(s)** :
- `apps/web/src/app/learn/comprendre/page.tsx`
- `apps/web/src/app/learn/comprendre/client.tsx`
- `apps/web/src/components/learn/environmental-policy-explorer.tsx`
- `apps/web/src/lib/learning/environmental-policy-registry.ts`
- **Type fonctionnel** : page éducative
- **Famille / bloc fonctionnel** : Apprendre (bloc)
- **Statut** : public
- **Contexte nécessaire** : Aucun
- **Objectif utilisateur principal** : Comprendre les notions environnementales et la méthodologie avant de passer à l'entraînement.
- **Action principale attendue** : Lire les cartes de vulgarisation, consulter la méthodologie et ouvrir le quiz.
- **Palette attendue** : yellow
- **Scope** : page de vulgarisation avec introduction visuelle, chronologie des politiques environnementales Monde prioritaire, vue France secondaire, filtres communs, cartes pédagogiques, ressources différées, lien vers `/learn/sentrainer` et méthodologie.
- **Performance** : wrapper serveur avec metadata de route et ISR à 24 h ; les interactions lourdes restent chargées à l'approche de leur section via `next/dynamic` et `use-in-view-once`.
- **Terminée** : partielle : le registre initial est intégré en `in_review` ; aucune fiche n’est publiée avant revue humaine effective.
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

Le registre unique `environmental-policy-registry.ts` porte les corpus international et France entière, avec Paris conservé comme périmètre futur possible mais sans rubrique autonome. La vue Monde est prioritaire ; la vue France filtre les mêmes enregistrements par `countryCode: FR` et par niveau territorial. La publication passe par `ContentValidationRecord` : les fiches `draft` ou `in_review` ne sont jamais rendues publiques. Les dates de décision et d’application restent distinctes et conservent leur précision (`day`, `month`, `year`) lorsque la source ne permet pas davantage.

Le corpus initial comprend dix décisions internationales et trois lois nationales françaises. Les sources officielles et les dates documentaires sont renseignées, mais une revue humaine éditoriale doit encore être enregistrée avant toute exposition publique. Aucun résultat environnemental, classement, score politique, scraping, actualisation automatique ou comparateur électoral n’est ajouté.




## Références legacy

- Référence legacy non versionnée dans le dépôt actuel ; consulter les documents canoniques de cette page et ne pas recréer l'ancien chemin.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
