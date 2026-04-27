# URL Validation Security

> **Démarrage rapide :** Voir [SECURITY_QUICK_REFERENCE.md](./SECURITY_QUICK_REFERENCE.md) pour un guide condensé.

## CodeQL Warning: js/incomplete-url-substring-sanitization

### Problème

Utiliser `startsWith("https://")`, `includes("http")` ou `indexOf("http")` pour valider une URL est insuffisant et peut être contourné.

### Exemples problématiques

```typescript
// ❌ DANGEREUX — peut être contourné
if (url.startsWith("https://")) { }
// Contre-exemple: "https://evil.com/https://legit.com"

if (url.includes("http")) { }
// Contre-exemple: "javascript://alert(1)//http"

if (url.indexOf("http") === 0) { }
// Même problème que startsWith
```

### Solution recommandée

Utiliser `new URL()` pour parser complètement l'URL et vérifier le protocole:

```typescript
/**
 * Validates URL has https protocol (CodeQL-safe)
 * See: documentation/security/url-validation-security.md
 */
function hasHttpsProtocol(url: string | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// Usage
if (hasHttpsProtocol(userInput)) {
  // Safe to use URL
}
```

### Cas spéciaux

#### Vérification du hostname

```typescript
function isAllowedDomain(url: string, allowedHostname: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === allowedHostname;
  } catch {
    return false;
  }
}

// Usage
if (isAllowedDomain(workshop.sourceUrl, "www.academieduclimat.paris")) {
  // Safe
}
```

#### URL relatives vs absolues

```typescript
function isAbsoluteHttpsUrl(url: string): boolean {
  // Check if absolute URL before parsing
  if (!/^https?:\/\//i.test(url)) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}
```

### Fichiers corrigés

| Fichier | Pattern avant | Solution |
|---------|---------------|----------|
| `lib/supabase/server.ts` | `startsWith("https://")` | `hasHttpsProtocol()` helper |
| `lib/supabase/client.ts` | `startsWith("https://")` | `hasHttpsProtocol()` helper |
| `lib/persistence/runtime-store.ts` | `startsWith("https://")` | `hasHttpsProtocol()` helper |
| `components/sections/rubriques/academie-climat-workshops.test.ts` | `startsWith("https://www...")` | `new URL().hostname` |

### Checklist pour les revues de code

- [ ] Pas de `startsWith("http")` ou `startsWith("https://")` pour valider des URLs
- [ ] Pas de `includes("http")` pour détecter des liens
- [ ] Pas de `indexOf("http")` pour valider des URLs
- [ ] Utiliser `new URL()` avec try/catch pour parser les URLs
- [ ] Vérifier explicitement `parsed.protocol === "https:"` si HTTPS requis
- [ ] Pour les hostnames, comparer `parsed.hostname` (pas de substring)

### Références

- [CodeQL: js/incomplete-url-substring-sanitization](https://codeql.github.com/codeql-query-help/javascript/js-incomplete-url-substring-sanitization/)
- [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)
- [OWASP: URL Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [Guide rapide](./SECURITY_QUICK_REFERENCE.md#1-validation-durl-avec-startswith-ou-includes)
