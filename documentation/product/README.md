# Product — Guide IA

Point d'entrée de la documentation produit CleanMyMap.

La source de référence pour le positionnement, les publics, la boucle produit
et les limites déclaratives est [`vision-et-objectifs.md`](./vision-et-objectifs.md).
Les documents spécialisés décrivent ensuite leur contrat propre : ils ne
doivent pas transformer un objectif en résultat mesuré, une capacité planifiée
en fonctionnalité disponible, ni une relation UX en permission serveur.

Repères transversaux à conserver dans toute la documentation produit :

- le web reste la surface fonctionnelle complète ; le mobile est en
  développement actif et n'est pas prêt pour la production ;
- l'intégration SPOGOMI est partielle et aucun partenariat officiel n'est
  démontré sans preuve indépendante ;
- les bilans spécialisés ne sont pas tous disponibles ;
- l'inclusion sociale et les bénéfices liés à l'activité physique restent des
  objectifs, sans résultat social mesuré déclaré.

## Routage vers les propriétaires pour Codex

| Besoin | Document canonique | Invariant |
|---|---|---|
| Vision, bénéficiaires, promesses | `vision-et-objectifs.md` | Objectif ≠ mesure |
| Ordre d'exécution | `roadmap-priorisee.md` (`PLAN`) | La roadmap longue reste `HISTORY` |
| Décisions ouvertes | `decisions-en-attente.md` (`PLAN`) | Ne pas présenter comme CURRENT |
| Comportement des pages | `../pages_site/INDEX.md`, puis fiche de page | Code, droits et protection `routes/` |
| Interface transversale | `../design-system/README.md` et contrat spécialisé | Composant, CSS, check |
| SEO, canonical, sitemap | `../seo/README.md` | `apps/web/src/lib/seo/indexability.ts` |
| Carte, impact et méthode | `SCIENTIFIC_PROTOCOL.md`, `methodologie-carte-actions.md` | Observé ≠ estimé ≠ prédit |
| Conception mobile-first | `coherence-mobile-first.md` | Critère UX, pas preuve de release mobile |

## Sources principales

### Vision et stratégie

- `vision-et-objectifs.md` — vision globale et positionnement du projet ;
- [`ambition-territoriale-paris.md`](./ambition-territoriale-paris.md) — source spécialisée `PLAN / TARGET` pour l'expérimentation parisienne et la reproductibilité territoriale ;
- `business-model.md` — hypothèses économiques et critères de validation (`PLAN`) ;
- `roadmap-priorisee.md` — priorités produit ;
- `roadmap-priorisee-long.md` — historique détaillé (`HISTORY`), conservé pour son contexte et ses critères, sans autorité sur l'ordre courant ;
- `dimension-communautaire.md` — continuité d'engagement ;
- `decisions-en-attente.md` — arbitrages produit ouverts (`PLAN`).

### Utilisateurs et parcours

- `parcours-utilisateurs.md` ;
- [`persona-entreprise-rse.md`](./persona-entreprise-rse.md) : étude de marché et découverte du persona entreprise (`AUDIT / PLAN / PROPOSITION`) ;
- `coherence-mobile-first.md` ;
- `matrice-rubriques.md` ;
- `visual-first-priorites.md` — références de schémas utiles (`PLAN / REFERENCE`).

### Gamification

- `gamification-non-competitive.md` ;
- `objectifs-valides.md` ;
- `gamification-inventory.md` ;
- [`GAMIFICATION_BADGES_PRODUCT_DECISIONS.md`](./GAMIFICATION_BADGES_PRODUCT_DECISIONS.md) — décision produit sur l’identité visuelle de la gamification, ses choix et non-choix, avec implémentation gelée jusqu’à la convergence fonctionnelle ;
- mémoire locale des idées écartées dans la fiche canonique de la rubrique.

### Méthodologie

- `SCIENTIFIC_PROTOCOL.md` ;
- `methodologie-carte-actions.md` — lecture de la carte d'actions, score constaté, projection de re-pollution, couleurs, géométries et limites ;
- [`couverture-gps-multi-groupes.md`](./couverture-gps-multi-groupes.md) — spécification `PLAN / TARGET` ; elle référence le socle `CURRENT` déjà livré et sépare les extensions scientifiques encore ciblées ;
- documentation de méthodologie et impact dans les dossiers techniques ou les fiches de page concernées.

