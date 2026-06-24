# Session Standard Runbook (Codex)

## Objectif
Executer une session de travail fiable avec un ordre fixe:
1) contexte et garde-fous,
2) qualite code/documentation,
3) runtime/build,
4) cloture session.

## Partie 1 - Bootstrap & hygiene (a executer en premier)
Depuis la racine du repo:

```bash
npm run session:bootstrap
npm run session:budget
npm run check:doc-visuals
npm run check:lockfile-policy
npm run quality:top-heavy
```

Critere de succes:
- toutes les commandes retournent `OK` (ou succes explicite),
- aucun echec bloquant avant de poursuivre.
- `quality:top-heavy` applique une regle progressive:
  - > `500` lignes (ou > `40KB`) = warning d'audit (cohesion/lisibilite),
  - > `700` lignes (ou > `60KB`) = echec bloquant.

## Partie 2 - Qualite applicative
Depuis la racine:

```bash
npm run typecheck
npm run lint
npm run test:regression-gates
```

Critere de succes:
- zero erreur typecheck/lint/tests de gates.

## Partie 3 - Runtime / build
Depuis la racine:

```bash
npm run build
```

Si le cache ou les manifests semblent incohérents:

```bash
npm run build:clean -w apps/web
```

Option verification locale:
```bash
npm run dev
```

Critere de succes:
- build termine sans erreur.

Retours de terrain utiles:
- si `npm run build` cote `apps/web` bloque sur des manifests Next/Turbopack manquants, nettoyer d'abord le cache avec `npm run build:clean -w apps/web` avant de relancer un build complet;
- ne jamais creer a la main `apps/web/.next/server/pages-manifest.json`, `apps/web/.next/server/proxy.js.nft.json` ou tout autre fichier interne Next;
- `npm run backend:doctor -w apps/web` depend d'un `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` present dans `apps/web/.env.local`;
- `npm run backend:supabase:advisors -w apps/web` peut echouer avec `403` si le compte Supabase n'a pas les droits requis, meme quand le reste du backend est configure.

## Partie 4 - Cloture session
Mettre a jour la memoire session:

```bash
npm run session:close -- --done "<resume>" --next "<prochaine etape>" --risk "<risque restant>"
```

Critere de succes:
- `documentation/sessions/history/latest-session.md` mis a jour proprement.

## Regles de validation de lot

- Chaque lot doit livrer les changements effectifs, les tests executes et les risques restants.
- Aucun lot n'est considere termine sans verification de non-regression.
- Toute decision structurante doit etre tracee : choix retenu, alternatives ecartees et impact attendu.

## Definition of done minimale

- lint, typecheck et tests pertinents au vert ;
- pas de regression sur les routes ou endpoints critiques ;
- documentation mise a jour quand le lot modifie un comportement, une regle ou un runbook ;
- risque residuel explicite et formule de maniere actionnable.
