# SEO — index de propriétaires

**Statut : `CURRENT` pour l'orientation documentaire, pas pour l'état externe de Google.**

| Besoin | Source canonique | Consommateur |
|---|---|---|
| Positionnement et vocabulaire SEO/AEO/GEO/SXO | [SEO_STRATEGY.md](./SEO_STRATEGY.md) | Contenu réellement publié |
| Revue Search Console, DNS, GBP, backlinks et triage | [ACTIONS_MANUELLES_RESTANTES.md](./ACTIONS_MANUELLES_RESTANTES.md) | Contrôle humain externe |
| `ACCESS / SEARCH / DISCOVERY / CANONICAL` | [pages_site/INDEX.md](../pages_site/INDEX.md) | Fiches route-first protégées |
| Indexabilité, noindex, redirects | `apps/web/src/lib/seo/indexability.ts` | Tests SEO |
| Sitemap et robots | `apps/web/src/app/sitemap.ts`, `apps/web/src/app/robots.ts` | Runtime de crawl |
| Metadata et JSON-LD | Layout/page et `apps/web/src/components/seo/structured-data/` | HTML et contenu visible |

## Ajouter une page

1. Décider les quatre axes dans l'index maître et vérifier la route réelle.
2. Pour une page indexable avec `DISCOVERY=SITEMAP`, ajuster `indexability.ts` et vérifier `sitemap.ts`. Ne jamais promouvoir une page privée, un alias ou un utilitaire `NOINDEX` par erreur.
3. Vérifier metadata, canonical, robots, redirects, H1, maillage interne et protections AuthN/AuthZ des mutations sur les pages hybrides.
4. JSON-LD seulement si le même contenu est visible. `WebSiteJsonLd` est le schéma global documenté, pas `Organization` tant que le statut juridique ne le justifie pas. Aucun FAQ/HowTo/avis synthétique.
5. Valider tests d'indexabilité, sitemap et metadata ; l'inspection Search Console après publication est manuelle.

`/en` redirige vers `/` sans `hreflang en-US` canonique. `/learn` n'est pas une page canonique.

## Preuve externe

Les documents historiques rapportent une propriété Search Console validée et l'indexation de la homepage `https://cleanmymap.fr/`. **Ce lot n'a pas consulté Google Search Console** : ne pas présenter cette donnée comme une nouvelle observation.
