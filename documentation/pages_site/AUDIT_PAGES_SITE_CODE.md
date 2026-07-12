# Audit `documentation/pages_site` ↔ code runtime

## Référence

```txt
Dépôt : maxd4/CleanmyMap
Branche : main
Commit audité : 8c8e4a8d7501ce8787c31cfd15f7cde0acab5d61
Dossier : documentation/pages_site/
```

## Résumé exécutif

`documentation/pages_site/` a une fonction importante et cohérente : servir de registre documentaire **route-first** des pages et rubriques du site du point de vue utilisateur.

Il doit documenter, pour chaque route :

- rôle ;
- contenu ;
- parcours ;
- comportement fonctionnel ;
- UX/UI ;
- états ;
- captures ;
- améliorations propres à la page.

Les détails transversaux d'architecture, sécurité, tests et services doivent rester dans les dossiers techniques adaptés.

Le principe est bon. L'exécution actuelle présente toutefois plusieurs dérives importantes :

1. `INDEX.md` se déclare exhaustif alors qu'il ne couvre pas toutes les routes/rubriques du runtime.
2. `generate-canonical-pages.mjs` est obsolète et dangereux à exécuter dans son état actuel.
3. Les statuts d'accès de plusieurs pages sont faux par rapport au proxy et à `clerk-access.ts`.
4. Plusieurs audits de couleur sont périmés par rapport au vrai resolver `page-families`.
5. Des routes existantes n'ont pas de dossier canonique.
6. Des dossiers sont déclarés finalisés alors que leur contrat fonctionnel n'est pas terminé.
7. Les règles de captures sont contradictoires selon les fichiers.
8. Le sitemap et la documentation Apprendre divergent.
9. La documentation produit, le registre de rubriques, l'index pages_site et le runtime ne partagent pas encore une source unique de vérité.

---

# 1. À quoi sert `documentation/pages_site`

La fonction canonique du dossier est définie par :

```txt
documentation/pages_site/README.md
documentation/pages_site/INDEX.md
```

Le modèle voulu est :

```txt
route runtime
→ famille documentaire
→ dossier canonique
→ README fonctionnel
→ présentation détaillée
→ propositions actives
→ mémoire des idées écartées
```

Pour une page canonique, le noyau documentaire attendu est :

```txt
nom-de-page-README.md
nom-de-page-presentation-detaillee.md
nom-de-page-liste-propositions-a-traiter.md
nom-de-page-objectifs-non-pertinents.md
```

Les captures doivent être centralisées au niveau du bloc ou de la famille.

Le dossier ne doit pas devenir une copie de l'architecture technique. Il doit répondre à la question :

> Que fait cette page pour l'utilisateur, dans quels états, avec quel parcours, et comment sait-on que la documentation correspond encore au runtime ?

---

# 2. Priorités

## P0 — Corriger avant toute nouvelle génération documentaire

### P0-01 — `generate-canonical-pages.mjs` ne doit pas être exécuté en l'état

Fichier :

```txt
documentation/pages_site/generate-canonical-pages.mjs
```

Problèmes confirmés :

- la liste `entries` est codée en dur ;
- elle omet plusieurs routes apparues ensuite ;
- le scan réel des `page.tsx` ne sert qu'à retrouver le fichier source de routes déjà présentes dans `entries` ;
- les routes découvertes ne sont pas automatiquement ajoutées à l'inventaire ;
- le script possède son propre resolver de couleurs, séparé du runtime ;
- le script possède sa propre classification d'accès ;
- il crée `photo/` dans chaque route ;
- il écrit des fichiers génériques `README.md` ;
- il réécrit les README de familles ;
- il réécrit `INDEX.md` ;
- il réécrit le README racine de `pages_site`.

Cela viole les conventions actuelles :

```txt
préfixe obligatoire des fichiers
un dossier photo centralisé par bloc
une seule source de vérité runtime
```

Risque concret :

> Une exécution du script peut recréer des doublons, écraser des docs enrichies manuellement, réintroduire une ancienne structure photo et retirer des routes plus récentes de l'index.

