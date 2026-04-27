# Design System Documentation Index

Quick reference to all CleanMyMap design system documentation.

---

## 📐 Core Design Documents

| Document | Purpose | Read This If... |
|----------|---------|-----------------|
| [charte-ui-pro-moderne-futuriste.md](./charte-ui-pro-moderne-futuriste.md) | Main visual charter | You need the complete design reference |
| [display-modes-chartes.md](./display-modes-chartes.md) | 3 display modes specs | Working with display modes (exhaustif/minimaliste/sobre) |
| [display-modes-implementation.md](./display-modes-implementation.md) | Technical implementation | Implementing mode-specific features |

## 📝 Typography

| Document | Purpose | Read This If... |
|----------|---------|-----------------|
| [TYPOGRAPHY_SYSTEM.md](./TYPOGRAPHY_SYSTEM.md) | Complete typography system | Using fonts, setting up text |
| [TYPOGRAPHY_MIGRATION_PLAN.md](./TYPOGRAPHY_MIGRATION_PLAN.md) | Migration checklist | Migrating components to new typography |
| [TYPOGRAPHY_AUDIT.md](./TYPOGRAPHY_AUDIT.md) | Original audit | Understanding typography decisions |

## 🎯 UI Components & Patterns

| Document | Purpose | Read This If... |
|----------|---------|-----------------|
| [cursor-system.md](./cursor-system.md) | Cursor system | Implementing interactive elements |
| [cursor-system-summary.md](./cursor-system-summary.md) | Cursor quick ref | Quick cursor reference |
| [theme-visibility-rules.md](./theme-visibility-rules.md) | Accessibility rules | Ensuring accessible design |

## 📋 Implementation Logs (Historical)

| Document | Phase | Status |
|----------|-------|--------|
| [P0-changes-log.md](./P0-changes-log.md) | Structure | Completed |
| [P1-changes-log.md](./P1-changes-log.md) | Homogenization | Completed |
| [P2-block-accents.md](./P2-block-accents.md) | Block Accents | Completed |
| [P3-polish.md](./P3-polish.md) | Polish | Completed |

## 📊 Audit & Execution Status

| Document | Purpose | Status |
|----------|---------|--------|
| [AUDIT_SUMMARY.md](./AUDIT_SUMMARY.md) | Overview of audit execution | ✅ Current |
| [DESIGN_SYSTEM_EXECUTION_STATUS.md](./DESIGN_SYSTEM_EXECUTION_STATUS.md) | Detailed execution report | ✅ Current |
| [DESIGN_SYSTEM_NEXT_STEPS.md](./DESIGN_SYSTEM_NEXT_STEPS.md) | P1-P3 tracking & checklist | ✅ Current |
| [COMPREHENSIVE_AUDIT_REPORT.md](./COMPREHENSIVE_AUDIT_REPORT.md) | Complete audit of canonical classes | ✅ Current |
| [FINAL_IMPLEMENTATION_REPORT.md](./FINAL_IMPLEMENTATION_REPORT.md) | Final implementation report | ✅ Current |
| [USAGE_GUIDE.md](./USAGE_GUIDE.md) | Usage guide for enhanced components | ✅ Current |
| [FORM_AUDIT_REPORT.md](./FORM_AUDIT_REPORT.md) | Complete form audit and improvement plan | ✅ Current |
| [FORM_DEPENDENCIES_ANALYSIS.md](./FORM_DEPENDENCIES_ANALYSIS.md) | Technical dependencies analysis | ✅ Current |
| [FORM_EXECUTIVE_SUMMARY.md](./FORM_EXECUTIVE_SUMMARY.md) | Executive summary of form audit | ✅ Current |
| [../archive/AUDIT_UI_UX_DESIGN_SYSTEM.md](../archive/AUDIT_UI_UX_DESIGN_SYSTEM.md) | Original audit (archived) | 📦 Archived |

---

## 🚀 Quick Start for AI Agents

1. **Before any UI work**: Read [charte-ui-pro-moderne-futuriste.md](./charte-ui-pro-moderne-futuriste.md)
2. **Using components**: Import from `@/components/ui/cmm-card`, `@/components/ui/cmm-button`
3. **Typography**: Use `cmm-text-h1` through `cmm-text-caption` classes
4. **Colors**: Use semantic tokens `text-primary`, `bg-canvas`, etc.
5. **Display modes**: Access via `useSitePreferences()` hook

## 🛠️ Canonical Components

```typescript
// Cards
import { CmmCard } from "@/components/ui/cmm-card";

// Buttons
import { CmmButton } from "@/components/ui/cmm-button";

// Display mode hook
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
const { displayMode } = useSitePreferences(); // "exhaustif" | "minimaliste" | "sobre"
```

## 📁 Implementation Files

| File | Description |
|------|-------------|
| `apps/web/src/app/globals.css` | CSS tokens, modes, utilities |
| `apps/web/src/components/ui/cmm-card.tsx` | Card component |
| `apps/web/src/components/ui/cmm-button.tsx` | Button component |
| `apps/web/src/lib/ui/preferences.ts` | Display mode types |

---

*Last updated: 2026-04-26*
