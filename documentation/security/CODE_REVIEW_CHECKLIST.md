# Checklist Sécurité - Revue de Code

Utiliser cette checklist lors de la revue de code pour éviter les vulnérabilités courantes.

## 🔐 Sécurité des URLs

### Validation d'URL
- [ ] Pas de `startsWith("http")` ou `startsWith("https://")`
- [ ] Pas de `includes("http")` pour détecter des liens
- [ ] Pas de `indexOf("http")` pour valider des URLs
- [ ] Utiliser `new URL()` avec try/catch pour parser les URLs
- [ ] Vérifier explicitement `parsed.protocol === "https:"`
- [ ] Pour les hostnames, comparer `parsed.hostname` (pas de substring)

### Patterns corrects
```typescript
// ✅ Utiliser cette fonction
function hasHttpsProtocol(url: string | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// ✅ Pour vérifier le hostname
function isAllowedDomain(url: string, allowedHostname: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === allowedHostname;
  } catch {
    return false;
  }
}
```

---

## 🛡️ Prévention XSS (DOM)

### innerHTML et dangerouslySetInnerHTML
- [ ] Pas de `innerHTML` avec contenu utilisateur
- [ ] Pas de `dangerouslySetInnerHTML` sans sanitisation
- [ ] Utiliser `textContent` pour du texte simple
- [ ] Sanitiser avec DOMPurify si HTML dynamique nécessaire
- [ ] Documenter les exceptions (CSS statique, traductions contrôlées)
- [ ] Préférer les composants React natifs à l'injection HTML

### Patterns corrects
```typescript
// ✅ Pour du texte simple
element.textContent = "↩";

// ✅ Pour du contenu React
<div>{translationText}</div>

// ✅ Si HTML contrôlé est nécessaire
import DOMPurify from "dompurify";
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />

// ✅ Pour les styles CSS
<style jsx>{`
  @media print { body { color: red; } }
`}</style>

// ✅ Exception documentée
{/* SECURITY: Static CSS for print media. No user input. */}
<style dangerouslySetInnerHTML={{ __html: printStyles }} />
```

---

## 📋 Checklist générale

### Avant de committer
- [ ] Pas de secrets ou credentials en dur
- [ ] Pas de console.log() en production
- [ ] Pas de TODO/FIXME sans ticket associé
- [ ] Tests unitaires pour la logique critique
- [ ] Pas de dépendances non-auditées

### Avant de merger
- [ ] Revue de code complétée
- [ ] Tous les tests passent
- [ ] Pas de warnings ESLint
- [ ] Documentation mise à jour si nécessaire
- [ ] Checklist sécurité validée

---

## 🔍 Commandes de vérification

### Chercher les patterns dangereux
```bash
# Chercher les startsWith("http")
grep -r "startsWith.*http" apps/web/src --include="*.ts" --include="*.tsx"

# Chercher les innerHTML
grep -r "\.innerHTML" apps/web/src --include="*.ts" --include="*.tsx"

# Chercher les dangerouslySetInnerHTML
grep -r "dangerouslySetInnerHTML" apps/web/src --include="*.ts" --include="*.tsx"

# Chercher les includes("http")
grep -r "includes.*http" apps/web/src --include="*.ts" --include="*.tsx"
```

### Lancer les vérifications de sécurité
```bash
# ESLint
npm run lint

# Tests
npm run test

# Vérifications globales
npm run checks
```

---

## 📚 Références

- [SECURITY_QUICK_REFERENCE.md](./SECURITY_QUICK_REFERENCE.md) - Guide rapide
- [url-validation-security.md](./url-validation-security.md) - Validation d'URL détaillée
- [dom-xss-prevention.md](./dom-xss-prevention.md) - Prévention XSS détaillée
- [CodeQL Documentation](https://codeql.github.com/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

## 🚨 Signaler une vulnérabilité

Si vous découvrez une vulnérabilité de sécurité :
1. NE PAS la publier publiquement
2. Consulter [SECURITY.md](../../SECURITY.md) pour les instructions
3. Contacter l'équipe de sécurité