Action recommandée :

1. ne plus exécuter ce script tant qu'il n'est pas corrigé ;
2. le transformer en **audit non destructif** par défaut ;
3. ne permettre l'écriture qu'avec un flag explicite ;
4. lire les routes depuis le code/registre ;
5. lire les familles depuis le runtime ;
6. ne jamais écraser une fiche enrichie automatiquement ;
7. générer un rapport de différences au lieu de remplacer les fichiers.

---

### P0-02 — `INDEX.md` n'est pas exhaustif

`INDEX.md` affirme :

```txt
Chaque route codée du repo y est inventoriée.
```

Cette affirmation est fausse dans l'état audité.

Routes/rubriques runtime absentes ou incomplètement représentées :

```txt
/sections/weather
/sections/recycling
/sections/compost
/sections/climate
/sections/dm
/sections/guide
/community
/messagerie
/partners/network/pepite
```

Deux routes sont explicitement reconnues par l'index comme non documentées :

```txt
/learn/ecole
/admin/quiz-bank
```

Actions :

- corriger l'inventaire ;
- distinguer clairement :
  - route canonique ;
  - route dynamique ;
  - alias ;
  - redirection ;
  - surface intégrée ;
  - route technique ;
- ne pas créer quatre fichiers complets pour une simple redirection si le README racine dit qu'un alias n'est pas une page autonome.

---

### P0-03 — Ajouter un garde-fou automatique route ↔ documentation

Créer un script dédié, par exemple :

```txt
scripts/check-pages-site-route-drift.mjs
```

Il doit comparer au minimum :

```txt
apps/web/src/app/**/page.tsx
apps/web/src/lib/sections-registry/config.ts
apps/web/src/lib/ui/page-families/
documentation/pages_site/INDEX.md
documentation/pages_site/routes/
```

Sorties attendues :

```txt
route code sans entrée docs
entrée docs sans route code
section registre sans fiche docs
alias code non inventorié
fiche pointant vers un fichier source absent
dossier canonique absent
noyau de 4 fichiers incomplet
doublon de route canonique
```

Le script doit être non destructif.

---

# 3. Dossiers manquants ou incomplets

## 3.1 Confirmé manquant — Mode École

Route existante :

```txt
/learn/ecole
```

Code :

```txt
apps/web/src/app/learn/ecole/page.tsx
```

Documentation actuelle :

```txt
Mode École du quiz (fiche à créer)
```

Dossier canonique à créer :

```txt
documentation/pages_site/routes/05-apprendre/learn-ecole/
```

Noyau requis :

```txt
learn-ecole-README.md
learn-ecole-presentation-detaillee.md
learn-ecole-liste-propositions-a-traiter.md
learn-ecole-objectifs-non-pertinents.md
```

Mettre aussi à jour :

```txt
documentation/pages_site/INDEX.md
documentation/pages_site/routes/05-apprendre/apprendre-README.md
```

---

## 3.2 Confirmé manquant — Banque de quiz admin

Route inventoriée :

```txt
/admin/quiz-bank
```

Documentation actuelle :

```txt
Banque de quiz (fiche à créer)
```

Dossier canonique à créer :

```txt
documentation/pages_site/routes/09-admin-superadmin/admin-quiz-bank/
```

Noyau requis :

```txt
admin-quiz-bank-README.md
admin-quiz-bank-presentation-detaillee.md
admin-quiz-bank-liste-propositions-a-traiter.md
admin-quiz-bank-objectifs-non-pertinents.md
```

Mettre aussi à jour :

```txt
documentation/pages_site/routes/09-admin-superadmin/admin-superadmin-README.md
```

---

## 3.3 Confirmé absent de la famille Agir — Organiser une action

Le registre runtime contient :

```txt
/sections/weather
```

Label :

```txt
Organiser une action
```

La matrice produit l'inclut dans le bloc Agir.

Mais :

```txt
documentation/pages_site/routes/02-agir/agir-README.md
```

ne l'inventorie pas.

Dossier proposé :

```txt
documentation/pages_site/routes/02-agir/weather/
```

