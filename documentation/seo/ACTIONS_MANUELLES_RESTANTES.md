# Actions manuelles restantes pour le SEO

Ce fichier liste ce qui ne peut pas être livré uniquement par du code dans ce dépôt.

## État Search Console

La propriété `https://cleanmymap.fr/` est ACTIVE et validée dans Google Search
Console. La homepage est indexée et Google reconnaît la canonical
`https://cleanmymap.fr/`.

## Actions manuelles récurrentes

- [ ] Consulter Google Search Console pour `https://cleanmymap.fr/`.
- [ ] Vérifier le rapport `Pages / Indexation` et les erreurs d'exploration.
- [ ] Vérifier `Sitemaps` et l'état de `sitemap.xml`.
- [ ] Inspecter les nouvelles pages publiques importantes.
- [ ] Demander manuellement une réindexation lorsqu'un changement important le justifie, pas après chaque commit.
- [ ] Contrôler les requêtes, impressions, clics et positions.
- [ ] Surveiller Core Web Vitals.
- [ ] Examiner les backlinks et les pages d'origine lorsque pertinent.
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

## Point d'attention

Ne pas simuler dans le code des actions qui dépendent d'un tiers, d'un accès DNS ou d'une validation humaine. Ces tâches doivent rester dans la gouvernance opérationnelle du site.
