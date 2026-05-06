# Guide Qualité - Bonnes Pratiques de Développement

Ce guide recense les erreurs fréquentes et les bonnes pratiques à adopter pour maintenir la qualité du projet CleanMyMap.

---

## 1. Internationalisation (i18n)

### Règle d'or : Toujours fournir les deux langues

**❌ Ne jamais écrire uniquement en français :**
```tsx
// MAUVAIS
<p>Étape 1 - Filtrer</p>
<option value="all">Tous</option>
```

**✅ Toujours fournir FR et EN :**
```tsx
// BON
const fr = locale === "fr";
<p>{fr ? "Étape 1 - Filtrer" : "Step 1 - Filter"}</p>
<option value="all">{fr ? "Tous" : "All"}</option>
```

### Pattern recommandé

```tsx
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

export function MonComposant() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  
  return (
    <div>
      <p>{fr ? "Mon message en français" : "My message in English"}</p>
    </div>
  );
}
```

### Cas spéciaux

- **Locales centralisées** : Pour les messages réutilisés, privilégier les fichiers `fr.json` / `en.json` dans `src/locales/`.
- **Inline bilingual objects** : Pour les formulaires complexes (feedback, questionnaires), utiliser des objets `L10n` :
  ```tsx
  type L10n = { fr: string; en: string };
  const titles: L10n = { fr: "Bug", en: "Bug" };
  ```

---

## 2. Orthographe et Typographie Française

### Accents (prioritaires)

| Incorrect | Correct |
|-----------|---------|
| `Preparation` | `Préparation` |
| `Verifier` | `Vérifier` |
| `Donnees` | `Données` |
| `resume` | `résumé` |
| `Etap` | `Étape` |
| `batir` | `bâtir` |

### Apostrophe

**❌ Ne jamais utiliser l'apostrophe droite `'` dans JSX :**
```tsx
// MAUVAIS
<p>Votre lieu d'action</p>
```

**✅ Utiliser `&apos;` ou `'`escapé :**
```tsx
// BON
<p>Votre lieu d&apos;action</p>
```

### Guillemets dans JSX

**❌ Guillemets droits non échappés :**
```tsx
// MAUVAIS
<p>Mode "Expert"</p>
```

**✅ Utiliser les entités HTML :**
```tsx
// BON
<p>Mode &quot;Expert&quot;</p>
```

### Points de suspension

**❌ Vier points :**
```tsx
// MAUVAIS
<p>Chargement...</p>
```

**✅ Trois points avec espace precedente :**
```tsx
// BON
<p>Chargement en cours...</p>
```

---

## 3. Empty States et Messages Utilisateur

### Principe

Tous les messages d'absence de donnee (empty states) doivent etre informatifs et empathiques.

**❌ Minimaliste et froid :**
```tsx
// MAUVAIS
<p>Aucune donnee</p>
```

**✅ Informatif avec emoji optionnel :**
```tsx
// BON
<p className="flex items-center gap-2">
  <span>📊</span>
  Pas encore assez de donnees pour generer les graphiques.
</p>
```

### Exemples de bons messages

| Contexte | MessageFR | MessageEN |
|----------|-----------|-----------|
| Recherche | Aucun resultat pour cette recherche | No results for this search |
| Donnees carte | Aucune donnee de zone | No zone data |
| Graphiques | Pas assez de donnees pour les graphiques | Not enough data for charts |
| Utilisateur | Aucune donnee utilisateur disponible | No user data available |

---

## 4. Accessibilite

### aria-label obligatoire

Tout bouton sans texte visible (bouton icone) doit avoir un `aria-label`.

**❌ Bouton sans accessibilite :**
```tsx
// MAUVAIS
<button onClick={onRefresh}>
  <RefreshIcon size={20} />
</button>
```

**✅ Avec aria-label :**
```tsx
// BON
<button onClick={onRefresh} aria-label={fr ? "Rafraichir" : "Refresh"}>
  <RefreshIcon size={20} />
</button>
```

