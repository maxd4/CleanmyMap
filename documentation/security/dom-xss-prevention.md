# DOM XSS Prevention

> **Démarrage rapide :** Voir [SECURITY_QUICK_REFERENCE.md](./SECURITY_QUICK_REFERENCE.md) pour un guide condensé.

## CodeQL Warning: js/xss-through-dom

### Problème

L'utilisation de `innerHTML`, `outerHTML`, `document.write()`, ou `dangerouslySetInnerHTML` avec du contenu non-sanitisé peut conduire à des attaques XSS (Cross-Site Scripting).

### Patterns dangereux

```typescript
// ❌ DANGEREUX — XSS si userInput contient <script>
element.innerHTML = userInput;

// ❌ DANGEREUX — même avec des constantes (CodeQL les détecte)
button.innerHTML = "↩";

// ❌ DANGEREUX — React dangerouslySetInnerHTML avec traductions
<div dangerouslySetInnerHTML={{ __html: t("footer.partner") }} />

// ❌ DANGEREUX — CSS via dangerouslySetInnerHTML
<style dangerouslySetInnerHTML={{ __html: `
  @media print { body { color: red; } }
`}} />
```

### Solutions sûres

#### 1. Utiliser `textContent` pour du texte simple

```typescript
// ✅ SÛR — interprète comme du texte, pas du HTML
button.textContent = "↩";
```

#### 2. Utiliser des composants React natifs

```typescript
// ✅ SÛR — React sanitise automatiquement
<div>{translationText}</div>

// ✅ SÛR — pour les traductions avec HTML contrôlé
<div 
  dangerouslySetInnerHTML={{ 
    __html: DOMPurify.sanitize(t("footer.partner")) 
  }} 
/>
```

#### 3. Sanitiser avec DOMPurify si HTML nécessaire

```typescript
import DOMPurify from "dompurify";

// ✅ SÛR — HTML sanitisié
const cleanHtml = DOMPurify.sanitize(dirtyHtml);
element.innerHTML = cleanHtml;
```

#### 4. Pour les styles CSS inline

```typescript
// ✅ SÛR — utiliser JSX style prop
<style jsx>{`
  @media print {
    body { -webkit-print-color-adjust: exact; }
  }
`}</style>

// Ou avec styled-components/emotion
```

### Exceptions acceptables

Cas où `dangerouslySetInnerHTML` peut être acceptable avec documentation:

1. **Contenu statique contrôlé** (pas d'input utilisateur)
2. **Styles CSS pour impression** (`@media print`)
3. **Contenu de traductions auditées**

Dans ces cas, ajouter un commentaire explicite:

```typescript
{/* 
  SECURITY: Static CSS for print media. 
  No user input. Safe per js/xss-through-dom guidelines.
*/}
<style dangerouslySetInnerHTML={{ __html: printStyles }} />
```

### Fichiers avec innerHTML corrigés

| Fichier | Usage | Statut |
|---------|-------|--------|
| `components/actions/action-drawing-map.tsx` | `button.innerHTML = "↩"` | Remplacé par `textContent` |
| `app/(app)/methodologie/page.tsx` | `dangerouslySetInnerHTML` pour traduction | À remplacer par sanitisation |
| `app/(app)/prints/report/page.tsx` | `dangerouslySetInnerHTML` pour CSS print | Documenté comme safe |

### Checklist pour les revues de code

- [ ] Pas de `innerHTML` avec contenu utilisateur
- [ ] Pas de `dangerouslySetInnerHTML` sans sanitisation
- [ ] Utiliser `textContent` pour du texte simple
- [ ] Sanitiser avec DOMPurify si HTML dynamique nécessaire
- [ ] Documenter les exceptions (CSS statique, traductions contrôlées)
- [ ] Préférer les composants React natifs à l'injection HTML

### Références

- [CodeQL: js/xss-through-dom](https://codeql.github.com/codeql-query-help/javascript/js-xss-through-dom/)
- [OWASP: DOM-based XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [CWE-79: Cross-site Scripting (XSS)](https://cwe.mitre.org/data/definitions/79.html)
- [Guide rapide](./SECURITY_QUICK_REFERENCE.md#2-injection-html-avec-innerhtml-ou-dangerouslysetinnerhtml)