Noyau :

```txt
weather-README.md
weather-presentation-detaillee.md
weather-liste-propositions-a-traiter.md
weather-objectifs-non-pertinents.md
```

---

## 3.4 Rubriques runtime sans présence claire dans l'index pages_site

Le registre runtime contient :

```txt
/sections/recycling
/sections/compost
/sections/climate
```

Elles ne sont pas dans l'index audité.

Avant création des dossiers, décider leur famille canonique.

État du registre :

```txt
recycling → category terrain
compost   → category terrain
climate   → category analysis
```

Décision à prendre :

- `recycling` et `compost` restent-ils dans Agir ?
- doivent-ils rejoindre Apprendre ?
- `climate` appartient-il à Cartographie & Impact ou Apprendre ?

Ne pas créer les dossiers avant cette décision de classement, sinon on risque d'ancrer une mauvaise architecture documentaire.

---

## 3.5 Alias runtime à inventorier sans créer de fausses pages

Alias confirmés :

```txt
/sections/dm → /sections/messagerie?tab=dm
/sections/guide → /sections/weather
/community → /sections/community
/messagerie → /sections/messagerie
/partners/network/pepite → /sections/community?tab=partners
```

Recommandation :

- les ajouter à l'index comme alias/redirections ;
- pointer vers la fiche canonique cible ;
- éviter un noyau de quatre fichiers pour chaque alias technique.

---

# 4. Incohérences d'accès : docs ↔ runtime

## 4.1 `/actions/map`

Documentation :

```txt
Statut : protégé
Contexte : compte connecté
```

Runtime :

- la route n'est pas protégée par le proxy ;
- elle figure dans le sitemap public ;
- le code de page ne contient pas de garde d'authentification.

Verdict :

```txt
documentation obsolète
```

À corriger dans :

```txt
documentation/pages_site/INDEX.md
documentation/pages_site/routes/03-cartographie-impact/cartographie-impact-README.md
documentation/pages_site/routes/03-cartographie-impact/actions-map/actions-map-README.md
```

---

## 4.2 `/reports`

Documentation :

```txt
Statut : protégé
Contexte : compte connecté
```

Runtime :

```txt
getAppRouteClerkAccessMode("/reports") = visible
```

La route n'est pas dans la liste des pages protégées du proxy.

Verdict :

```txt
documentation obsolète
```

À corriger dans :

```txt
INDEX.md
cartographie-impact-README.md
reports-README.md
```

---

## 4.3 Sections dont l'accès documentaire est faux

Runtime `clerk-access.ts` :

```txt
visible :
  climate
  weather
  route
  recycling
  open-data
  funding
  actors

disabled :
  annuaire
  community
  gamification
  elus

blur :
  messagerie
  trash-spotter
```

Documentation actuelle classe plusieurs de ces pages simplement comme :

```txt
protégé
```

ou même :

```txt
public
```

Exemples à corriger :

```txt
/sections/route
/sections/open-data
/sections/funding
/sections/actors
/sections/community
/sections/annuaire
/sections/messagerie
/sections/trash-spotter
/sections/gamification
/sections/elus
```

Recommandation :

remplacer les statuts vagues par une taxonomie alignée sur le runtime :

```txt
public-visible
auth-blur-preview
auth-disabled-gate
protected
admin-only
max-only
redirect
```

---

# 5. Incohérences de familles et couleurs

## 5.1 Le générateur ne lit pas le resolver runtime

Le runtime utilise :

```txt
apps/web/src/lib/ui/page-families/resolve-page-family.ts
```

Le générateur documentaire possède une copie logique séparée :

```txt
expectedToneKeyForRoute(...)
resolveBackdropToneKey(...)
```

Conséquence :

```txt
la documentation peut annoncer un état couleur qui n'est plus celui du code
```

Action :

- supprimer la logique dupliquée ;
- importer le resolver runtime ou une source de métadonnées partagée ;
- ne pas recalculer les familles à la main.

---

## 5.2 `/methodologie` est documentée rouge mais le runtime la résout sky

