# Product — Guide IA

Point d'entrée de la documentation produit CleanMyMap.

## Sources principales

### Vision et stratégie

- `vision-et-objectifs.md` — vision globale ;
- `roadmap-priorisee.md` — priorités produit ;
- `dimension-communautaire.md` — continuité d'engagement ;
- `chantiers-q2-q3.md` — chantiers structurants.

### Utilisateurs et parcours

- `parcours-utilisateurs.md` ;
- `coherence-mobile-first.md` ;
- `matrice-rubriques.md`.

### Gamification

- `gamification-non-competitive.md` ;
- `objectifs-valides.md` ;
- `gamification-inventory.md` ;
- mémoire locale des idées écartées dans la fiche canonique de la rubrique.

### Méthodologie

- `SCIENTIFIC_PROTOCOL.md` ;
- documentation de méthodologie et impact dans les dossiers techniques ou les fiches de page concernées.

## Hiérarchie de lecture

Pour une fonctionnalité :

1. `vision-et-objectifs.md` ;
2. `roadmap-priorisee.md` ;
3. fiche canonique de la page dans `documentation/pages_site/` ;
4. audit ou document produit spécialisé s'il existe ;
5. documentation technique correspondante.

## Source de vérité par type d'information

| Information | Source |
|---|---|
| Priorité globale | `roadmap-priorisee.md` ou backlog global canonique |
| Rôle d'une page | `pages_site/` |
| Décision technique | `architecture/adr/` |
| Sécurité | `security/` |
| UI | `design-system/` |
| Contrat de données | code + `architecture/data-governance.md` |

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
