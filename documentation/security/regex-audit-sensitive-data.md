# Audit regex des donnees sensibles

Commande :

```bash
npm run security:secrets
```

Objectif : detecter avant commit ou en CI les valeurs sensibles exposees par erreur dans les fichiers du repo, y compris les nouveaux fichiers non ignores. Le script masque toujours les valeurs detectees et retourne un code non nul si un secret probable est trouve.

## Perimetre

Le scan couvre les fichiers `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.json`, `.env.example`, `.md`, `.yml` et `.yaml`.

Les dossiers et fichiers generes sont exclus : `node_modules`, `.git`, `.next`, `.playwright-mcp`, `dist`, `build`, `coverage`, `screenshots`, `playwright-report`, `test-results`, `artifacts`, lockfiles et fichiers `generated`.

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
npm run security:secrets -- --allowlist=scripts/secret-audit.allowlist.json
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

Limites : un audit regex peut produire des faux positifs et ne remplace pas la rotation d'un secret reellement expose, ni un outil specialise comme GitHub secret scanning, Gitleaks ou TruffleHog.