### Images

**❌ Ne jamais utiliser `<img>` dans Next.js :**
```tsx
// MAUVAIS
<img src="/logo.png" alt="Logo" />
```

**✅ Toujours utiliser le composant Image optimise :**
```tsx
// BON
import Image from "next/image";
<Image src="/logo.png" alt="Logo" width={100} height={50} />
```

---

## 5. Messages d'erreur et de Succes

### Structure recommandee

```tsx
// Erreurs
setErrorMessage(fr 
  ? "Impossible d'enregistrer. Verifiez votre connexion et reessayez."
  : "Unable to save. Check your connection and try again."
);

// Succes
setSuccessMessage(fr 
  ? "Action enregistree avec succes."
  : "Action saved successfully."
);
```

### Bonnes pratiques

1. **Etre precis** : Indiquer ce qui a echoue et pourquoi
2. **Donner une solution** : "Reessayez" ou "Verifiez..."
3. **Contextualiser** : Ne pas generer de faux positifs (eviter "Une erreur est survenue" sans detail)
4. **Dual language** : Toujours les deux langues

---

## 6. Conventions de Nommage

### Variables et fonctions

- **CamelCase** pour les variables et fonctions : `handleSubmit`, `userData`
- **PascalCase** pour les composants : `UserProfileCard`, `ActionDeclarationForm`
- **SCREAMING_SNAKE_CASE** pour les constantes : `MAX_RETRY_COUNT`, `DEFAULT_LOCALE`

### Comments

- **❌ JAMAIS de commentaires en francais avec accents mal encodes**
- **✅ Utiliser uniquement l'anglais pour le code ou des accents corrects**

---

## 7. Checklist Avant Commit

Avant chaque commit, verifier :

- [ ] **i18n** : Toutes les chaines ont leur version FR et EN ?
- [ ] **Orthographe** : Accents corrects, apostrophes echappees, guillemets echappes ?
- [ ] **Empty states** : Tous les messages d'absence sont informatifs ?
- [ ] **Accessibilite** : Boutons icone ont un aria-label ?
- [ ] **Images** : Utilise `<Image />` de Next.js et non `<img>` ?
- [ ] **Tests** : `npm test` passe (392 tests) ?
- [ ] **Build** : `npm run build` reussit ?
- [ ] **Lint** : `npm run lint` sans erreur (warnings acceptables) ?

---

## 8. Messages "En attente" (Pending States)

### Principe

Les messages "En attente" doivent être contextuels et expliquer ce qui est attendu.

**❌ Trop vague :**
```tsx
{label: "En attente"}
```

**✅ Contextuel et precis :**
```tsx
{label: "En attente de validation", en: "Awaiting validation"}
```

### Exemples de messages ameliores

| Contexte | Ancien | Nouveau |
|----------|--------|----------|
| Statut action | "En attente" | "En attente de validation" |
| XP gamification | "XP en attente" | "XP en attente de validation" + explication |
| Demandes partenaire | "En attente" | "En attente de validation" + contexte |
| Dashboard | "Elements en attente" | "Actions en attente de validation" |

### Ajouter du contexte si pertinent

```tsx
<p className="cmm-text-caption text-amber-600">En attente de votre décision</p>
```

---

## 9. Messages d'Erreur API

### Central error handler

Le projet utilise un handler centralise pour les erreurs API (`lib/http/api-errors.ts`).

**Caracteristiques :**
- Categorise les erreurs (validation, auth, forbidden, notFound, conflict, rateLimit, server)
- Retourne un message utilisateur generique (pas expose des details techniques)
- Genere un `referenceCode` unique pour support
- Log en console pour debugging
- Envoie a Sentry si active

**Exemple de reponse :**
```json
{
  "error": "Session expirée ou invalide. Veuillez vous reconnecter.",
  "referenceCode": "ERR-ABC123",
  "status": "error"
}
```

