# Documentation push status

Snapshot de visibilité Git pour les dossiers de documentation.

## Légende

- `✅` = dossier versionné, donc inclus dans un push Git s'il est modifié
- `⚪` = dossier ignoré par Git, donc jamais poussé

## Constat rapide

- Branche courante: `main`
- Le dépôt contient plusieurs dossiers de documentation versionnés
- Un seul sous-dossier documentaire est explicitement ignoré par Git dans cette zone: `documentation/pages_site/routes/04-reseau-discussions/partners-network/partnerships/`

## Arborescence de push

```text
.
├─ ✅ apps/
│  └─ ✅ web/
│     ├─ ✅ src/
│     ├─ ✅ src/app/docs/[...segments]/route.ts
│     ├─ ✅ src/app/brand/[...asset]/route.ts
│     ├─ ✅ src/app/images/textures/[...asset]/route.ts
│     ├─ ⚪ .next/
│     └─ ⚪ .next-sourcemap-test/
├─ ✅ documentation/
│  ├─ ✅ ai-guides/
│  ├─ ✅ architecture/
│  ├─ ✅ development/
│  ├─ ✅ operations/
│  ├─ ✅ pages_site/
│  │  └─ ⚪ routes/04-reseau-discussions/partners-network/partnerships/
│  ├─ ✅ product/
│  ├─ ✅ plans/
│  │  └─ ⚪ linear.md, nouveau_plan.txt, PLAN_formulaire_groupe.md
│  └─ ✅ README.md
├─ ✅ maintenance/
│  └─ ✅ python/
├─ ✅ scripts/
├─ ✅ supabase/
├─ ⚪ node_modules/
├─ ⚪ .vercel/
├─ ⚪ .playwright-mcp/
├─ ⚪ artifacts/
├─ ⚪ tmp/
├─ ⚪ cache/
├─ ⚪ runtime/
└─ ⚪ legacy/backups/
```

## Dossiers à arbitrer

Ces dossiers ne sont pas forcément faux techniquement, mais leur comportement actuel mérite une décision si l'objectif est un dépôt open source utile comme source de vérité pour le déploiement Vercel, tout en évitant les prises de note personnelles ou le contenu sensible.

Règle d'équilibre: on garde tout ce qui aide un collègue à comprendre, contribuer et déployer correctement; on retire ou isole seulement les brouillons, journaux bruts, réflexions personnelles, contenus sensibles et doublons inutiles.

| Dossier | Comportement actuel | Pourquoi ça pose question | Recommandation |
|---|---|---|---|
| `documentation/plans/` | Versionné dans Git, mais la README indique que c'est une zone de travail et non une référence publique | Ce dossier contient des plans, journaux et traces d'exécution; une partie sert de contexte utile, mais une autre peut rester trop interne | Garder les synthèses, les documents de cadrage et les références utiles; isoler les journaux très personnels ou les brouillons obsolètes |
| `documentation/documentation-push-status.md` | Versionné dans Git et visible dans le dépôt | C'est un tableau de suivi interne sur la structure du dépôt; il peut être utile aux contributeurs, mais il ne doit pas devenir une source de friction | Le garder s'il sert à clarifier la gouvernance; sinon le déplacer dans une zone vraiment interne |

## Lecture

- Les dossiers marqués `✅` font partie du dépôt et peuvent donc être poussés si leur contenu change.
- Les dossiers marqués `⚪` sont exclus du dépôt via `.gitignore` et ne partiront jamais dans un push.
- Le dossier `partnerships/` de la fiche Pépite est en `⚪` parce qu’il est volontairement ignoré pour éviter toute publication involontaire.

## Mise à jour

Pour régénérer cet état, relire `.gitignore` puis vérifier les dossiers racine et sous-dossiers de `documentation/`.
