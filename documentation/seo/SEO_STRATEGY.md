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
- `apps/web/src/app/sitemap.ts` - Liste des pages (16 actuellement)
- `apps/web/src/app/robots.txt` - Directives crawl + AI bots

### Schemas JSON-LD
- `apps/web/src/components/seo/structured-data.tsx` - Tous les schemas

## Schemas JSON-LD disponibles

```typescript
// Organization - Trust signals
import { OrganizationJsonLd } from "@/components/seo/structured-data";

// WebSite - Search action
import { WebSiteJsonLd } from "@/components/seo/structured-data";

// HowTo - Guides pas à pas
import { HowToDeclareActionJsonLd } from "@/components/seo/structured-data";
import { HowToSignalPollutionJsonLd } from "@/components/seo/structured-data";
import { HowToJoinCleanwalkJsonLd } from "@/components/seo/structured-data";
import { HowToJoinCommunityJsonLd } from "@/components/seo/structured-data";

// FAQ - Questions fréquentes
import { FAQJsonLd } from "@/components/seo/structured-data";

// Trust signals
import { ReviewJsonLd } from "@/components/seo/structured-data";

// Navigation
import { BreadcrumbJsonLd } from "@/components/seo/structured-data";
import { WebPageJsonLd } from "@/components/seo/structured-data";
import { SiteNavigationJsonLd } from "@/components/seo/structured-data";
```

## Maintenance SEO

### Checklist mensuelle
- [ ] Vérifier le sitemap
- [ ] Tester les мета descriptions
- [ ] Valider les schemas JSON-LD
- [ ] Checker les redirections .com → .fr

### Trimestriel
- [ ] Audit backlinks
- [ ] Analyse concurrentielle
- [ ] Mise à jour FAQ
- [ ] Ajout de nouveaux HowTo

### Annuel
- [ ] Révision complète metadata
- [ ] Audit performance Core Web Vitals
- [ ] Mise à jour mots-clés
- [ ] Revuerobots.txt et AI directives

## Pages avec metadata

| Page | Status | À améliorer |
|------|--------|-------------|
| / | ✅ | - |
| /explorer | ✅ | - |
| /observatoire | ✅ | - |
| /reports | ✅ | - |
| /methodologie | ✅ | - |
| /learn | ✅ | - |
| /learn/comprendre | ✅ | - |
| /learn/bonnes-pratiques | ✅ | - |
| /mentions-legales | ✅ | - |
| /en | ✅ | - |
| /actions/new | ✅ | - |
| /dashboard | ✅ | - |
| /profil | ✅ | - |

## Prochaines améliorations suggérées

1. ✅ **Article schema** pour articles du blog/ressources (fait)
2. ✅ **Event schema** pour cleanwalks organisés (fait)
3. ✅ **VideoObject** pour tutoriels (fait)
4. **Schema Q&A** pour pages méthodologiques
5. **Sitelinks Searchbox** pour Google

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

## Roadmap 2026

### Mi-Mai (15-31 Mai)
- [ ] Audit pages sitemap
- [ ] Test Rich Results complet
- [ ] Vérification indexation
- [ ] Ajouter schema Event
- [ ] FAQ +2 questions

### Début Juin (1-15 Juin)
- [ ] Analyse positions mots-clés
- [ ] Audit liens internes
- [ ] Schema Article
- [ ] Core Web Vitals mobile
- [ ] Metadata /actions/new, /dashboard, /profil

### Mi-Juin (15-30 Juin)
- [ ] Rapport trimestriel
- [ ] Schema VideoObject
- [ ] Audit backlinks
- [ ] Mise à jour mots-clés été
- [ ] Vérification redirections .com → .fr

## Cadre éditorial cible

- Périmètre principal: France entière
- Périmètres secondaires: région, département, commune, quartier, arrondissement si pertinent
- Dans les titres et descriptions, privilégier les usages métier plutôt qu'un ancrage géographique unique
- Réserver les mentions locales à des pages, filtres ou exemples réellement ciblés

---

*Dernière mise à jour: Mai 2026*
*Prochaine revue: Mi-Mai 2026*
