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
- Architecture et frontières : `documentation/architecture/master-architecture.md`
  et les ADR applicables.
- Contrats de sécurité et d'accès : `documentation/security/` et les sources
  AuthN/AuthZ concernées.
- Design system et contrats UI : `documentation/design-system/`.
- Mémoire de session :
  `documentation/sessions/history/latest-session.md`.
- Procédure de session et budget de contexte :
  `documentation/operations/agent-memory-governance.md`.

## Frontières d'architecture

- `apps/web` porte l'application web, ses routes API et son intégration
  Supabase ; les frontières Server/Client et l'autorisation côté serveur sont
  préservées.
- `apps/mobile` est une application distincte ; ses contrats d'identité,
  missions/GPS, RLS et finalisation des métriques restent des zones protégées.
- Les migrations Supabase canoniques résident sous `apps/web/supabase/migrations/`.
- La homepage, le header et le footer sont des zones protégées sauf demande
  explicite.

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
