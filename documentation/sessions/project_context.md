# Project Context

Index semi-stable du contexte nécessaire pour travailler sur CleanMyMap. Les
états de chantier, résultats de tests, métriques et décisions temporaires
restent dans les sources de session ou les documents d'audit appropriés.

## Applications et stack

- Monorepo CleanMyMap avec deux applications déployables : `apps/web` et
  `apps/mobile`.
- `maintenance/python/` reste hors du runtime applicatif.
- Web/API : Next.js App Router, React et TypeScript.
- Données et backend : Supabase/PostgreSQL.
- Identité : Clerk pour le web et le mobile, avec intégration Supabase via le
  jeton Clerk.
- Gestion des dépendances : npm workspaces ; le lockfile racine est canonique.

## Sources canoniques à relire

- Gouvernance générale et règles de travail : `AGENTS.md` et le `AGENTS.md`
  scoped du sous-arbre concerné.
- Architecture et frontières : `documentation/architecture/README.md`,
  `documentation/architecture/master-architecture.md` et les ADR applicables.
- Données et Supabase : `documentation/database/README.md` et
  `documentation/architecture/data-governance.md`.
- Contrats de sécurité et d'accès : `documentation/security/README.md` et les
  sources AuthN/AuthZ concernées.
- Design system et contrats UI : `documentation/design-system/README.md` et le
  document canonique du composant concerné.
- Validation et tests : `documentation/development/TESTING.md`.
- Mémoire de session :
  `documentation/sessions/history/latest-session.md`.
- Procédure de session et budget de contexte :
  `documentation/operations/agent-memory-governance.md`.

## Exclusions de contexte

- `.codexignore` exclut les sorties locales déjà identifiées comme générées :
  `artifacts/`, `**/artifacts/`, `.quarto/` et `**/.quarto/`.
- `.artifacts/` est un espace local ignoré pour les candidates de validation et
  les sorties de travail bornées. Les preuves durables relèvent de
  `documentation/operations/audits/` ou du domaine documentaire concerné ; une
  nouvelle sortie ne doit pas être versionnée dans `.artifacts/`.
- Les dossiers lourds suivants ne sont pas à scanner par défaut :
  `node_modules/`, `.next/`, `.vercel/`, `.playwright-mcp/`, `.gitnexus/`,
  `artifacts/`, `backups/` et les caches Quarto.

## Doctrine de lecture progressive

Pour une tâche ordinaire, lire dans cet ordre :

1. les règles racine ;
2. le `AGENTS.md` scoped applicable ;
3. le fichier cible ;
4. ses dépendances directes, callers et consommateurs nécessaires ;
5. les tests directement liés ;
6. la documentation canonique du domaine ;
7. le contexte complémentaire seulement si un doute réel subsiste.

Un audit explicitement global peut élargir ce périmètre. Les historiques de
session non pertinents, `node_modules/`, `.next/`, `.vercel/`, `.artifacts/`,
`artifacts/`, `backups/`, `.playwright-mcp/`, `.gitnexus/` et les caches Quarto
ne sont pas explorés par défaut. Les candidates `.artifacts/` ne sont lues que
lorsqu'un contrôle ou un fichier explicitement concerné l'exige.

## Frontières d'architecture

- `apps/web` porte l'application web, ses routes API et son intégration
  Supabase ; les frontières Server/Client et l'autorisation côté serveur sont
  préservées.
- `apps/mobile` est une application distincte ; ses contrats d'identité,
  missions/GPS, RLS et finalisation des métriques restent des zones protégées.
- Les migrations Supabase canoniques résident sous `apps/web/supabase/migrations/`.

## Zones sensibles

- Authentification, rôles, permissions, routes protégées et proxy.
- Contrats de données, ingestion, RPC Supabase et migrations.
- Administration, modération, audit et messagerie.
- Données personnelles, secrets, RLS et intégrations Clerk/Supabase.

## Points d'entrée de validation

- Démarrage de session : `npm run session:bootstrap` puis
  `npm run session:budget`.
- Validation ciblée : `npm run checks:changed`.
- Gates applicatives : `npm run test:regression-gates` et les tests ciblés du
  workspace concerné.
- Validation large : `npm run checks` lorsque le périmètre le justifie.
- Clôture : `npm run session:close -- --done "..." --next "..." --risk "..."`.

## Protocole de session

1. Lire `AGENTS.md`, le `AGENTS.md` scoped applicable,
   `project_context.md` et `latest-session.md`.
2. Identifier les sources canoniques, callers, consommateurs, tests et
   invariants réellement concernés par la tâche.
3. Modifier le périmètre minimal et valider proportionnellement au risque.
4. Mettre à jour la mémoire volatile à la clôture ; ne pas transformer ce
   fichier semi-stable en journal de chantier.
