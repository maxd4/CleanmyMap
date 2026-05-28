# Badge Implementation Guide

## Overview

This guide explains how to implement a new badge family in the CleanMyMap gamification system. The system supports multiple badge types with custom progression scales, XP awards, real-time notifications, and audit trails.

## Architecture

### Components

1. **Backend (Route Handler)**: `apps/web/src/app/api/gamification/badges/list/route.ts`
   - Handles badge tier definitions, eligibility calculation, XP attribution
   - Emits Supabase NOTIFY events for real-time updates
   - Logs audit trail entries

2. **UI Component**: `apps/web/src/components/gamification/[BadgeName]Badge.tsx`
   - Renders current tier, progress bar, and tooltip
   - Manages emoji/icon mapping for each tier
   - Displays current progress and remaining items until next tier

3. **Data Wrapper**: `apps/web/src/components/gamification/[BadgeName]BadgeWrapper.tsx`
   - Fetches badge data from `/api/gamification/badges/list`
   - Handles loading, error, and empty states
   - Manages authentication checks (401 → access_denied)

4. **Styles**: `apps/web/src/components/gamification/[badge-name]-badge.module.css`
   - CSS variable system for tier colors (light, dark, progress, border variants)
   - Visual effects (atmosphere, precious, mineral, etc.)

## Step-by-Step Implementation

### 1. Design Badge Tiers

Define progression tiers with thresholds. Use a meaningful visual metaphor:

```typescript
const BADGE_TIERS = [
  { 
    threshold: 1, 
    id: 'badge-name-tier1', 
    label: 'Tier Name', 
    iconVariant: 'tier1',
    visualVariant: 'atmosphere', // or 'mineral', 'precious', 'plant'
    tooltip: 'Description of tier',
    xp: 1 // XP awarded on first unlock
  },
  { threshold: 3, id: 'badge-name-tier2', label: 'Tier 2', ... },
  // ... more tiers
];
```

**Best Practices**:
- Use meaningful, culturally relevant names
- Thresholds should increase exponentially (1→3→5→8→10→15→20→25→30→40)
- Each tier represents clear user achievement
- Avoid overlap with existing badge metaphors

### 2. Define Eligibility Logic

In the route handler, determine how to count eligible items:

```typescript
// Example: Count eligible forms (with deduplication by action+group)
let eligibleCount = 0;
try {
  const { data: forms } = await supabase
    .from('action_responses')
    .select('id, action_id, group_id, status, created_at')
    .eq('user_id', userId)
    .eq('form_type', 'action_spontanee') // or your criteria
    .eq('status', 'validated'); // only validated forms

  // Deduplicate by action + group (keep first validated)
  const seen = new Set<string>();
  const unique = forms?.filter(form => {
    const key = `${form.action_id}:${form.group_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }) ?? [];

  eligibleCount = unique.length;
} catch (e) {
  eligibleCount = 0;
}
```

**Key Considerations**:
- **Deduplication**: Use composite keys (e.g., `action_id:group_id`) to prevent gaming
- **Validation**: Only count items with specific status (e.g., 'validated', not 'pending')
- **Filtering**: Exclude drafts, tests, deletes, incomplete items
- **Cooldown**: If needed, filter by time window (e.g., `gte('validated_at', cutoff)`)

### 3. Implement Tier Unlocking & XP Award

Add loop to check each tier and award XP on first unlock:

```typescript
// Expose badges and award XP per newly-crossed tier (best-effort)
for (const tier of BADGE_TIERS as GemGrade[]) {
  const unlocked = eligibleCount >= tier.threshold;
  badges.push({
    id: tier.id,
    name: tier.label,
    description: `Badge description — ${tier.label}`,
    icon: tier.iconVariant,
    visualVariant: tier.visualVariant,
    tooltip: tier.tooltip,
    unlocked,
    minPoints: null,
    progress: { current: eligibleCount, target: tier.threshold },
  });

  if (unlocked) {
    (async () => {
      try {
        // Check if already awarded (unique index prevents duplicates)
        const existing = await supabase
          .from('progression_events')
          .select('id')
          .eq('user_id', userId)
          .eq('source_table', 'source_table_name') // e.g., 'action_responses'
          .eq('source_id', `tier-id:${tier.id}`)
          .maybeSingle();

        if (!existing || !existing.data) {
          const baseXp = tier.xp ?? 1;
          
          // Insert progression event
          await supabase.from('progression_events').insert({
            user_id: userId,
            event_type: 'tier_unlock', // descriptive event name
            source_table: 'source_table_name',
            source_id: `tier-id:${tier.id}`,
            status_phase: 'validated',
            weight: 1,
            xp_base: baseXp,
            xp_awarded: baseXp,
            occurred_on: new Date().toISOString().slice(0, 10),
            metadata: { tier: tier.id, threshold: tier.threshold },
          });

          // Log audit trail
          try {
            const { auditXpAttribution } = await import('@/lib/gamification/notifications');
            await auditXpAttribution(
              supabase,
              userId,
              null,
              `Badge tier ${tier.id} unlocked`,
              baseXp,
              'source_table_name',
              `tier-id:${tier.id}`,
              { tier: tier.id }
            );
          } catch {}

          // Emit real-time notification
          try {
            await supabase.rpc('notify_gamification', {
              channel: 'gamification',
              payload: JSON.stringify({
                type: 'tier_unlocked',
                userId,
                badgeId: tier.id,
                tierId: tier.id,
                threshold: tier.threshold,
              }),
            });
          } catch {}
        }
      } catch (e) {
        // Silently fail - best-effort async XP award
      }
    })();
  }
}
```

**Key Features**:
- Wraps XP award in `(async () => { })()` for non-blocking async execution
- Uses unique index on `(user_id, source_table, source_id)` to prevent duplicate inserts
- Logs to audit trail with context
- Emits real-time notification via Supabase RPC

### 4. Optional: Bonus XP Logic

For bonuses at specific milestones (e.g., "every 10 items"):

```typescript
// Bonus XP: +2 XP every 10 items, only once per decade
try {
  const bonusCount = Math.floor(eligibleCount / 10);
  for (let i = 1; i <= bonusCount; i++) {
    const bonusKey = `badge-name:bonus:${i*10}`;
    try {
      const existingBonus = await supabase
        .from('progression_events')
        .select('id')
        .eq('user_id', userId)
        .eq('source_table', 'source_bonus_table')
        .eq('source_id', bonusKey)
        .maybeSingle();

      if (!existingBonus || !existingBonus.data) {
        await supabase.from('progression_events').insert({
          user_id: userId,
          event_type: 'tier_bonus',
          source_table: 'source_bonus_table',
          source_id: bonusKey,
          status_phase: 'validated',
          weight: 1,
          xp_base: 2,
          xp_awarded: 2,
          occurred_on: new Date().toISOString().slice(0, 10),
          metadata: { bonus_for: i*10 },
        });

        // Audit and notify (same pattern as tier unlock)
        // ...
      }
    } catch (e) {}
  }
} catch (e) {}
```

Note: If a badge uses the common tier progression pattern [1,3,5,8,10,15,20] then apply this bonus rule: award +2 XP each time the user's eligible count crosses a multiple of 10 (10, 20, 30...), only once per decade (track via progression_events with source_table `<badge>_bonus` and unique source_id). This applies to Forms badge, Clean Zones badge, and any future badge using the same tier progression pattern.
### 5. Create UI Component

Create `apps/web/src/components/gamification/[BadgeName]Badge.tsx`:

```typescript
"use client";

import React from "react";

type Grade = {
  id: string;
  label: string;
  threshold: number;
  iconVariant?: string;
  tooltip?: string;
};

