# Stratégie SEO/AEO/GEO/AIO/SXO CleanMyMap

Ce document définit la stratégie de visibilité web pour CleanMyMap, différenciation avec "CleanMyMac" et optimisation pour les moteurs de recherche et assistants IA.

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
- cleanwalk Paris
- dépollution urbaine Paris
- carte propreté Paris
- signalement déchets Paris
- benevolat proprete

### Lexique écologique
- écologie, développement durable
- transition écologique
- action citoyenne
- bénévolat, engagement
- partenariat, entraide
- coordination, mutualisation
- impact terrain, valorisation des déchets

### Différenciation CleanMyMac
- Focus sur "carte" + "France/Paris"
- Vocabulaire: dépollution, propreté, signalement
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
- [ ] Vérifier le sitemap (16 pages)
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

- Toujours utiliser .fr pour les URLs françaises
- Préférer les mots-clés longue traine
- Maintenir un ratio mots-clés densité naturelle
- Prioriser le contenu de qualité >= quantité

## Roadmap 2026

### Mi-Mai (15-31 Mai)
- [ ] Audit pages sitemap (16 pages)
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

---

*Dernière mise à jour: Mai 2026*
*Prochaine revue: Mi-Mai 2026*