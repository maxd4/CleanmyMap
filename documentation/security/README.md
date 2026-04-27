# Documentation Sécurité

Guides et références pour éviter les vulnérabilités courantes dans CleanMyMap.

> **Navigation:** Voir [INDEX.md](./INDEX.md) pour trouver rapidement ce que vous cherchez.

## 📚 Guides disponibles

### 🚀 Démarrage rapide
- **[SECURITY_QUICK_REFERENCE.md](./SECURITY_QUICK_REFERENCE.md)** - Guide de référence rapide pour les erreurs courantes (URL, innerHTML)
- **[DEVELOPER_WORKFLOW.md](./DEVELOPER_WORKFLOW.md)** - Intégration dans votre workflow de développement

### 🔐 Guides détaillés
- **[url-validation-security.md](./url-validation-security.md)** - Validation sécurisée des URLs (CodeQL: js/incomplete-url-substring-sanitization)
- **[dom-xss-prevention.md](./dom-xss-prevention.md)** - Prévention des attaques XSS via le DOM (CodeQL: js/xss-through-dom)
- **[regex-security.md](./regex-security.md)** - Patterns de regex sécurisés

### 📋 Outils
- **[CODE_REVIEW_CHECKLIST.md](./CODE_REVIEW_CHECKLIST.md)** - Checklist pour les revues de code
- **[PATTERNS_VISUAL_GUIDE.md](./PATTERNS_VISUAL_GUIDE.md)** - Guide visuel des patterns dangereux vs sûrs
- **[CORRECTIONS_SUMMARY.md](./CORRECTIONS_SUMMARY.md)** - Résumé des corrections effectuées

## 🎯 Erreurs les plus courantes

### 1. Validation d'URL insuffisante
```typescript
// ❌ DANGEREUX
if (url.startsWith("https://")) { }

// ✅ CORRECT
function hasHttpsProtocol(url: string | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}
```

### 2. Injection HTML
```typescript
// ❌ DANGEREUX
element.innerHTML = userInput;
<div dangerouslySetInnerHTML={{ __html: content }} />

// ✅ CORRECT
element.textContent = userInput;
<div>{content}</div>
```

## 📋 Checklist avant commit

- [ ] Pas de `startsWith("http")` pour valider des URLs
- [ ] Pas de `innerHTML` avec contenu utilisateur
- [ ] Pas de `dangerouslySetInnerHTML` sans sanitisation
- [ ] Utiliser `textContent` pour du texte simple
- [ ] Utiliser `new URL()` pour parser les URLs

## 🔗 Ressources externes

- [CodeQL Documentation](https://codeql.github.com/)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [CWE Top 25](https://cwe.mitre.org/top25/)

## 📞 Questions ?

Consultez les guides détaillés ou ouvrez une issue sur le repository.
