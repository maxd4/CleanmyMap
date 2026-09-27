# Scripts de l'application web

Ce dossier regroupe les outils opératoires propres à `apps/web` : bootstrap,
diagnostic, export, synchronisation, advisors et backfills ciblés.

## Frontière

- les scripts orchestrent une opération web mais ne deviennent pas des
  dépendances du runtime Next.js ;
- les contrats métier restent dans `apps/web/src/lib/` et les routes dans
  `apps/web/src/app/api/` ;
- les migrations et leur historique restent exclusivement sous
  `apps/web/supabase/migrations/` ;
- les opérations Supabase distantes sont séparées des validations locales et
  doivent conserver leur mode read-only ou dry-run par défaut.

Les scripts d'advisors normalisent ou vérifient une observation distante ; ils
ne remplacent ni l'inventaire MCP complet ni la gouvernance Supabase locale.

## Validation et opérations

Avant de modifier ou d'exécuter un script, classer l'opération comme
diagnostic, génération, export, import, backfill ou cleanup. Vérifier sa cible,
sa provenance et ses effets. Lorsqu'un test existe, utiliser :

```text
npm run test:scripts
```

Les commandes applicables et les limites d'accès sont définies par
[`AGENTS.md`](AGENTS.md) et par la gouvernance Supabase du workspace. Ce README
reste une orientation courte ; il ne duplique pas ces contrats.
