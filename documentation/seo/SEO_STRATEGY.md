# Stratégie SEO/AEO/GEO/AIO/SXO CleanMyMap

Ce document définit la stratégie de visibilité web pour CleanMyMap, la différenciation avec "CleanMyMac" et l'optimisation pour les moteurs de recherche et assistants IA sur un périmètre national.

## Axes d'optimisation

| Axe | Objectif | Priorité |
|-----|----------|----------|
| SEO | Visibilité Google classique | Haute |
| AEO | Réponses dans les "PAA" et assistants | Haute |
| GEO | Visibilité dans résultats IA (Perplexity, ChatGPT) | Moyenne |
| AIO | Optimisation pour indexation IA | Moyenne |
| SXO | Expérience utilisateur recherche | Haute |

## Mots-clés stratégiques

### Mots-clés principaux (France)
- cleanwalk France
- dépollution urbaine
- carte propreté
- signalement déchets
- bénévolat propreté
- actions citoyennes locales
- réseau propreté nationale

### Lexique écologique
- écologie, développement durable
- transition écologique
- action citoyenne
- bénévolat, engagement
- partenariat, entraide
- coordination, mutualisation
- impact terrain, valorisation des déchets

### Différenciation CleanMyMac
- Focus sur "carte" + "France"
- Vocabulaire: dépollution, propreté, signalement, coordination, impact
- Pas de mention "Mac" ou "cleanup software"

## Fichiers clés

### Métadonnées
- `apps/web/src/lib/metadata.ts` - Métadonnées globales et mots-clés
- `apps/web/src/app/**/layout.tsx` - Métadonnées par section
- `apps/web/src/app/**/page.tsx` - Métadonnées par page

### Sitemap et robots
- `apps/web/src/app/sitemap.ts` - Projection technique du périmètre `SITEMAP`
  défini dans l'index maître des pages ; les anciens repères de 16 ou 27 URLs
  ne sont pas un contrat durable et ne doivent plus être cités comme état
  cible.
- `apps/web/src/app/robots.ts` - Directives crawl + AI bots

Le sitemap n'expose `lastModified` que lorsqu'une date réelle de modification
par page est disponible ; aucune date de génération ne doit servir de date de
modification.

### Schemas JSON-LD
- `apps/web/src/components/seo/structured-data/` - Tous les schemas

## Données structurées rendues

Le layout racine rend `OrganizationJsonLd` et `WebSiteJsonLd`. Les autres
helpers du dossier `apps/web/src/components/seo/structured-data/` ne sont pas
rendus par le runtime et ne constituent pas une preuve de contenus publiés.
Un schema FAQ, avis, événement, article, vidéo ou guide doit être relié à une
source réelle et décrire le contenu effectivement visible sur la page.

## Contrat route-first

La matrice durable `ACCESS / SEARCH / DISCOVERY / CANONICAL` se trouve dans
[`documentation/pages_site/INDEX.md`](../pages_site/INDEX.md). Elle est la
référence pour arbitrer une page avant toute modification du sitemap, des
robots, des metadata ou des redirects. Les valeurs runtime
`public-visible`, `clerk-context`, `blur`, `disabled` et `protected` décrivent
l'accès ou la présentation ; elles ne suffisent pas à conclure à
l'indexabilité.

Les routes hybrides `/actions/new`, `/signalement`, `/reports` et
`/sections/rejoindre-une-action` sont indexables selon cette matrice, tout en
conservant leurs mutations et données personnelles derrière AuthN/AuthZ. Les
routes privées et utilitaires non indexables restent hors sitemap. `/explorer`
reste une page publique non indexable, découverte par le maillage interne et
hors du sitemap courant. `/en` est un alias vers `/` et ne correspond à aucune
version anglaise `en-US` ;
aucune page canonique `/learn` n'existe actuellement.

## Maintenance SEO

### SEARCH_CONSOLE_MONTHLY

Google Search Console est **ACTIVE et validée** pour
`https://cleanmymap.fr/`. La homepage est indexée et Google reconnaît la
canonical `https://cleanmymap.fr/`. Cette information est un état externe
observé ; le dépôt ne simule aucune action Search Console.