Documentation actuelle :

```txt
Palette attendue : red
Couleurs détectées : red
Incohérence : aucune
Terminée : oui
```

Runtime :

```txt
METHODOLOGIE_FAMILY
backdropToneKey: sky
hero: sky
card: CARTO_IMPACT_SKY_CARD
```

Verdict :

```txt
fiche directement fausse
```

À corriger :

```txt
documentation/pages_site/routes/03-cartographie-impact/methodologie/methodologie-README.md
documentation/pages_site/INDEX.md
```

Puis décider si :

```txt
A. le code sky est voulu
B. la doc red est la cible et le code doit changer
```

Ne pas marquer « terminé » tant que cette décision n'est pas résolue.

---

## 5.3 `/sections/community` est documentée comme slate actuel, mais le runtime la résout pink

Documentation :

```txt
Couleurs actuellement détectées : slate
Écart détecté : attendu pink
```

Runtime :

```txt
/sections/community
→ resolveBasePageFamilyId
→ reseau-discussions
→ backdropToneKey pink
```

Verdict :

```txt
audit couleur périmé
```

À corriger :

```txt
documentation/pages_site/routes/04-reseau-discussions/community/community-README.md
```

---

## 5.4 Plusieurs `/sections/*` tombent sur la famille `secours`

Le resolver runtime possède des mappings explicites pour quelques sections seulement.

Routes potentiellement concernées :

```txt
/sections/route
/sections/elus
/sections/actors
/sections/annuaire
/sections/funding
/sections/trash-spotter
/sections/recycling
/sections/compost
/sections/climate
```

Sans exception explicite, le resolver de base retourne :

```txt
secours
```

Le fond global lit ce resolver.

Conséquence probable :

```txt
la documentation annonce une famille métier précise
mais le fond global peut utiliser la famille de secours slate
```

Action :

- compléter les mappings ou exceptions ;
- ajouter des tests route → PageFamilyId ;
- ajouter ces routes au test `resolve-page-family.test.ts`.

---

# 6. Formulaire de groupe : dossier déclaré final alors que le contrat ne l'est pas

Fichier :

```txt
documentation/pages_site/routes/02-agir/formulaire-de-groupe/formulaire-de-groupe-README.md
```

Il déclare :

```txt
Statut : finalisée
Scope : finalisé
Terminée : oui
```

Or le backend actuel présente encore au moins deux écarts confirmés.

## Écart A — gestion de la file

La route de lecture/traitement de la file utilise encore un accès de modération admin-only pour plusieurs opérations.

Le contrat produit veut aussi permettre :

```txt
créateur
organisateur
coorganisateur autorisé
```

de gérer leur propre file.

La fiche ne doit donc pas rester « terminée ».

## Écart B — visibilité des pré-actions

La fiche dit :

```txt
La page ne liste que les actions approuvées en phase pré-action.
```

Le code charge :

```txt
action_phase = pre_action
status in [approved, pending]
groupJoinEnabled = true
```

Donc la fiche est factuellement incorrecte.

## Écart C — ambiguïté « file publique »

La liste publique d'actions ouvertes et la file de modération des demandes sont deux concepts différents.

La documentation utilise plusieurs fois :

```txt
file publique
```

pour la queue de demandes.

Cette formulation doit être corrigée.

Actions :

```txt
passer le statut à partiellement finalisée / à corriger
réécrire le contrat de visibilité
distinguer liste publique et file de modération
aligner la gestion organisateur/coorganisateur sur le code final
```

---

# 7. Incohérences de structure photo

Règle canonique dans `pages_site/README.md` :

```txt
un seul dossier photo centralisé par bloc ou famille
aucun dossier photo par page fille
```

Mais :

```txt
routes/01-accueil-pilotage/accueil-pilotage-README.md
```

dit encore :

```txt
photo/ de chaque route canonique
```

Et le générateur crée :

```txt
routeDir/photo/
```

pour chaque route.

Action :

- corriger le README de famille Accueil & Pilotage ;
- supprimer la création automatique des dossiers photo par route ;
- ne pas déplacer automatiquement des captures existantes sans inventaire préalable.

