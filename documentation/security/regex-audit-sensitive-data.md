# Audit regex des donnees sensibles (`CURRENT`)

Commande :

```bash
npm run security:secrets
```

Objectif : detecter avant commit ou en CI les valeurs sensibles exposees par erreur dans les fichiers du repo, y compris les nouveaux fichiers non ignores. Le script masque toujours les valeurs detectees et retourne un code non nul si un secret probable est trouve.

## Perimetre

Le scan couvre les fichiers `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.json`, `.md`, `.mdx`, `.html`, `.htm`, `.yml`, `.yaml`, ainsi que les fichiers `.env` et `.env.*` lorsqu'ils appartiennent réellement à la portée Git demandée (`WORKTREE`, `STAGED`, `REF` ou `PUSH_CANDIDATE`). Les fichiers `.env` ignorés par Git et étrangers à cette portée ne sont jamais forcés dans le scan.

Les dossiers et fichiers generes sont exclus : `node_modules`, `.git`, `.next`, `.playwright-mcp`, `dist`, `build`, `coverage`, `artifacts`, lockfiles et fichiers `generated`. Les sorties Playwright sont centralisees dans `artifacts/playwright/report` et `artifacts/playwright/results`.

## Categories couvertes

- JWT et cles Supabase anon/service-role.
- Cles AWS `AKIA` / `ASIA`.
- Cles Clerk publishable/secret.
- Cles Stripe publishable/secret et `whsec`.
- Cles Resend, PostHog, Pinecone.
- URL/token Upstash Redis REST.
- DSN Sentry.
- Emails, URLs sensibles avec parametres `token`, `secret`, `key`, `password`.
- Hashes MD5/SHA1/SHA256 contextualises.
- Longues chaines base64 ou base64url a forte entropie.

## Faux positifs documentes

Utiliser une allowlist uniquement pour les exemples publics ou placeholders documentes :

```bash
npm run security:secrets -- --allowlist=scripts/checks/secret-audit.allowlist.json
```

Format :

```json
{
  "allow": [
    {
      "path": "documentation/security/example.md",
      "category": "Email address",
      "contains": "contact[at]example.com",
      "reason": "Placeholder public de documentation"
    }
  ]
}
```

Fixtures et faux positifs : utiliser en priorité des valeurs synthétiques
explicites et reconnues par les contrôles de sécurité, notamment les domaines
`example.com`, `example.org` et `example.net` pour les adresses électroniques.
Ne pas fragmenter ou construire artificiellement une valeur à l'exécution dans
le seul but d'éviter sa détection. Lorsqu'une valeur exacte est indispensable à
un contrat de test et qu'un faux positif est démontré, utiliser une exception
strictement ciblée par fichier, catégorie et valeur, avec justification, dans
l'allowlist existante. Ne jamais affaiblir globalement le scanner.

Limites : un audit regex peut produire des faux positifs et ne remplace pas la rotation d'un secret reellement expose, ni un outil specialise comme GitHub secret scanning, Gitleaks ou TruffleHog.
