# CleanMyMap - playbook des skills Matt Pocock

Ce guide traduit `mattpocock/skills` en workflow concret pour CleanMyMap.
L'objectif est simple : garder les interventions petites, composables et reutilisables.

## Principe

Les bons skills ne font pas "tout". Ils :

- portent une seule intention claire,
- s'activent au bon moment,
- se combinent sans se contredire,
- laissent une trace exploitable pour la suite.

Dans CleanMyMap, cette approche colle bien au reste du repo : on lit le contexte du dossier concerne, on choisit le bon skill, puis on verrouille avec tests et documentation.

## Repères CleanMyMap

Avant d'ouvrir un skill, les sources de contexte utiles sont :

- le guide de travail global du projet pour les regles communes.
- `documentation/README.md` pour le point d'entree de la doc.
- `documentation/development/README.md` pour le code, les tests et le refactoring.
- `documentation/architecture/README.md` et `documentation/architecture/master-architecture.md` pour les decisions structurelles.
- `documentation/operations/README.md` pour les runbooks et les procedures d'exploitation.
- `documentation/pages_site/INDEX.md` si la tache touche une route UI ou une capture de page.

## Quickstart reel

Reference du repo d'origine :

```bash
npx skills@latest add mattpocock/skills
```

Puis lancer le setup contextuel :

```text
/setup-matt-pocock-skills
```

Ce second pas sert a enseigner au skill le contexte du repo : issue tracker, vocabulaire de triage et docs de domaine.

## Skills a retenir

- `grill-me` : entretien serre pour clarifier un plan ou un design branche par branche.
- `grill-with-docs` : meme logique, mais en confrontant la proposition aux docs et au vocabulaire du projet.
- `tdd` : boucle red-green-refactor, avec tests sur le comportement observable.
- `diagnose` : boucle disciplinee pour bug dur ou regression de perf, de la repro au test de non-regression.
- `zoom-out` : prendre de la hauteur quand le module courant est trop etroit pour etre compris.
- `improve-codebase-architecture` : trouver les opportunites de "deepening" quand un patch local aggrave la dette.
- `handoff` : compresser une session pour qu'un autre agent reprenne sans perdre le fil.
- `caveman` : mode de communication ultra-compacte, utile si l'utilisateur demande moins de mots.
- `git-guardrails-claude-code` : bloquer les commandes git dangereuses avant execution.
- `setup-pre-commit` : installer un garde-fou de commit avec hook, lint-staged, typecheck et tests.

## Quand l'utiliser dans CleanMyMap

| Situation | Skills a activer | Pourquoi |
|---|---|---|
| Demande floue, plan encore instable, gros changement | `grill-me`, `grill-with-docs` | Forcer la clarte avant d'ecrire du code ou de la doc. |
| Correctif ou feature a verrouiller par tests | `tdd` | Fixer le comportement attendu avant ou pendant l'implementation. |
| Bug difficile, regression, lenteur, comportement non deterministe | `diagnose` | Construire une boucle de repro, tester une hypothese a la fois, puis verrouiller le correctif. |
| Patch local qui risque d'augmenter la dette ou de rester superficiel | `zoom-out`, `improve-codebase-architecture` | Revoir le systeme global avant de multiplier les rustines. |
| Session longue, transfert, reprise apres interruption | `handoff`, `caveman` | Compresser l'etat de la session sans perdre la substance. |
| Besoin de proteger le repo contre des commandes git destructrices | `git-guardrails-claude-code` | Eviter les commandes qui peuvent detruire du travail local ou casser le contexte. |
| Besoin de verrouiller le flux de commit local | `setup-pre-commit` | Mettre des garde-fous au moment ou le code quitte la session. |

## Ordre de reflexe

1. Si le besoin est flou, commencer par `grill-me` ou `grill-with-docs`.
2. Si la zone de code n'est pas claire, prendre de la hauteur avec `zoom-out`.
3. Si c'est un bug ou une regression, passer en `diagnose`.
4. Si c'est une nouvelle logique ou un correctif durable, verrouiller avec `tdd`.
5. Si le probleme semble structurel, explorer `improve-codebase-architecture`.
6. Si la session s'etire ou doit etre reprise plus tard, produire un `handoff`.

## Cohérence documentaire

Dans la doc locale, `npm run checks:changed:quick` et `npm run checks:changed:quick:build` sont cites, mais ces scripts n'existent pas dans le `package.json` racine.

Le commandement executable aujourd'hui est :

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check_changed_quick.ps1
powershell -ExecutionPolicy Bypass -File scripts/check_changed_quick.ps1 -IncludeBuild
```

Utiliser la premiere ligne pour le mode rapide sans build, la seconde pour inclure `next build`.
Ne pas ajouter d'alias npm tant que `package.json` n'est pas mis a jour.
