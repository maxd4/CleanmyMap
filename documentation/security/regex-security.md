# Sécurité Regex — ReDoS Prevention

## Introduction

Ce document décrit les pratiques de sécurité pour éviter les attaques **ReDoS (Regular expression Denial of Service)** dans le codebase CleanmyMap.

## Qu'est-ce que ReDoS ?

ReDoS (Regular expression Denial of Service) est une attaque qui exploite des expressions régulières avec des quantificateurs imbriqués pour provoquer un backtracking exponentiel, rendant l'application non réactive.

### Exemple problématique

```typescript
// ❌ DANGEREUX — ReDoS possible
const pattern = /[a-zA-Z\d+\-.]*:\/\//;
pattern.test("aaaaaaaaaaaaaaaaaaaaaaaa!"); // Peut bloquer le processus
```

La regex ci-dessus a un quantificateur `*` dans une classe de caractères avec plusieurs alternatives possibles, créant un backtracking exponentiel.

## Patterns à éviter (CodeQL Warning: js/regex/dos)

### 1. Nested Quantifiers (Quantificateurs imbriqués)

```typescript
// ❌ DANGEREUX
/a*b*/     // Deux quantificateurs consécutifs
/(a+)+/    // Quantificateur groupé répété
/a?a?a?/   // Alternatives avec quantificateurs
```

### 2. Alternatives ambiguës

```typescript
// ❌ DANGEREUX — ordre non optimal
/(?:e|er|eme)?/  // "er" et "eme" commencent par "e"

// ✅ SÛR — ordre par longueur décroissante
/(?:eme|er|e)?/  // Teste d'abord les plus longues
```

### 3. Quantificateurs avec backtracking

```typescript
// ❌ DANGEREUX
/(["'`])((?:\\.|(?!\1)[\s\S])*)\1/g  // (?!) lookahead négatif = backtracking

// ✅ SÛR — remplacer par parsing itératif
function parseStrings(raw: string): string[] {
  const strings: string[] = [];
  const quotes = new Set(['"', "'", '`']);
  let i = 0;
  while (i < raw.length) {
    const ch = raw[i];
    if (!quotes.has(ch)) { i++; continue; }
    const quote = ch;
    let j = i + 1;
    let value = '';
    while (j < raw.length && raw[j] !== quote) {
      if (raw[j] === '\\' && j + 1 < raw.length) {
        value += raw[j + 1];
        j += 2;
      } else {
        value += raw[j];
        j++;
      }
    }
    if (j < raw.length) strings.push(value);
    i = j + 1;
  }
  return strings;
}
```

## Patterns sûrs

### 1. Quantificateurs bornés

```typescript
// ✅ SÛR — limité à 30 caractères
if (/^[+\d]/.test(str) && str.length <= 30) { }
```

### 2. Alternatives ordonnées (longueur décroissante)

```typescript
// ✅ SÛR — teste "eme" avant "er" avant "e"
const pattern = /(?:eme|er|e)?/;
```

### 3. Utiliser `new URL()` au lieu de regex

```typescript
// ❌ DANGEREUX
if (url.startsWith("https://")) { }

// ✅ SÛR — parsing complet
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

### 4. Boucles itératives

```typescript
// ❌ DANGEREUX — regex avec lookahead
const matches = raw.matchAll(/(["'`])((?:\\.|(?!\1)[\s\S])*)\1/g);

// ✅ SÛR — parsing caractère par caractère
function collectHumanStrings(raw: string): string[] {
  const strings: string[] = [];
  const quotes = new Set(['"', "'", '`']);
  let i = 0;
  while (i < raw.length) {
    const ch = raw[i];
    if (!quotes.has(ch)) { i++; continue; }
    const quote = ch;
    let j = i + 1;
    let value = '';
    while (j < raw.length && raw[j] !== quote) {
      if (raw[j] === '\\' && j + 1 < raw.length) {
        value += raw[j + 1];
        j += 2;
      } else {
        value += raw[j];
        j++;
      }
    }
    if (j < raw.length) {
      if (/\s|['']/.test(value) && !/^https?:\/\//i.test(value)) {
        strings.push(value);
      }
    }
    i = j + 1;
  }
  return strings;
}
```

## Liste des fichiers corrigés

| Fichier | Pattern corrigé | Solution |
|---------|----------------|----------|
| `lib/env.ts` | `/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//` | `new URL()` parsing |
| `lib/partners/onboarding-types.ts` | `/(?:Paris\s*)?(\d{1,2})/` | `\s*` → `\s+` + `\b` |
| `lib/partners/onboarding-types.ts` | `/^https?:\/\//i` | + `length < 2048` guard |
| `lib/geo/paris-arrondissements.ts` | alternation order | Réordonné par longueur |
| `lib/route/recommendation-assistant.ts` | alternation order | Réordonné par longueur |
| `lib/pilotage/business-alerts.ts` | alternation order | Réordonné par longueur |
| `lib/pilotage/overview.utils.ts` | alternation order | Réordonné par longueur |
| `lib/pilotage/overview-shared.ts` | alternation order | Réordonné par longueur |
| `lib/community/engagement.helpers.ts` | alternation order | Réordonné par longueur |
| `lib/community/engagement/shared.ts` | alternation order | Réordonné par longueur |
| `lib/analytics/territorial-benchmark.ts` | alternation order | Réordonné par longueur |
| `lib/analytics/compare-zones.ts` | alternation order | Réordonné par longueur |
| `components/sections/rubriques/actors-section.tsx` | alternation order | Réordonné par longueur |
| `components/sections/rubriques/helpers.ts` | alternation order | Réordonné par longueur |
| `lib/partners/published-annuaire-entries-store.ts` | `/^[+\d][\d\s().-]+$/` | Split + length guard |
| `lib/i18n/french-copy-accents.test.ts` | complex lookahead | Boucle itérative |

## Liste des URL substring fixes

| Fichier | Pattern avant | Solution |
|---------|---------------|----------|
| `lib/supabase/server.ts` | `startsWith("https://")` | `hasHttpsProtocol()` avec `new URL()` |
| `lib/supabase/client.ts` | `startsWith("https://")` | `hasHttpsProtocol()` avec `new URL()` |
| `lib/persistence/runtime-store.ts` | `startsWith("https://")` | `hasHttpsProtocol()` avec `new URL()` |
| `components/sections/rubriques/academie-climat-workshops.test.ts` | `startsWith("https://www...")` | `new URL().hostname` |

## Checklist pour les revues de code

- [ ] Pas de quantificateurs imbriqués (`(a+)+`, `a*b*`)
- [ ] Alternatives ordonnées par longueur décroissante
- [ ] Longueur des entrées limitée avant test regex
- [ ] `new URL()` préféré à `startsWith("https://")`
- [ ] Pas de lookahead/arrière avec quantificateurs
- [ ] Regex de test ont des alternatives explicites (pas de `.*`)

## Références

- [CodeQL: js/regex/dos](https://codeql.github.com/codeql-query-help/javascript/js-regex-dos/)
- [CWE-1333: Inefficient Regular Expression Complexity](https://cwe.mitre.org/data/definitions/1333.html)
- [OWASP: Regular expression Denial of Service](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS)