### Helper pour authentication

- `unauthorizedJsonResponse()` - 401 avec message user-friendly
- `forbiddenJsonResponse()` - 403 avec message user-friendly

---

## 10. Messages de Validation

### Principe

Chaque message doit indiquer clairement ce qui ne va pas et comment corriger.

**Exemples de bons messages :**

| Situation | Message |
|-----------|---------|
| Selection manquante | "Selectionnez une zone (arrondissement ou commune)." |
| Tracé manquant | "Ajoute un tracage manuel valide ou un apercu geographique avant l'envoi." |
| Erreur API | "Impossible d'envoyer votre demande pour le moment. Veuillez verifier vos informations ou reessayer plus tard." |
| Champ requis | "Selectionne au moins un arrondissement." |
| Logique invalide | "Chaque creneau doit avoir une heure de debut avant l'heure de fin." |

---

## 11. Cohérence FR/EN des Locales

### Fichiers de locales

- `apps/web/src/locales/fr.json` (158 lignes)
- `apps/web/src/locales/en.json` (158 lignes)

### Regles de coherence

1. **Meme structure** : Les deux fichiers doivent avoir les memes cles
2. **Traductions equivalentes** : Le sens doit etre equivalent, pas mot pour mot
3. **Ponctuation coherente** : Meme style de ponctuation

**Exemples de corrections :**

| Cle | FR (avant) | FR (apres) | EN (avant) | EN (apres) |
|-----|------------|------------|-------------|-------------|
| btn_action | "Declarer" | "Nettoyer maintenant" | "GO CLEAN UP NOW" | "Clean now" |
| btn_signal | "Signaler" | "Signaler un lieu sale" | "REPORT A DIRTY ZONE" | "Report dirty zone" |
| btn_impact | "Impact" | "Mon impact" | "MY IMPACT" | "My impact" |
| footer.partner | "PARTENAIRE ADEME..." | (inchange) | "PARTENAIRE ADEME..." | "ADEME PARTNER COMING SOON" |

---

## 12. Loading States (Boutons de soumission)

### Principe

Tous les boutons de soumission doivent avoir un etat loading pour eviter les doubles envois.

**Pattern utilise :**

```tsx
const [isSubmitting, setIsSubmitting] = useState(false);

// ... logique de soumission ...

<button type="submit" disabled={isSubmitting}>
  {isSubmitting 
    ? (fr ? "Envoi..." : "Sending...") 
    : (fr ? "Envoyer" : "Send")}
</button>
```

**Texte de loading recommandes :**
- "Envoi en cours..." / "Sending..."
- "Enregistrement..." / "Saving..."
- "Traitement..." / "Processing..."

---

## 13. Cohérence des CTA

### Les 3 types de boutons a preservers

| Type | Usage | Exemple |
|------|-------|---------|
| **Primary** (emerald) | Actions principales critiques | "Valider et continuer", "Confirmer l'envoi" |
| **Secondary** | Actions importantes mais non bloquantes | "Details de l'intervention", "Retour" |
| **Tertiaire** (ghost) | Actions mineures | "Reset", liens texte |

**Verifier l'usage :**
- Les boutons "Confirmer", "Enregistrer" utilisent `tone="primary"`
- Les boutons "Retour", "Annuler" utilisent `tone="secondary"`
- Utiliser `CmmButton` au lieu de `<button>` avec styles customises

---

## 14. Accessibilite - aria-labels

### Boutons icon-only

Tout bouton sans texte visible doit avoir un `aria-label` descriptif.

**Exemples d'aria-labels corrects :**

| Bouton | aria-label |
|--------|-------------|
| Fermer panneau | "Fermer le panneau" / "Close panel" |
| Joindre fichier | "Joindre un fichier" |
| Envoyer message | "Envoyer le message" |
| Supprimer photo | "Supprimer les photos jointes" |
| Recentrer carte | "Recentrer la carte" |