- [ ] Ouvrir Google Search Console pour `https://cleanmymap.fr/`
- [ ] Vérifier `Pages / Indexation`
- [ ] Comparer les pages découvertes, indexées et exclues
- [ ] Examiner les motifs d'exclusion nouveaux
- [ ] Vérifier les erreurs d'exploration
- [ ] Vérifier `Sitemaps`
- [ ] Vérifier que `sitemap.xml` est lisible et sans erreur persistante
- [ ] Inspecter les nouvelles pages stratégiques publiées durant le mois
- [ ] Demander une indexation uniquement lorsqu'elle est utile, pas pour chaque commit
- [ ] Vérifier `Performances`
- [ ] Relever les principales requêtes Google
- [ ] Surveiller `CleanMyMap`, les requêtes métier et les confusions éventuelles avec `CleanMyMac`
- [ ] Relever impressions, clics, CTR et positions sans en faire des objectifs artificiels
- [ ] Vérifier Core Web Vitals
- [ ] Vérifier les liens externes significatifs
- [ ] Consigner les anomalies nécessitant un chantier technique

Google recrawl normalement les pages automatiquement. Les changements mineurs
n'exigent pas une demande manuelle d'indexation et Search Console ne doit pas
être « mise à jour » à chaque déploiement. La revue de routine est mensuelle ;
une inspection ad hoc est pertinente après une nouvelle page stratégique, un
changement de canonical, une migration, une correction d'indexabilité, une
modification majeure de contenu ou un changement d'identité SEO.

### Trimestriel
- [ ] Audit backlinks
- [ ] Analyse concurrentielle
- [ ] Mise à jour FAQ
- [ ] Ajout de nouveaux HowTo

### Annuel
- [ ] Révision complète metadata
- [ ] Audit performance Core Web Vitals
- [ ] Mise à jour mots-clés
- [ ] Revoir `robots.ts` et les directives AI

## Pages avec metadata

| Page | Status | À améliorer |
|------|--------|-------------|
| / | ✅ | - |
| /explorer | ✅ | - |
| /reports | ✅ | - |
| /methodologie | ✅ | - |
| /learn | Pas de page canonique | Ne pas utiliser comme canonical cible |
| /learn/comprendre | ✅ | - |
| /learn/bonnes-pratiques | ✅ | - |
| /mentions-legales | ✅ | - |
| /en | Alias | Redirection vers `/`, pas une page canonique ni un `hreflang` `en-US` |
| /actions/new | Hybride indexable | La préparation est publique ; les mutations et données personnelles restent protégées |
| /signalement | Hybride indexable | La préparation est publique ; la transmission, les preuves et la boucle propriétaire restent protégées |
| /sections/rejoindre-une-action | Hybride indexable | La lecture est publique ; rejoindre et traiter une demande restent protégés |
| /dashboard | Privée / noindex | Hors périmètre SEO public |
| /profil | Privée / noindex | Hors périmètre SEO public |

## Règle pour les futures améliorations

Les schemas Article, Event, VideoObject, Review, HowTo et FAQ restent
conditionnels à une source publiée et à un contenu visible correspondant. Leur
présence dans le code ne constitue pas une tâche à activer : aucune donnée
structurée ne doit être ajoutée pour remplir un objectif SEO abstrait.

## Ce qui reste manuel

Voir [ACTIONS_MANUELLES_RESTANTES.md](./ACTIONS_MANUELLES_RESTANTES.md) pour Search Console, Google Business Profile, backlinks et redirections DNS.

## Outils de validation

- Google Rich Results Test
- Schema.org validator
- Lighthouse SEO audit
- Google Search Console

## Notes

- Toujours utiliser `.fr` pour les URLs françaises
- Préférer les mots-clés longue traîne
- Maintenir un ratio mots-clés / densité naturelle
- Prioriser le contenu de qualité sur la quantité
- Garder `arrondissement` comme terme de compatibilité ou de précision locale, pas comme cadre principal de positionnement

## Suivi récurrent

La revue Search Console mensuelle est la cadence opérationnelle canonique.
Les audits de liens, Core Web Vitals, requêtes, indexation et redirections sont
à déclencher selon cette checklist et les changements réels du produit ; ils ne
constituent pas une roadmap de schemas ou de contenu artificiel.

## Cadre éditorial cible

- Périmètre principal: France entière
- Périmètres secondaires: région, département, commune, quartier, arrondissement si pertinent
- Dans les titres et descriptions, privilégier les usages métier plutôt qu'un ancrage géographique unique
- Réserver les mentions locales à des pages, filtres ou exemples réellement ciblés

---

*Dernière mise à jour: Septembre 2026*
*Prochaine revue: revue Search Console mensuelle*