### Vocabulaire

- [`ubiquitous-language.md`](./ubiquitous-language.md) — termes métier
  transversaux et ambiguïtés à éviter.

### Sources documentaires privées complémentaires

Les documents privés de pilotage, finances, partenariats, ateliers et terrain sont consultés uniquement lorsqu’ils sont pertinents, via le connecteur autorisé. Leurs statuts et preuves doivent être distingués ; ils ne remplacent ni le code courant ni les contrats techniques du dépôt. Voir la [politique documentaire canonique](../development/DOCUMENTATION_POLICY.md). Aucun lien ou identifiant Drive privé n’est publié ici.

## Hiérarchie de lecture

Pour une fonctionnalité :

1. `vision-et-objectifs.md` ;
2. `roadmap-priorisee.md` ;
3. fiche canonique de la page dans `documentation/pages_site/` ;
4. audit ou document produit spécialisé s'il existe ;
5. documentation technique correspondante.

Pour une question de modèle économique :

1. `business-model.md` pour les hypothèses produit et la stratégie en cours ;
2. `pages_site/routes/04-reseau-discussions/funding/` pour le comportement réel de la page et des moyens de contribution ;
3. `legal/` pour l'état juridique et fiscal réellement établi.

## Source de vérité par type d'information

| Information | Source |
|---|---|
| Vision et positionnement | `vision-et-objectifs.md` |
| Modèle économique en construction | `business-model.md` |
| Priorité globale | `roadmap-priorisee.md` ou backlog global canonique |
| Rôle d'une page | `pages_site/` |
| Décision technique | `architecture/adr/` |
| Sécurité | `security/` |
| UI | `design-system/` |
| Contrat de données | code + `architecture/data-governance.md` |
| État juridique | `legal/` |

Ne pas utiliser un ancien audit comme source supérieure au code réel.

## Principes produit

### Action utile

La plateforme doit raccourcir le passage entre :

```txt
besoin visible
→ préparation
→ action
→ déclaration
→ preuve
→ coordination
```

### Données transparentes

Les chiffres d'impact doivent être :

- sourcés ;
- distingués entre mesure et estimation ;
- accompagnés de limites ;
- reproductibles lorsque possible.

### Visual first, sans décoration gratuite

Les visuels doivent aider à :

- comprendre ;
- comparer ;
- décider ;
- agir.

Une page métier ne doit pas devenir une landing page décorative.

### Mobile robuste

Les parcours terrain doivent fonctionner dans les contraintes réelles :

- écran étroit ;
- connexion instable ;
- géolocalisation ;
- permissions ;
- reprise après interruption.

### Gamification non compétitive

La progression doit encourager :

- contribution ;
- continuité ;
- apprentissage ;
- coopération.

Éviter les mécaniques qui récompensent le spam ou mettent les bénévoles en concurrence inutile.

## Avant de développer une fonctionnalité

```txt
□ Vérifier le code actuel sur GitHub
□ Lire la vision
□ Vérifier la priorité
□ Lire la fiche de page
□ Identifier le contrat de données
□ Vérifier sécurité et quotas
□ Définir le plus petit lot utile
```

## Décisions produit

Toute décision durable doit préciser :

- problème ;
- utilisateurs concernés ;
- résultat attendu ;
- compromis ;
- métrique de succès si pertinente ;
- conséquences techniques si structurantes.

Une décision technique durable doit être consignée en ADR, pas dupliquée dans le produit.

## Audits historiques

Les audits existants peuvent fournir du contexte, mais ils doivent être revalidés contre :

- code actuel ;
- route actuelle ;
- design system actuel ;
- roadmap actuelle.

Ne pas conserver un nombre codé en dur d'audits disponibles : le dossier évolue.

## Validation

Une évolution produit est considérée cohérente quand :

- la page canonique est alignée ;
- le code respecte le contrat ;
- les états critiques sont couverts ;
- les tests adaptés existent ;
- la sécurité n'est pas contournée ;
- les quotas ne sont pas dégradés sans justification.