---

## 15. Tooltips

### Quand utiliser

- **Boutons ambigus** : Quand l'icone seule ne suffit pas
- **Explications de KPI** : Formula de calcul, methode de score
- **Infos methodologiques** : Explications de metriques

**Pattern utilise (data-tooltip-content) :**

```tsx
<button
  aria-label="Formule de calcul pour Volume collecte"
  data-tooltip-content="Volume collecte = poids actuel - poids periode precedente"
  data-tooltip-placement="top"
>
  i
</button>
```

**Note** : Ne pas surcharger l'interface avec des tooltips pour des actions deja explicites.

---

## 16. Ratios de Contraste (WCAG)

### Couleurs du design system (verifiees)

**Light Theme:**
| Variable | Couleur | Ratio | WCAG |
|-----------|---------|-------|------|
| `--text-primary` | `#0f172a` | ~14.8:1 | ✅ AA |
| `--text-secondary` | `#334155` | ~9:1 | ✅ AA |
| `--text-muted` | `#64748b` | ~4.4:1 | ✅ AA Large |

**Dark Theme:**
| Variable | Couleur | Ratio | WCAG |
|-----------|---------|-------|------|
| `--text-primary` | `#f8fafc` | ~15:1 | ✅ AA |
| `--text-secondary` | `#e2e8f0` | ~10.5:1 | ✅ AA |
| `--text-muted` | `#94a3b8` | ~5.5:1 | ✅ AA |

### Regles

- **Texte principal** (`cmm-text-primary`) : Toujours excellent contraste (~14-15:1)
- **Texte secondaire** (`cmm-text-secondary`) : Bon contraste (~9-10:1)
- **Texte mute** (`cmm-text-muted`) : Utiliser uniquement pour captions et hints

---

## 17. TODOs et FIXMEs

### Politique

- **Supprimer** : Si le TODO est un placeholder sans action necessaire
- **Reformuler** : Si c'est une intention future a documenter clairement
- **Resoudre** : Si c'est une correction simple et certaine

**Exemples de traitement :**

| TODO | Action |
|------|--------|
| `// TODO: Send to analytics service` | ✅ Supprime (deja fonctionnel via console.log) |
| `// TODO: Get from auth` | ✅ Reformule en `// Note: anonymous for public quick-form (optional auth in v2)` |

---

## 18. Checklist Avant Commit

Avant chaque commit, verifier :

- [ ] **i18n** : Toutes les chaines ont leur version FR et EN ?
- [ ] **Orthographe** : Accents corrects, apostrophes echappees, guillemets echappes ?
- [ ] **Empty states** : Tous les messages d'absence sont informatifs ?
- [ ] **En attente** : Messages "pending" sont contextuels ?
- [ ] **Accessibilite** : Boutons icone ont un aria-label ?
- [ ] **Images** : Utilise `<Image />` de Next.js et non `<img>` ?
- [ ] **Loading** : Boutons de soumission ont un etat loading ?
- [ ] **Validation** : Messages d'erreur sont precis et actionnables ?
- [ ] **Contraste** : Les couleurs passent WCAG AA ?
- [ ] **Tests** : `npm test` passe (392 tests) ?
- [ ] **Build** : `npm run build` reussit ?
- [ ] **Lint** : `npm run lint` sans erreur (warnings acceptables) ?

---

## 19. Resources

- **Locales** : `apps/web/src/locales/fr.json`, `en.json`
- **Design System** : `documentation/design-system/`
- **ESLint** : `documentation/development/LINT_CORRECTION_CHECKLIST.md`
- **Contributing** : `documentation/development/CONTRIBUTING.md`
- **Erreurs API** : `apps/web/src/lib/http/api-errors.ts`, `auth-responses.ts`

---

*Ce guide est maintenir a jour par les contributeurs. En cas de doute, se referer au channel #quality sur Slack ou ouvrir une PR avec la etiqueta `quality`.*