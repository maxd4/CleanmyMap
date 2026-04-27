# 📖 Guide d'Utilisation - Composants Canoniques Améliorés

**Date:** 2026-04-25
**Objectif:** Montrer comment utiliser les composants canoniques améliorés

---

## 🎯 Nouveaux composants

### 1. CmmSection - Section avec accent automatique

```typescript
import { CmmSection, CmmSectionGroup, CmmPageLayout } from "@/components/ui/cmm-section";

// Section simple avec accent automatique
<CmmSection blockId="impact" title="Impact environnemental">
  <p>Contenu de la section...</p>
</CmmSection>

// Section avec description
<CmmSection 
  blockId="act" 
  title="Actions terrain"
  description="Gérez vos cleanwalks et actions de dépollution"
  accentType="bar"
  barPosition="left"
>
  <div>Contenu...</div>
</CmmSection>

// Section sans accent
<CmmSection 
  blockId="home" 
  title="Informations générales"
  accentType="none"
>
  <p>Contenu neutre...</p>
</CmmSection>
```

### 2. Classes utilitaires pour accents

```typescript
// Classes d'accent par bloc (ajoutées dans globals.css)
<div className="cmm-accent-impact p-4 rounded-lg">
  Section avec accent impact (emerald)
</div>

<div className="cmm-accent-act p-4 rounded-lg">
  Section avec accent action (amber)
</div>

// Dots d'accent
<span className="cmm-dot-impact h-2 w-2 rounded-full" />
<span className="cmm-dot-visualize h-2 w-2 rounded-full" />

// Rings d'accent
<div className="cmm-ring-network ring-2 rounded-lg p-4">
  Élément avec ring réseau (violet)
</div>
```

---

## 🏗️ Patterns d'utilisation

### Page complète avec sections

```typescript
import { 
  CmmPageLayout, 
  CmmSectionGroup, 
  CmmSection 
} from "@/components/ui/cmm-section";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";

export default function ExamplePage() {
  return (
    <CmmPageLayout maxWidth="2xl" padding="lg">
      <CmmSectionGroup spacing="lg">
        
        {/* Header de page */}
        <CmmSection 
          blockId="home" 
          title="Tableau de bord"
          description="Vue d'ensemble de vos activités"
          titleSize="h1"
          accentType="none"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CmmCard tone="emerald" variant="elevated">
              <h3>Actions réalisées</h3>
              <p className="text-2xl font-bold">42</p>
            </CmmCard>
            <CmmCard tone="sky" variant="elevated">
              <h3>Déchets collectés</h3>
              <p className="text-2xl font-bold">156 kg</p>
            </CmmCard>
            <CmmCard tone="amber" variant="elevated">
              <h3>Bénévoles mobilisés</h3>
              <p className="text-2xl font-bold">28</p>
            </CmmCard>
          </div>
        </CmmSection>

        {/* Section Actions */}
        <CmmSection 
          blockId="act" 
          title="Mes actions"
          description="Gérez vos cleanwalks et actions de dépollution"
          accentType="bar"
          barPosition="left"
        >
          <div className="space-y-4">
            <CmmButton href="/actions/new" tone="primary">
              Nouvelle action
            </CmmButton>
            <CmmButton href="/actions" tone="secondary">
              Voir toutes les actions
            </CmmButton>
          </div>
        </CmmSection>

        {/* Section Visualisation */}
        <CmmSection 
          blockId="visualize" 
          title="Carte et données"
          accentType="dot"
        >
          <p>Visualisez vos actions sur la carte commune.</p>
          <CmmButton href="/actions/map" tone="primary">
            Ouvrir la carte
          </CmmButton>
        </CmmSection>

        {/* Section Impact */}
        <CmmSection 
          blockId="impact" 
          title="Impact environnemental"
          accentType="ring"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="cmm-accent-impact p-4 rounded-lg">
              <h4>CO₂ évité</h4>
              <p className="text-xl font-bold">1.2 tonnes</p>
            </div>
            <div className="cmm-accent-impact p-4 rounded-lg">
              <h4>Eau préservée</h4>
              <p className="text-xl font-bold">3,400 L</p>
            </div>
          </div>
        </CmmSection>

        {/* Section Réseau */}
        <CmmSection 
          blockId="network" 
          title="Mon réseau"
          accentType="gradient"
        >
          <p>Connectez-vous avec d'autres acteurs locaux.</p>
          <div className="flex gap-2">
            <span className="cmm-dot-network h-2 w-2 rounded-full" />
            <span>5 partenaires actifs</span>
          </div>
        </CmmSection>

      </CmmSectionGroup>
    </CmmPageLayout>
  );
}
```

### Utilisation dans les rubriques existantes

