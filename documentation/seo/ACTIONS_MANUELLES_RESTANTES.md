# Actions manuelles restantes pour le SEO

Ce fichier liste ce qui ne peut pas être livré uniquement par du code dans ce dépôt.

## État Search Console

La propriété `https://cleanmymap.fr/` est ACTIVE et validée dans Google Search
Console. La homepage est indexée et Google reconnaît la canonical
`https://cleanmymap.fr/`.

La validation initiale de la propriété et son activation ne sont plus des
actions à réaliser dans ce lot documentaire. Search Console reste toutefois un
service externe : aucune de ses actions ne peut être déclarée exécutée par les
tests locaux ou par un déploiement.

## SEARCH_CONSOLE_MONTHLY

- [ ] Consulter Google Search Console pour `https://cleanmymap.fr/`.
- [ ] Vérifier `Pages / Indexation`.
- [ ] Comparer les pages découvertes, indexées et exclues.
- [ ] Examiner les motifs d'exclusion nouveaux.
- [ ] Vérifier les erreurs d'exploration.
- [ ] Vérifier `Sitemaps` et l'état de `sitemap.xml`.
- [ ] Inspecter les nouvelles pages publiques stratégiques publiées durant le mois.
- [ ] Demander manuellement une indexation uniquement lorsqu'un changement
      important le justifie, pas après chaque commit.
- [ ] Vérifier `Performances`.
- [ ] Relever les principales requêtes Google.
- [ ] Surveiller `CleanMyMap`, les requêtes métier et les éventuelles
      confusions avec `CleanMyMac`.
- [ ] Relever impressions, clics, CTR et positions sans en faire des objectifs
      artificiels.
- [ ] Vérifier Core Web Vitals.
- [ ] Examiner les backlinks et les pages d'origine lorsque pertinent.
- [ ] Consigner les anomalies nécessitant un chantier technique.
- [ ] Créer une fiche Google Business Profile uniquement si l'activité est éligible et si une adresse réelle est disponible.
- [ ] Configurer les redirections au niveau du domaine et de l'hébergement pour garantir une seule URL canonique.
- [ ] Vérifier que `https://cleanmymap.fr`, `https://www.cleanmymap.fr` et les variantes `http` redirigent bien vers l'URL canonique retenue.
- [ ] Obtenir des backlinks éditoriaux depuis des partenaires pertinents avec des ancres naturelles.
- [ ] Publier ou actualiser les mentions de marque sur les profils externes réellement utilisés.

La revue manuelle de routine est mensuelle. Google recrawl normalement les
pages automatiquement ; les changements mineurs ne nécessitent pas de demande
manuelle d'indexation. Une inspection ad hoc reste pertinente après une
nouvelle page stratégique, une canonical, une migration, une correction
d'indexabilité, une modification majeure de contenu ou un changement
d'identité SEO.

## Ce que le code couvre déjà

- Métadonnées globales et par page.
- `robots.ts` et `sitemap.ts`.
- Données structurées JSON-LD.
- Canonicalisation des URLs dans les métadonnées.

Le contrat cible des routes et de leurs axes `ACCESS / SEARCH / DISCOVERY /
CANONICAL` est documenté dans
[`documentation/pages_site/INDEX.md`](../pages_site/INDEX.md). L'alignement
du runtime reste un chantier technique séparé ; cette page ne simule pas son
déploiement.

## Point d'attention

Ne pas simuler dans le code des actions qui dépendent d'un tiers, d'un accès DNS ou d'une validation humaine. Ces tâches doivent rester dans la gouvernance opérationnelle du site.