---

# 8. `PAGE_FAMILIES_PLAN.md` est partiellement obsolète

Le plan indique :

```txt
Tests unitaires sur resolvePageFamily et exceptions → À faire
```

Mais le test existe :

```txt
apps/web/src/lib/ui/page-families/resolve-page-family.test.ts
```

Le plan indique aussi :

```txt
Aligner INDEX.md et les fiches pages_site sur PageFamilyId → Fait
```

Cette déclaration est trop optimiste au vu :

- des routes manquantes ;
- des audits couleur périmés ;
- des routes `sections/*` tombant potentiellement sur `secours`.

Action :

- mettre les statuts à jour ;
- ajouter les routes manquantes aux tests ;
- ne pas considérer l'alignement terminé avant un check automatique.

---

# 9. Sitemap Apprendre incohérent

Le sitemap inclut :

```txt
/learn
/learn/comprendre
/learn/bonnes-pratiques
/learn/sentrainer
```

Mais :

- aucune page `/learn` n'a été trouvée dans les emplacements App Router attendus ;
- aucun redirect `/learn` n'est défini dans `next.config.ts` ;
- `/learn/ecole` existe réellement avec une URL canonique, mais n'est pas dans le sitemap public.

Verdict :

```txt
probable route orpheline /learn dans le sitemap
omission confirmée de /learn/ecole dans la liste publique
```

Action :

1. décider si `/learn` doit être un hub réel ou une redirection ;
2. sinon retirer `/learn` du sitemap ;
3. ajouter `/learn/ecole` si la page doit être indexable.

---

# 10. Alias `/gamification` mal placé dans `INDEX.md`

Dans l'index audité, `/gamification` apparaît sous la section :

```txt
Print & Export
```

alors qu'il s'agit d'un alias de :

```txt
/sections/gamification
```

et qu'il appartient à :

```txt
Cartographie & Impact
```

Action :

- déplacer l'entrée dans la section Cartographie & Impact ;
- conserver une seule fiche canonique cible.

---

# 11. Fichiers à mettre à jour en priorité

## P0

```txt
documentation/pages_site/generate-canonical-pages.mjs
documentation/pages_site/INDEX.md
documentation/pages_site/routes/02-agir/formulaire-de-groupe/formulaire-de-groupe-README.md
```

## P1

```txt
documentation/pages_site/routes/01-accueil-pilotage/accueil-pilotage-README.md
documentation/pages_site/routes/02-agir/agir-README.md
documentation/pages_site/routes/03-cartographie-impact/cartographie-impact-README.md
documentation/pages_site/routes/03-cartographie-impact/actions-map/actions-map-README.md
documentation/pages_site/routes/03-cartographie-impact/methodologie/methodologie-README.md
documentation/pages_site/routes/03-cartographie-impact/reports/reports-README.md
documentation/pages_site/routes/04-reseau-discussions/reseau-discussions-README.md
documentation/pages_site/routes/04-reseau-discussions/community/community-README.md
documentation/pages_site/routes/05-apprendre/apprendre-README.md
documentation/pages_site/routes/09-admin-superadmin/admin-superadmin-README.md
documentation/pages_site/PAGE_FAMILIES_PLAN.md
documentation/pages_site/PAGE_FAMILIES_NON_REGRESSION.md
```

## P2

```txt
documentation/product/matrice-rubriques.md
apps/web/src/app/sitemap.ts
apps/web/src/lib/ui/page-families/resolve-page-family.ts
apps/web/src/lib/ui/page-families/exceptions.ts
apps/web/src/lib/ui/page-families/resolve-page-family.test.ts
```

---

# 12. Dossiers à créer après vérification

## Création certaine

```txt
documentation/pages_site/routes/05-apprendre/learn-ecole/
documentation/pages_site/routes/09-admin-superadmin/admin-quiz-bank/
documentation/pages_site/routes/02-agir/weather/
```

## Création conditionnée à une décision de famille

```txt
recycling
compost
climate
```

