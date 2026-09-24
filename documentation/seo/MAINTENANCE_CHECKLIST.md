# Checklist Maintenance SEO CleanMyMap

La propriété Google Search Console `https://cleanmymap.fr/` est ACTIVE et
validée. La homepage est indexée et sa canonical est reconnue. Les contrôles
ci-dessous sont des actions humaines récurrentes ; aucune ouverture de
Search Console ne doit être simulée par la CI ou par le code.

## SEARCH_CONSOLE_MONTHLY

- [ ] Ouvrir Google Search Console pour `https://cleanmymap.fr/`
- [ ] Vérifier `Pages / Indexation`
- [ ] Comparer pages découvertes, indexées et exclues
- [ ] Examiner les motifs d'exclusion nouveaux
- [ ] Vérifier les erreurs d'exploration
- [ ] Vérifier `Sitemaps`
- [ ] Vérifier que `sitemap.xml` est lisible et sans erreur persistante
- [ ] Inspecter les nouvelles pages publiques stratégiques publiées durant le mois
- [ ] Demander une indexation uniquement lorsqu'elle est utile, pas pour chaque commit
- [ ] Vérifier `Performances`
- [ ] Relever les principales requêtes Google
- [ ] Surveiller `CleanMyMap`, les requêtes métier et les éventuelles confusions avec `CleanMyMac`
- [ ] Relever impressions, clics, CTR et positions sans transformer ces métriques en objectifs artificiels
- [ ] Vérifier Core Web Vitals
- [ ] Vérifier les liens externes significatifs
- [ ] Consigner les anomalies nécessitant un chantier technique

Google recrawl normalement les pages automatiquement. Les changements mineurs
n'exigent pas de demande manuelle d'indexation. Search Console ne doit pas être
« mise à jour » à chaque déploiement ; la revue manuelle de routine est
mensuelle. Une inspection ad hoc est pertinente après une nouvelle page
stratégique, une canonical, une migration, une correction d'indexabilité, une
modification majeure de contenu ou un changement d'identité SEO.

## Hebdomadaire (facultatif)

- [ ] Tester les pages publiques principales en HTTP
- [ ] Relever une erreur 5xx ou une rupture manifeste de canonical si elle est signalée

## Trimestriel
- [ ] Auditer les schemas et n'en ajouter que lorsqu'un contenu visible les justifie
- [ ] Audit backlinks - examiner les liens significatifs et les anomalies
- [ ] Analyser les positions mots-clés principaux
- [ ] Mettre à jour les descriptions si changement fonctionnalité
- [ ] Vérifier les concurrents et mots-clés associés

## Annuel
- [ ] Refonte complète des мета données
- [ ] Audit technique complet (Vitesse, Mobile, Indexation)
- [ ] Mise à jour de `apps/web/src/app/robots.ts` si le périmètre d'exploration change
- [ ] Revoir la stratégie de mots-clés
- [ ] Vérifier les redirections permanentes (301)
- [ ] Créer un rapport annuel SEO

## Signaux d'alerte

### Urgent - Action immédiate
- Pages non indexées (Check sitemap.xml)
- Erreurs 5xx server
- Contenu dupliqué détecté

### Important - À traiter sous 1 semaine
- Baisse de positionnement significative
- Erreurs 404 (liens cassés)
- Temps de chargement > 3s mobile

### Normal - À traiter ce mois
- Images sans alt texte
- Liens internes cassés
- Métadonnées manquantes sur nouvelles pages

## Commandes utiles

```bash
# TypeScript
npm run typecheck

# Lint
npm run lint

# Build test
npm run build
```

## Ressources
- Google Search Console: https://search.google.com/search-console
- Schema.org: https://schema.org
- Google Rich Results: https://search.google.com/test/rich-results
- Tâches manuelles restantes: [ACTIONS_MANUELLES_RESTANTES.md](./ACTIONS_MANUELLES_RESTANTES.md)

---

## Rappel mensuel maintenable

Aucun mécanisme de rappel périodique développeur existant ne porte aujourd'hui
la revue Search Console. Le dépôt conserve donc ce rappel documentaire léger,
non bloquant, dans cette checklist et dans `SEO_STRATEGY.md`. Il pointe vers une
action humaine et ne stocke aucun identifiant Google, ne simule aucun clic et ne
fait jamais échouer la CI.

## Contrat de route à vérifier lors d'une évolution

- [ ] Vérifier la matrice `ACCESS / SEARCH / DISCOVERY / CANONICAL` dans
      `documentation/pages_site/INDEX.md`.
- [ ] Pour une nouvelle page publique, confirmer la présence du contrat dans la
      source canonique d'indexabilité et dans le sitemap si `DISCOVERY=SITEMAP`.
- [ ] Pour une page privée, utilitaire ou alias, confirmer `NOINDEX` et
      l'absence du sitemap selon la matrice.
- [ ] Vérifier qu'aucune canonical `/learn` ni version anglaise `en-US` n'est
      inventée.

---

*À compléter chaque mois par une personne habilitée*