export default function YourBadge({
  grades,
  current,
  onGradeReached,
}: {
  grades: Grade[];
  current: number;
  onGradeReached?: (grade: Grade) => void;
}) {
  const activeGrade = grades.slice().reverse().find((g) => current >= g.threshold) || grades[0];

  React.useEffect(() => {
    if (onGradeReached) onGradeReached(activeGrade);
  }, [activeGrade.id]);

  // Find next tier
  const nextGrade = grades.find((g) => g.threshold > activeGrade.threshold);
  const remaining = nextGrade ? Math.max(0, nextGrade.threshold - current) : 0;

  // Progress bar logic
  const progressStart = activeGrade.threshold;
  const progressEnd = nextGrade?.threshold ?? activeGrade.threshold + 10;
  const progressCurrent = Math.min(current - progressStart, progressEnd - progressStart);
  const progressTarget = progressEnd - progressStart;
  const progressPercent = progressTarget > 0 ? Math.round((progressCurrent / progressTarget) * 100) : 100;

  // Emoji mapping for your badge
  const emojiMap: Record<string, string> = {
    "tier1": "🌱",
    "tier2": "🌿",
    // ... more tiers
  };

  const gradeType = activeGrade.id.replace("badge-name-", "");
  const icon = emojiMap[gradeType] || "🎖️";

  return (
    <div
      className="your-badge"
      style={{
        padding: 16,
        textAlign: "center",
        borderRadius: 12,
        background: `linear-gradient(135deg, var(--badge-${gradeType}-light, #f5f5f5), var(--badge-${gradeType}-dark, #e0e0e0))`,
        border: "2px solid var(--badge-${gradeType}-border, #ccc)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <span style={{ fontSize: 32 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {activeGrade.label} — Badge Name
          </div>
          <div style={{ fontSize: 12, color: "var(--gray-600, #666)" }}>
            Subtitle or tagline
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: 12 }}>
        <div style={{
          height: 8,
          background: "rgba(0,0,0,0.1)",
          borderRadius: 4,
          overflow: "hidden",
        }}>
          <div
            style={{
              height: "100%",
              background: `var(--badge-${gradeType}-progress, #7cb9e8)`,
              width: `${progressPercent}%`,
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: "var(--gray-700, #555)", marginTop: 6 }}>
          {current} / {activeGrade.threshold} items
          {remaining > 0 && (
            <span style={{ marginLeft: 8, color: "var(--gray-500, #999)" }}>
              (+{remaining} for {nextGrade?.label || "next"})
            </span>
          )}
        </div>
      </div>

      {activeGrade.tooltip && (
        <div style={{ fontSize: 11, color: "var(--gray-600, #666)", marginTop: 8, fontStyle: "italic" }}>
          {activeGrade.tooltip}
        </div>
      )}
    </div>
  );
}
```

### 6. Create Data Wrapper

Create `apps/web/src/components/gamification/[BadgeName]BadgeWrapper.tsx`:

```typescript
"use client";

import React from "react";
import YourBadge from "./YourBadge";
import type { GemGrade } from "@/lib/gamification/types";

export default function YourBadgeWrapper() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [badgeData, setBadgeData] = React.useState<{
    current: number;
    grades: GemGrade[];
  } | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/gamification/badges/list");
        if (!res.ok) {
          if (res.status === 401) {
            setError("access_denied");
          } else {
            setError("fetch_failed");
          }
          setBadgeData(null);
          return;
        }

        const data = await res.json();
        const badges = data.badges?.filter((b: any) => b.id?.startsWith("badge-name-")) || [];

        if (badges.length === 0) {
          setBadgeData(null);
          return;
        }

        const current = badges[0]?.progress?.current ?? 0;
        const grades: GemGrade[] = badges.map((badge: any) => ({
          id: badge.id,
          label: badge.name,
          threshold: badge.progress?.target ?? 1,
          tooltip: badge.tooltip,
        }));

        setBadgeData({ current, grades });
      } catch (err) {
        console.error("Failed to fetch badge data:", err);
        setError("fetch_failed");
        setBadgeData(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // States: loading, empty, error, access_denied, render
  if (isLoading) {
    return <div style={{ padding: 16, textAlign: "center", color: "var(--gray-600, #666)" }}>Loading...</div>;
  }

  if (error === "access_denied") {
    return <div style={{ padding: 16, textAlign: "center", color: "var(--gray-600, #666)" }}>Sign in to view badge</div>;
  }

  if (error) {
    return <div style={{ padding: 16, textAlign: "center", color: "var(--red-600, #c33)" }}>Error loading badge</div>;
  }

  if (!badgeData) {
    return <div style={{ padding: 16, textAlign: "center", color: "var(--gray-500, #999)" }}>No progress yet</div>;
  }

  return <YourBadge grades={badgeData.grades} current={badgeData.current} />;
}
```

### 7. Create CSS Variables

Create `apps/web/src/components/gamification/[badge-name]-badge.module.css`:

```css
:root {
  /* Tier 1 - Seed */
  --badge-tier1-light: #f0fef5;
  --badge-tier1-dark: #b8e8c8;
  --badge-tier1-progress: #20b858;
  --badge-tier1-border: #40c870;

  /* Tier 2 - Sprout */
  --badge-tier2-light: #e8fde8;
  --badge-tier2-dark: #a8e0a8;
  --badge-tier2-progress: #18a845;
  --badge-tier2-border: #30c060;

  /* ... more tiers ... */
}

/* Optional: Visual effects */
.your-badge[class*="tier"]::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 12px;
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 2px,
    rgba(255,255,255,0.15) 2px,
    rgba(255,255,255,0.15) 4px
  );
  pointer-events: none;
  z-index: 1;
}
```

### 8. Add Integration Tests

Create `apps/web/src/app/api/gamification/badges/[badge-name].integration.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