Ne pas créer ces trois dossiers avant d'avoir décidé leur famille fonctionnelle canonique.

---

# 13. Ce qui est relativement bien à jour

Le dossier :

```txt
documentation/pages_site/routes/05-apprendre/learn-bonnes-pratiques/
```

est beaucoup plus proche du code actuel.

La fiche décrit notamment :

- les trois thèmes ;
- les composants de contexte tri ;
- la sensibilisation aux comportements ;
- le bloc Gestes Propres ;
- le Baromètre 2025 ;
- les contenus IFOP.

Le code de page correspond globalement à cette structure.

Ce dossier peut servir de modèle de qualité pour les autres fiches :

```txt
peu de texte générique
composants réels nommés
structure visible actuelle
sources explicites
notes d'audit concrètes
```

---

# 14. Plan de correction recommandé pour Codex

## Lot 1 — Sécuriser le générateur

```txt
ne plus écrire par défaut
supprimer la logique couleur dupliquée
supprimer création photo par route
ne plus générer README.md génériques
ne pas écraser les fiches enrichies
```

## Lot 2 — Créer le check automatique

Créer :

```txt
scripts/check-pages-site-route-drift.mjs
```

Puis l'ajouter aux checks de gouvernance.

## Lot 3 — Corriger l'inventaire

Mettre à jour :

```txt
INDEX.md
README de chaque famille
alias et redirections
```

## Lot 4 — Créer les dossiers manquants certains

```txt
learn-ecole
admin-quiz-bank
weather
```

## Lot 5 — Décider le classement des trois rubriques orphelines

```txt
recycling
compost
climate
```

## Lot 6 — Corriger les accès

Aligner la documentation sur :

```txt
proxy.ts
clerk-access.ts
seo/indexability.ts
```

## Lot 7 — Corriger les familles et couleurs

Aligner :

```txt
resolve-page-family.ts
exceptions.ts
resolve-page-family.test.ts
pages_site docs
```

## Lot 8 — Corriger Formulaire de groupe

Ne le déclarer final qu'après :

```txt
gestion organisateur/coorganisateur réelle
contrat de visibilité exact
séparation liste publique / file de modération
tests
```

## Lot 9 — Corriger sitemap Apprendre

Décider :

```txt
/learn hub
ou redirection
ou suppression sitemap
```

Puis traiter :

```txt
/learn/ecole
```

## Lot 10 — Valider

Exécuter :

```bash
npm run check:doc-governance
npm run check:stack-doc-drift
npm run typecheck
npm run lint
npm test
npm run build
```

Ajouter le nouveau check :

```bash
node scripts/check-pages-site-route-drift.mjs
```

---

# 15. Critères de fin

Le dossier `documentation/pages_site` peut être considéré comme cohérent uniquement si :

```txt
[ ] chaque route code est inventoriée ou explicitement exclue
[ ] chaque section runtime est inventoriée
[ ] chaque alias est documenté sans fausse page autonome
[ ] chaque fiche pointe vers des fichiers source existants
[ ] les accès docs correspondent au runtime
[ ] les familles docs correspondent au resolver runtime
[ ] aucune fiche ne prétend être terminée alors que son contrat backend est incomplet
[ ] aucun générateur ne recrée une structure obsolète
[ ] les captures suivent une seule règle
[ ] les routes Apprendre du sitemap existent réellement
[ ] un check automatique empêche la dérive future
```

---

# Conclusion

Le dossier `documentation/pages_site` est conceptuellement utile et bien orienté : il permet de documenter le site à partir des routes et de l'expérience utilisateur.

Le principal problème n'est pas son existence, mais la multiplication de vérités concurrentes :

```txt
INDEX.md
README de familles
generate-canonical-pages.mjs
sections-registry
navigation.ts
clerk-access.ts
page-families resolver
sitemap
product/matrice-rubriques.md
```

La priorité est donc de faire de `pages_site` un **registre contrôlé automatiquement**, alimenté par les sources runtime existantes, sans générateur destructif ni informations d'accès/couleur recalculées indépendamment du code.