```typescript
// Remplacer dans SectionShell
import { CmmSection, CmmSectionGroup } from "@/components/ui/cmm-section";

export function SectionShell(props: SectionShellProps) {
  const { locale } = useSitePreferences();
  
  return (
    <CmmPageLayout>
      <CmmSectionGroup spacing="lg">
        
        {/* Header */}
        <CmmSection 
          blockId="home" 
          title={t(locale, props.title)}
          description={t(locale, props.subtitle)}
          titleSize="h1"
          accentType="none"
        >
          <RubriquePdfExportButton rubriqueTitle={t(locale, props.title)} />
        </CmmSection>

        {/* Résumer */}
        <CmmSection 
          blockId="home" 
          title={locale === "fr" ? "Résumer" : "Summarize"}
          accentType="bar"
        >
          {props.summary ?? (
            locale === "fr"
              ? "Lecture opérationnelle disponible dans la section analyser."
              : "Operational details available in Analyze section."
          )}
        </CmmSection>

        {/* Agir */}
        <CmmSection 
          blockId="act" 
          title={locale === "fr" ? "Agir" : "Act"}
          accentType="bar"
        >
          {props.links ? (
            <CmmButtonGroup>
              {props.links.map((link, index) => (
                <CmmButton
                  key={`${link.href}-${link.label[locale]}`}
                  href={link.href}
                  tone={index === 0 ? "primary" : "secondary"}
                  variant="pill"
                >
                  {t(locale, link.label)}
                </CmmButton>
              ))}
            </CmmButtonGroup>
          ) : (
            <p className="text-sm text-slate-600">
              {locale === "fr"
                ? "Aucune action rapide disponible."
                : "No quick action available."}
            </p>
          )}
        </CmmSection>

        {/* Analyser */}
        <CmmSection 
          blockId="visualize" 
          title={locale === "fr" ? "Analyser" : "Analyze"}
          accentType="bar"
        >
          {props.children}
        </CmmSection>

        {/* Tracer */}
        <CmmSection 
          blockId="pilot" 
          title={locale === "fr" ? "Tracer" : "Trace"}
          accentType="bar"
        >
          <div className="space-y-1 text-xs text-slate-600">
            <p>
              {locale === "fr" ? "Horodatage: " : "Timestamp: "}
              {new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date())}
            </p>
            <p>
              {locale === "fr"
                ? "Sources: API actions et métriques dérivées."
                : "Sources: actions API and derived metrics."}
            </p>
            {props.traceNote && (
              <div className="cmm-accent-pilot rounded-xl px-3 py-2 text-xs">
                {props.traceNote}
              </div>
            )}
          </div>
        </CmmSection>

      </CmmSectionGroup>
    </CmmPageLayout>
  );
}
```

---

## 🎨 Avantages des améliorations

### 1. Simplicité d'usage

**Avant:**
```typescript
<CmmBlockCard blockId="impact" accentType="bar" barPosition="left">
  <h2 className="cmm-text-h2 mb-4">Impact environnemental</h2>
  <p>Contenu...</p>
</CmmBlockCard>
```

**Après:**
```typescript
<CmmSection blockId="impact" title="Impact environnemental">
  <p>Contenu...</p>
</CmmSection>
```

### 2. Classes utilitaires rapides

**Avant:**
```typescript
<div className="bg-emerald-50/80 border-emerald-200/80 text-emerald-800 p-4 rounded-lg">
  Contenu avec accent impact
</div>
```

**Après:**
```typescript
<div className="cmm-accent-impact p-4 rounded-lg">
  Contenu avec accent impact
</div>
```

### 3. Cohérence automatique

- ✅ Accent automatique selon le bloc
- ✅ Typographie cohérente
- ✅ Espacement standardisé
- ✅ Responsive par défaut

---

## 📋 Migration des composants existants

### Étapes recommandées

1. **Identifier les patterns récurrents**
   - Sections avec titre + contenu
   - Cards avec accents
   - Layouts de page

2. **Remplacer progressivement**
   - Commencer par les nouvelles pages
   - Migrer les templates existants
   - Mettre à jour les rubriques

3. **Tester la cohérence**
   - Vérifier les accents par bloc
   - Tester les modes d'affichage
   - Valider la responsive

---

## 🔗 Références

- **Composants de base:** `components/ui/cmm-card.tsx`, `cmm-button.tsx`, `cmm-pill.tsx`
- **Accents par bloc:** `components/ui/cmm-block-accent.tsx`, `lib/ui/block-accents.ts`
- **Nouveaux composants:** `components/ui/cmm-section.tsx`
- **Classes utilitaires:** `app/globals.css` (section BLOCK ACCENTS)
- **Audit complet:** `documentation/design/COMPREHENSIVE_AUDIT_REPORT.md`
