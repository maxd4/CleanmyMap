# Guide de Sécurité Rapide - Erreurs Courantes

## 🚨 Erreurs à NE PAS faire

### 1. Validation d'URL avec `startsWith()` ou `includes()`

#### ❌ DANGEREUX
```typescript
// CodeQL: js/incomplete-url-substring-sanitization
if (url.startsWith("https://")) { /* ... */ }
if (url.includes("http")) { /* ... */ }
if (url.indexOf("http") === 0) { /* ... */ }
```

**Pourquoi ?** Ces patterns peuvent être contournés :
- `"https://evil.com/https://legit.com"` passe le test `startsWith("https://")`
- `"javascript://alert(1)//http"` passe le test `includes("http")`

#### ✅ CORRECT
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

**Où utiliser cette fonction :**
- `lib/supabase/server.ts` ✅ Déjà corrigé
- `lib/supabase/client.ts` ✅ Déjà corrigé
- `lib/persistence/runtime-store.ts` ✅ Déjà corrigé

---

### 2. Injection HTML avec `innerHTML` ou `dangerouslySetInnerHTML`

#### ❌ DANGEREUX
```typescript
// CodeQL: js/xss-through-dom
element.innerHTML = userInput;
button.innerHTML = "↩"; // Même du texte statique peut être flaggé

// React
<div dangerouslySetInnerHTML={{ __html: t("footer.partner") }} />
<style dangerouslySetInnerHTML={{ __html: `@media print { ... }` }} />
```

**Pourquoi ?** Permet les attaques XSS :
- `userInput = "<img src=x onerror='alert(1)'>"` → exécute du code
- CodeQL détecte même les constantes pour éviter les faux négatifs

#### ✅ CORRECT

**Pour du texte simple :**
```typescript
// Utiliser textContent au lieu de innerHTML
button.textContent = "↩"; // Interprété comme du texte, pas du HTML
```

**Pour du contenu React :**
```typescript
// Laisser React sanitiser automatiquement
<div>{translationText}</div>

// Si HTML contrôlé est nécessaire, sanitiser avec DOMPurify
import DOMPurify from "dompurify";

<div 
  dangerouslySetInnerHTML={{ 
    __html: DOMPurify.sanitize(t("footer.partner")) 
  }} 
/>
```

**Pour les styles CSS :**
```typescript
// Utiliser styled-components ou style JSX
<style jsx>{`
  @media print {
    body { -webkit-print-color-adjust: exact; }
  }
`}</style>

// Ou utiliser la prop style React
<div style={{ color: "red" }}>Texte</div>
```

**Exceptions documentées :**
```typescript
{/* 
  SECURITY: Static CSS for print media. 
  No user input. Safe per js/xss-through-dom guidelines.
  See: documentation/security/dom-xss-prevention.md
*/}
<style dangerouslySetInnerHTML={{ __html: printStyles }} />
```

**Où utiliser :**
- `components/actions/action-drawing-map.tsx` ✅ Déjà corrigé (utilise `textContent`)

---

## 📋 Checklist pour les revues de code

### URLs
- [ ] Pas de `startsWith("http")` ou `startsWith("https://")`
- [ ] Pas de `includes("http")` pour détecter des liens
- [ ] Pas de `indexOf("http")` pour valider des URLs
- [ ] Utiliser `new URL()` avec try/catch pour parser les URLs
- [ ] Vérifier explicitement `parsed.protocol === "https:"`
- [ ] Pour les hostnames, comparer `parsed.hostname` (pas de substring)

### innerHTML / XSS
- [ ] Pas de `innerHTML` avec contenu utilisateur
- [ ] Pas de `dangerouslySetInnerHTML` sans sanitisation
- [ ] Utiliser `textContent` pour du texte simple
- [ ] Sanitiser avec DOMPurify si HTML dynamique nécessaire
- [ ] Documenter les exceptions (CSS statique, traductions contrôlées)
- [ ] Préférer les composants React natifs à l'injection HTML

---

## 🔗 Références complètes

- **URL Validation :** `documentation/security/url-validation-security.md`
- **DOM XSS Prevention :** `documentation/security/dom-xss-prevention.md`
- **CodeQL js/incomplete-url-substring-sanitization :** https://codeql.github.com/codeql-query-help/javascript/js-incomplete-url-substring-sanitization/
- **CodeQL js/xss-through-dom :** https://codeql.github.com/codeql-query-help/javascript/js-xss-through-dom/
- **OWASP Input Validation :** https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
- **OWASP DOM-based XSS :** https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html

---

## 💡 Commandes utiles

Chercher les patterns dangereux dans le code :
```bash
# Chercher les startsWith("http")
grep -r "startsWith.*http" apps/web/src --include="*.ts" --include="*.tsx"

# Chercher les innerHTML
grep -r "\.innerHTML" apps/web/src --include="*.ts" --include="*.tsx"

# Chercher les dangerouslySetInnerHTML
grep -r "dangerouslySetInnerHTML" apps/web/src --include="*.ts" --include="*.tsx"
```

---

## 📝 Historique des corrections

| Date | Fichier | Correction |
|------|---------|-----------|
| 2026-04-24 | `lib/supabase/server.ts` | Ajout `hasHttpsProtocol()` helper |
| 2026-04-24 | `lib/supabase/client.ts` | Ajout `hasHttpsProtocol()` helper |
| 2026-04-24 | `lib/persistence/runtime-store.ts` | Ajout `hasHttpsProtocol()` helper |
| 2026-04-24 | `components/actions/action-drawing-map.tsx` | Remplacé `innerHTML` par `textContent` |
| 2026-04-24 | Ce fichier | Création du guide de référence rapide |

