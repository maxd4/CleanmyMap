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

## Coordonnees professionnelles publiques et allowlist Email

- **Politique de publication** :
  - Autorises dans GitHub, le code et la documentation publique : adresses generiques officielles des administrations, services publics, associations et entreprises, coordonnees fonctionnelles publiques necessaires aux fonctionnalites et liens vers les sources institutionnelles officielles.
  - Identites et coordonnees professionnelles nominatives : privilegier un stockage Supabase rectifiable et supprimable, avec projection publique uniquement lorsque la publication est justifiee.
  - Espaces prives uniquement : coordonnees obtenues lors d'echanges prives, notes relationnelles et engagements non publics.
  - Interdits : adresses deduites, coordonnees personnelles non autorisees et donnees excessives.
- **Schema strict d'exception (`secret-audit.allowlist.json`)** : toute exception exige un `path` exact et une `category` explicite (les entrees sans `category` ou `Email address` limitees a `contains`/`reason` sont rejetees). Chaque exception `Email address` sur domaine reel exige `exact`, `sourceUrl` (`http(s)://`), `verifiedAt` (`YYYY-MM-DD`) et `justification`. Les exceptions non professionnelles sont explicitement distinguees par `kind` : `upstream_vendor_metadata` (sous `vendor/`, avec `sourceUrl`, `verifiedAt` et `justification`) et `synthetic_fixture` (uniquement pour domaines synthetiques/placeholders, avec `exact` et `justification`).
- **Garanties du scanner** :
  - `PUBLIC_EMAIL_DOMAINS` est strictement limite aux domaines d'exemples reserves (`example.com`, `example.org`, `example.net`) et aux domaines synthetiques explicites de test (`cleanmymap.local`, `example.invalid`, `example.local`, `example.test`, `test.local`). Aucune exemption globale n'est accordee aux domaines professionnels ou associatifs reels (`cleanmymap.fr`, `mail.cleanmymap.fr`, `basbelleville.fr`, `paris.fr`, `gouv.fr`, fournisseurs de messagerie, etc.) : ils exigent une exception exacte et sourcee par fichier.
  - Chaque occurrence sur une ligne (plusieurs emails voisins ou secret technique adjacent) est evaluee independamment et **toutes** les valeurs sensibles detectees sur une ligne sont masquees avant toute sortie dans les journaux (`maskLine`). Une exception `Email address` ne neutralise jamais une autre adresse ni un secret technique (AWS, JWT, cle API) sur la meme ligne ou dans le meme fichier.
  - Pour les scans `STAGED`, `REF` et `PUSH_CANDIDATE`, `secret-audit.mjs` charge `secret-audit.allowlist.json` exclusivement depuis le snapshot Git effectivement controle, sans repli silencieux vers le worktree ou l'index.
- **RGPD (UE 2016/679) & CNIL** : finalite d'interet general/annuaire professionnel, minimisation, base legale (interet legitime mis en balance), information au titre de l'article 14, rectification, opposition, effacement et revalidation periodique.