describe("Badge Name Integration", () => {
  const testUserId = `test-${Date.now()}`;

  it("should count eligible items with correct filtering", async () => {
    // Create eligible items
    // Create ineligible items
    // Call API
    // Verify count is correct
  });

  it("should award XP only once per tier", async () => {
    // Create items to trigger tier unlock
    // Call API twice
    // Verify progression_events count is 1
  });
});
```

## Real-Time Notifications

### Client-Side Integration

Use the `useGamificationRealtime` hook to listen for badge tier unlocks:

```typescript
import { useGamificationRealtime } from '@/hooks/useGamificationRealtime';

export default function MyComponent() {
  const { showToast } = useGamificationRealtime();

  // showToast will automatically display when badges unlock
  return <div>Content</div>;
}
```

### Triggering Notifications

In the backend, emit NOTIFY after XP award:

```typescript
await supabase.rpc('notify_gamification', {
  channel: 'gamification',
  payload: JSON.stringify({
    type: 'tier_unlocked',
    userId,
    badgeId: tier.id,
    tierId: tier.id,
    threshold: tier.threshold,
  }),
});
```

## Audit Trail

All XP awards are automatically logged with context:

```typescript
await auditXpAttribution(
  supabase,
  userId,
  null,
  `Badge tier ${tier.id} unlocked`,
  xpAmount,
  'source_table_name',
  `source_id`,
  { tier: tier.id, metadata: '...' }
);
```

Admins can view audit logs at `/admin/audit-xp` with filtering by date, user, and XP amount.

## Checklist

- [ ] Define badge tiers with meaningful names
- [ ] Implement eligibility counting logic with deduplication
- [ ] Add tier unlocking loop with XP award
- [ ] Create UI component with emoji mapping
- [ ] Create data wrapper with state management
- [ ] Create CSS variables for each tier
- [ ] Add integration tests
- [ ] Test real-time notifications
- [ ] Verify audit trail entries
- [ ] Document badge in design system

## Example Badges

### Explorer Badge (Zones Discovered)
- **Scale**: Mineral/exploration metaphor
- **Tiers**: Observateur → Maître des Cartes (13 tiers)
- **Count**: Unique validated trash_spotter_spots per user
- **Files**: ExplorerBadge.tsx, explorer-badge.module.css

### Participant Badge (Clean-up Actions)
- **Scale**: Boots, compass, map
- **Tiers**: 8 tiers (1→3→5→10→15→20→25→30)
- **Count**: Unique action responses with type='participation'
- **Files**: ParticipantBadge.tsx, participant-badge.module.css

### Forms Badge (Submitted Forms)
- **Scale**: Plant growth (Graine → Forêt primaire)
- **Tiers**: 8 tiers with deduplication by (action_id, group_id)
- **Count**: Eligible validated action responses (not drafts/tests)
- **Bonus**: +2 XP per 10 forms
- **Files**: FormsBadge.tsx, forms-badge.module.css

### Clean Zones Badge (Validated Clean Places)
- **Scale**: Atmospheric/ecological (Brise → Eden)
- **Tiers**: 10 tiers
- **Count**: Validated trash_spotter_spots with geolocalization + documentation
- **Cooldown**: 24-hour revalidation guard
- **Files**: CleanZonesBadge.tsx, clean-zones-badge.module.css

## Troubleshooting

### Badge not showing progress
- Check eligibility logic: are items being counted?
- Verify unique index on progression_events: `(user_id, source_table, source_id)`
- Check if user has permission (auth check in wrapper)

### XP not awarded
- Verify async XP award completed (check after 200ms)
- Check audit_xp_attribution table for entries
- Verify progression_events has unique index to prevent race conditions

### Real-time notification not firing
- Ensure Supabase RPC `notify_gamification` exists and is callable
- Check WebSocket relay server is running
- Verify `useGamificationRealtime` hook is used in component

## References

- Badge types: `/lib/gamification/types.ts`
- Notifications: `/lib/gamification/notifications.ts`
- WebSocket relay: `scripts/gamification-ws-server.js`
- Admin audit page: `/admin/audit-xp`
