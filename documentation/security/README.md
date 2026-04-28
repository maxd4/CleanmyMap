# Security - Guide IA

Documentation sécurité pour agents IA. **CRITIQUE - Lire avant toute modification sensible.**

---

## 🔐 Fichiers Essentiels pour IA

### Guides Principaux
- **SECURITY_GUIDE.md** ⭐ - Guide sécurité complet
- **SECURITY_QUICK_REFERENCE.md** ⭐ - Référence rapide
- **SECURITY.md** - Politique de sécurité

### Authentification & Autorisation
- **AUTHZ.md** - Autorisation
- **authz-authn-regles.md** - Règles auth/authz

### Prévention des Vulnérabilités
- **dom-xss-prevention.md** - Prévention XSS/injection HTML
- **url-validation-security.md** - Validation d'URL sécurisée
- **regex-security.md** - Sécurité des regex
- **api-vigilance.md** - Vigilance API

### Gestion des Secrets
- **gestion-secrets-et-env.md** - Gestion secrets et variables d'env

### Workflow & Patterns
- **DEVELOPER_WORKFLOW.md** - Workflow développeur sécurisé
- **CODE_REVIEW_CHECKLIST.md** - Checklist code review
- **PATTERNS_VISUAL_GUIDE.md** - Guide visuel des patterns
- **STRUCTURE.md** - Structure sécurité

---

## 🤖 Règles Strictes pour IA

### ✅ TOUJOURS FAIRE

1. **Valider les URLs**
   ```typescript
   // ✅ BON
   import { isValidUrl } from '@/lib/security/url-validation';
   if (!isValidUrl(url)) throw new Error('Invalid URL');
   
   // ❌ MAUVAIS
   window.location.href = userInput; // XSS !
   ```

2. **Échapper le HTML**
   ```typescript
   // ✅ BON
   import DOMPurify from 'dompurify';
   const clean = DOMPurify.sanitize(userInput);
   
   // ❌ MAUVAIS
   dangerouslySetInnerHTML={{ __html: userInput }} // XSS !
   ```

3. **Vérifier les autorisations**
   ```typescript
   // ✅ BON
   import { requireAuth, requireRole } from '@/lib/authz';
   await requireRole('admin');
   
   // ❌ MAUVAIS
   // Pas de vérification d'autorisation
   ```

4. **Ne jamais exposer de secrets**
   ```typescript
   // ✅ BON
   const apiKey = process.env.API_KEY; // Côté serveur uniquement
   
   // ❌ MAUVAIS
   const apiKey = 'sk_live_xxx'; // Hardcodé !
   ```

### ❌ NE JAMAIS FAIRE

1. **Ne jamais utiliser dangerouslySetInnerHTML sans sanitization**
2. **Ne jamais faire confiance aux entrées utilisateur**
3. **Ne jamais exposer de clés API côté client**
4. **Ne jamais bypasser les vérifications d'autorisation**
5. **Ne jamais utiliser eval() ou Function()**

---

## 🚨 Checklist Sécurité IA

```
□ SECURITY_GUIDE.md consulté
□ Entrées utilisateur validées
□ HTML échappé/sanitizé
□ URLs validées
□ Autorisations vérifiées
□ Pas de secrets exposés
□ Pas de dangerouslySetInnerHTML sans DOMPurify
□ Pas d'eval() ou Function()
□ CODE_REVIEW_CHECKLIST.md suivie
```

---

## 📊 Workflow Sécurité IA

```
1. Lire SECURITY_GUIDE.md
   ↓
2. Identifier les risques (XSS, injection, etc.)
   ↓
3. Appliquer les protections appropriées
   ↓
4. Valider avec SECURITY_QUICK_REFERENCE.md
   ↓
5. Code review avec CODE_REVIEW_CHECKLIST.md
```

---

## 🎯 Vulnérabilités Courantes à Éviter

### XSS (Cross-Site Scripting)
```typescript
// ❌ VULNÉRABLE
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ SÉCURISÉ
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

### Open Redirect
```typescript
// ❌ VULNÉRABLE
router.push(req.query.redirect);

// ✅ SÉCURISÉ
import { isValidUrl, isSameDomain } from '@/lib/security/url-validation';
if (isValidUrl(url) && isSameDomain(url)) {
  router.push(url);
}
```

### Injection SQL
```typescript
// ❌ VULNÉRABLE
db.query(`SELECT * FROM users WHERE id = ${userId}`);

// ✅ SÉCURISÉ
db.query('SELECT * FROM users WHERE id = $1', [userId]);
```

### Exposition de Secrets
```typescript
// ❌ VULNÉRABLE
const config = { apiKey: 'sk_live_xxx' };

// ✅ SÉCURISÉ
const config = { apiKey: process.env.API_KEY }; // Serveur uniquement
```

---

## 🔍 Avant Chaque Commit

1. **Scan mental sécurité**
   - Y a-t-il des entrées utilisateur ?
   - Sont-elles validées/échappées ?
   - Y a-t-il des redirections ?
   - Y a-t-il du HTML dynamique ?

2. **Vérifier CODE_REVIEW_CHECKLIST.md**

3. **Tester les cas malveillants**
   - Injection HTML : `<script>alert('XSS')</script>`
   - Injection URL : `javascript:alert('XSS')`
   - SQL injection : `' OR '1'='1`

---

**Optimisé pour** : Agents IA  
**Priorité** : CRITIQUE  
**Dernière mise à jour** : 2025-01-XX
