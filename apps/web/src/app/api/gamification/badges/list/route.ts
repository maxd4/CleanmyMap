import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { loadValidatedCompleteActionCountForUser } from "@/lib/gamification/progression-data";
import {
  collectEligibleCleanZoneSources,
} from "@/lib/gamification/clean-zones";
import type { GemGrade } from "@/lib/gamification/types";

export const runtime = "nodejs";

// Badge definitions based on points achievements
const BADGES = [
  { id: "first_step", name: "Premier pas", description: "Gagner 10 points", minPoints: 10, icon: "👣" },
  { id: "contributor", name: "Contributeur", description: "Accumuler 100 points", minPoints: 100, icon: "🌱" },
  { id: "active", name: "Actif", description: "Accumuler 500 points", minPoints: 500, icon: "🔥" },
  { id: "champion", name: "Champion", description: "Accumuler 1000 points", minPoints: 1000, icon: "⭐" },
  { id: "legend", name: "Légende", description: "Accumuler 5000 points", minPoints: 5000, icon: "👑" },
  { id: "first_trace_utile", name: "Première trace utile", description: "Valider une première action avec des données complètes", minPoints: 0, special: "first_trace_utile", icon: "badge-check" },
  { id: "trace_fondatrice", name: "Trace fondatrice", description: "Première action validée avec dossier complet", minPoints: 0, special: "trace_fondatrice", icon: "sparkles" },
  { id: "cleaner", name: "Nettoyeur", description: "Valider 5 actions", minPoints: 0, special: "actions_validated" },
  { id: "discoverer", name: "Explorateur", description: "Visiter des lieux pour révéler la carte", minPoints: 0, special: "places_visited" },
];

// Evolving tiers for the Explorateur badge (places visited)
const EXPLORER_TIERS = [
  // More granular tiers including requested grades, tightened for Île-de-France (~40 zones).
  { min: 0, max: 0, id: "explorer-observateur", title: "Observateur", icon: "👀", texture: "/images/textures/parchment.png" },
  { min: 1, max: 2, id: "explorer-wood", title: "Promeneur Local", icon: "👣", texture: "/images/textures/parchment.png" },
  { min: 3, max: 4, id: "explorer-arpenteur", title: "Arpenteur", icon: "🥉", texture: "/images/textures/bronze-map.png" },
  { min: 5, max: 7, id: "explorer-eclaireur", title: "Éclaireur", icon: "🔦", texture: "/images/textures/silver-map.png" },
  { min: 8, max: 10, id: "explorer-patrouilleur", title: "Patrouilleur", icon: "🚶", texture: "/images/textures/silver-map.png" },
  { min: 11, max: 14, id: "explorer-repereur", title: "Repéreur", icon: "📍", texture: "/images/textures/gold-topo.png" },
  { min: 15, max: 19, id: "explorer-cartographe", title: "Cartographe", icon: "🗺️", texture: "/images/textures/gold-topo.png" },
  { min: 20, max: 24, id: "explorer-coordinateur", title: "Coordinateur", icon: "🧭", texture: "/images/textures/diamond-holo.png" },
  { min: 25, max: 29, id: "explorer-sentinelle", title: "Sentinelle", icon: "🛡️", texture: "/images/textures/diamond-holo.png" },
  { min: 30, max: 34, id: "explorer-regulateur", title: "Régulateur", icon: "⚖️", texture: "/images/textures/diamond-holo.png" },
  { min: 35, max: 44, id: "explorer-conservateur", title: "Conservateur", icon: "🌳", texture: "/images/textures/cosmic-holo.png" },
  { min: 45, max: 49, id: "explorer-gardien", title: "Gardien", icon: "🦺", texture: "/images/textures/cosmic-holo.png" },
  { min: 50, max: Number.MAX_SAFE_INTEGER, id: "explorer-cosmic", title: "Maître des Cartes", icon: "🔭", texture: "/images/textures/cosmic-holo.png" },
];

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return unauthorizedJsonResponse();
  }

  try {
    const supabase = getSupabaseServerClient();

    // Fetch user points
    const { data: pointsData } = await supabase
      .from("user_points")
      .select("total_points")
      .eq("user_id", userId)
      .maybeSingle();

    const totalPoints = pointsData?.total_points ?? 0;

    // Fetch action counts for special badges
    const { count: actionsCount } = await supabase
      .from("actions")
      .select("*", { count: "exact", head: true })
      .eq("created_by_clerk_id", userId)
      .eq("status", "approved");

    const completeActionsCount = await loadValidatedCompleteActionCountForUser(
      supabase,
      userId,
    ).catch(() => 0);

    const { count: placesCount } = await supabase
      .from("user_visited_places")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    const badges = [] as any[];

    // Build explorer tiers first and compute next-tier info
    const currentPlaces = Number(placesCount ?? 0);
    let highestTierReached = EXPLORER_TIERS[0];
    for (const tier of EXPLORER_TIERS) {
      if (currentPlaces >= tier.min) highestTierReached = tier;
    }
    const nextTier = EXPLORER_TIERS.find((t) => t.min > highestTierReached.min) || null;
    const zonesToNext = nextTier ? Math.max(0, nextTier.min - currentPlaces) : 0;

    // push explorer tiers
    for (const tier of EXPLORER_TIERS) {
      const current = currentPlaces;
      const unlocked = current >= tier.min;
      const tierCurrent = Math.max(0, Math.min(current, tier.max) - tier.min + (current >= tier.min ? 1 : 0));
      const tierTarget = tier.max === Number.MAX_SAFE_INTEGER ? Math.max(50, tier.min) : tier.max - tier.min + 1;
      badges.push({
        id: tier.id,
        name: tier.title,
        description: `Visiter des lieux pour révéler la carte — niveau ${tier.title}`,
        icon: tier.icon,
        unlocked,
        minPoints: null,
        progress: { current: tierCurrent, target: tierTarget },
      });
    }

    // New badge family: "Formulaires créés" (based on eligible validated action-forms)
    // Business rules applied in query below (best-effort):
    // - Eligible form: attached to an action validated by an admin
    // - One eligible form per (action, group)
    // - Spontaneous actions are eligible; "zone propre" actions are NOT
    // - Exclude drafts, deleted, tests, incomplete or non-validated forms
    // - If multiple forms for same action+group, only first validated counts
    const FORM_SUBMISSION_TIERS = [
      { threshold: 1, id: 'forms-seed', label: 'Graine', iconVariant: 'plant-seed', visualVariant: 'stone', tooltip: '1 formulaire éligible', xp: 1 },
      { threshold: 3, id: 'forms-sprout', label: 'Pousse', iconVariant: 'plant-sprout', visualVariant: 'stone', tooltip: '3 formulaires éligibles', xp: 1 },
      { threshold: 5, id: 'forms-seedling', label: 'Jeune plante', iconVariant: 'plant-seedling', visualVariant: 'stone', tooltip: '5 formulaires éligibles', xp: 1 },
      { threshold: 8, id: 'forms-sapling', label: 'Arbuste', iconVariant: 'plant-sapling', visualVariant: 'stone', tooltip: '8 formulaires éligibles', xp: 1 },
      { threshold: 10, id: 'forms-young-tree', label: 'Jeune arbre', iconVariant: 'plant-young-tree', visualVariant: 'stone', tooltip: '10 formulaires éligibles', xp: 1 },
      { threshold: 15, id: 'forms-mature-tree', label: 'Arbre mature', iconVariant: 'plant-mature-tree', visualVariant: 'precious', tooltip: '15 formulaires éligibles', xp: 1 },
      { threshold: 20, id: 'forms-grove', label: 'Bosquet', iconVariant: 'plant-grove', visualVariant: 'precious', tooltip: '20 formulaires éligibles', xp: 1 },
      { threshold: 25, id: 'forms-primary-forest', label: 'Forêt primaire', iconVariant: 'plant-primary-forest', visualVariant: 'precious', tooltip: '25 formulaires éligibles', xp: 1 },
    ];

    // Compute eligible forms count (best-effort). The SQL intent:
    // - select distinct on (action_id, group_id) the earliest validated form
    // - filter action.status = 'approved' (validated by admin)
    // - exclude action.type = 'zone_propre'
    // - include action.type = 'spontanee' and others
    // - exclude forms with status in ('draft','deleted','test','incomplete')
    let eligibleFormsCount = 0;
    try {
      // Best-effort: approximate eligibility using supabase query joining forms -> actions
      const { data: formsData, error: formsError } = await supabase
        .from('forms')
        .select('action_id, group_id, status, created_at, is_test')
        .neq('status', 'draft')
        .neq('status', 'deleted')
        .neq('status', 'incomplete')
        .eq('validated_by_admin', true)
        .is('is_duplicate', false)
        .is('is_deleted', false)
        .is('is_test', false)
        .order('created_at', { ascending: true });

      if (!formsError && Array.isArray(formsData)) {
        // Filter client-side for action properties (we'll fetch actions map)
        const actionIds = Array.from(new Set(formsData.map((f: any) => f.action_id).filter(Boolean)));
        const { data: actionsMap } = await supabase
          .from('actions')
          .select('id, type, status')
          .in('id', actionIds)
          .in('status', ['approved']) ;

        const actionById: Record<string, any> = {};
        (actionsMap || []).forEach((a: any) => (actionById[a.id] = a));

        // Build set of counted (action_id, group_id) to ensure one per group per action
        const counted = new Set();
        for (const f of formsData) {
          const action = actionById[f.action_id];
          if (!action) continue; // action not approved or missing
          if (action.type === 'zone_propre') continue; // excluded

          const key = `${f.action_id}::${f.group_id || 'null'}`;
          if (counted.has(key)) continue;
          // ensure form is valid: validated_by_admin true already filtered
          if (f.status === 'draft' || f.status === 'deleted' || f.is_test) continue;

          counted.add(key);
        }
        eligibleFormsCount = counted.size;
      }
    } catch (e) {
      eligibleFormsCount = 0;
    }

    // Expose forms badges and award XP per newly-crossed tier (best-effort)
    for (const tier of FORM_SUBMISSION_TIERS as GemGrade[]) {
      const unlocked = eligibleFormsCount >= tier.threshold;
      badges.push({
        id: tier.id,
        name: tier.label,
        description: `Formulaires validés éligibles — ${tier.label}`,
        icon: tier.iconVariant,
        visualVariant: tier.visualVariant,
        tooltip: tier.tooltip,
        unlocked,
        minPoints: null,
        progress: { current: eligibleFormsCount, target: tier.threshold },
      });

      if (unlocked) {
        (async () => {
          try {
            const existing = await supabase
              .from('progression_events')
              .select('id, xp_awarded')
              .eq('user_id', userId)
              .eq('source_table', 'forms')
              .eq('source_id', `forms:${tier.id}`)
              .maybeSingle();
            if (!existing || !existing.data) {
              // base xp for tier
              const baseXp = tier.xp ?? 1;
              await supabase.from('progression_events').insert({
                user_id: userId,
                event_type: 'form_tier_unlock',
                source_table: 'forms',
                source_id: `forms:${tier.id}`,
                status_phase: 'pending',
                weight: 1,
                xp_base: baseXp,
                xp_awarded: baseXp,
                occurred_on: new Date().toISOString().slice(0, 10),
                metadata: { tier: tier.id, threshold: tier.threshold },
              });

              try {
                const { auditXpAttribution } = await import('@/lib/gamification/notifications');
                await auditXpAttribution(supabase, userId, null, `Form tier ${tier.id} unlocked`, baseXp, 'forms', `forms:${tier.id}`, { tier: tier.id });
              } catch {}

              try {
                await supabase.rpc('notify_gamification', { channel: 'gamification', payload: JSON.stringify({ type: 'form_tier_unlocked', userId, tierId: tier.id, threshold: tier.threshold }) });
              } catch {}
            }
          } catch (e) {}
        })();
      }
    }

    // Bonus XP: +2 XP every 10 eligible forms, only once per decade
    try {
      const bonusCount = Math.floor(eligibleFormsCount / 10);
      for (let i = 1; i <= bonusCount; i++) {
        const bonusKey = `forms:bonus:${i*10}`;
        try {
          const existingBonus = await supabase
            .from('progression_events')
            .select('id')
            .eq('user_id', userId)
            .eq('source_table', 'forms_bonus')
            .eq('source_id', bonusKey)
            .maybeSingle();
          if (!existingBonus || !existingBonus.data) {
            await supabase.from('progression_events').insert({
              user_id: userId,
              event_type: 'form_bonus',
              source_table: 'forms_bonus',
              source_id: bonusKey,
              status_phase: 'validated',
              weight: 1,
              xp_base: 2,
              xp_awarded: 2,
              occurred_on: new Date().toISOString().slice(0, 10),
              metadata: { bonus_for: i*10 },
            });

            try {
              const { auditXpAttribution } = await import('@/lib/gamification/notifications');
              await auditXpAttribution(supabase, userId, null, `Forms decade bonus ${i*10}`, 2, 'forms_bonus', bonusKey, { bonus_for: i*10 });
            } catch {}

            try {
              await supabase.rpc('notify_gamification', { channel: 'gamification', payload: JSON.stringify({ type: 'form_bonus_unlocked', userId, bonus: i*10 }) });
            } catch {}
          }
        } catch (e) {}
      }
    } catch (e) {}

    // Clean zones badge family - infinite progression based on validated & cleaned clean places
    // Atmospheric/ecological scale: Brise → Eden (10 tiers)
    // XP: +1 XP per zone progression, +2 XP bonus every 10 zones (once per decade)
    const CLEAN_ZONES_TIERS = [
      { threshold: 1, id: 'clean-zones-breeze', label: 'Brise', iconVariant: 'breeze', visualVariant: 'atmosphere', tooltip: '1 zone propre validée ou nettoyée', xp: 1 },
      { threshold: 3, id: 'clean-zones-horizon', label: 'Horizon', iconVariant: 'horizon', visualVariant: 'atmosphere', tooltip: '3 zones propres validées ou nettoyées', xp: 1 },
      { threshold: 5, id: 'clean-zones-azure', label: 'Azur', iconVariant: 'azure', visualVariant: 'atmosphere', tooltip: '5 zones propres validées ou nettoyées', xp: 1 },
      { threshold: 8, id: 'clean-zones-dawn', label: 'Aurore', iconVariant: 'dawn', visualVariant: 'atmosphere', tooltip: '8 zones propres validées ou nettoyées', xp: 1 },
      { threshold: 10, id: 'clean-zones-zenith', label: 'Zénith', iconVariant: 'zenith', visualVariant: 'atmosphere', tooltip: '10 zones propres validées ou nettoyées', xp: 1 },
      { threshold: 15, id: 'clean-zones-stratosphere', label: 'Stratosphère', iconVariant: 'stratosphere', visualVariant: 'precious', tooltip: '15 zones propres validées ou nettoyées', xp: 1 },
      { threshold: 20, id: 'clean-zones-ether', label: 'Éther', iconVariant: 'ether', visualVariant: 'precious', tooltip: '20 zones propres validées ou nettoyées', xp: 1 },
      { threshold: 25, id: 'clean-zones-helios', label: 'Hélios', iconVariant: 'helios', visualVariant: 'precious', tooltip: '25 zones propres validées ou nettoyées', xp: 1 },
      { threshold: 30, id: 'clean-zones-harmony', label: 'Harmonie', iconVariant: 'harmony', visualVariant: 'precious', tooltip: '30 zones propres validées ou nettoyées', xp: 1 },
      { threshold: 40, id: 'clean-zones-eden', label: 'Eden', iconVariant: 'eden', visualVariant: 'precious', tooltip: '40 zones propres validées ou nettoyées', xp: 1 },
    ];

    // Count eligible clean zones (best-effort)
    // Criteria: geolocalized, documented, validated OR cleaned by moderation
    // Enforce 24h cooldown: only count zones validated/cleaned at least 24h ago to avoid rapid revalidation gaming
    let cleanZonesCount = 0;
    try {
      const now = new Date();
      const cooldownCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(); // 24h ago

      // 1) Count clean_place entries (forms 'zone propre' and trash_spotter_spots)
      const { data: cleanPlaces } = await supabase
        .from('trash_spotter_spots')
        .select('id, validated_at, cleaned_at', { count: 'exact', head: false })
        .eq('user_id', userId)
        .eq('spot_type', 'clean_place')
        .in('status', ['validated', 'cleaned'])
        .neq('latitude', null)
        .neq('longitude', null)
        .neq('notes', null)
        .or(`validated_at.lte.${cooldownCutoff},cleaned_at.lte.${cooldownCutoff}`);

      // 2) Count polluted/cleaned spots from general spots table (declared polluted or cleaned)
      // Table name may be 'spots' or 'trash_spotter_spots' depending on schema; check both
      let otherSpots: any[] = [];
      try {
        const { data: sp } = await supabase
          .from('spots')
          .select('id, status, latitude, longitude, notes, cleaned_at, validated_at')
          .eq('created_by_clerk_id', userId)
          .in('status', ['validated', 'cleaned'])
          .neq('latitude', null)
          .neq('longitude', null)
          .neq('notes', null)
          .or(`validated_at.lte.${cooldownCutoff},cleaned_at.lte.${cooldownCutoff}`);
        if (sp && Array.isArray(sp)) otherSpots = sp;
      } catch (e) {
        otherSpots = [];
      }

      const cleanZoneSources = collectEligibleCleanZoneSources({
        cleanPlaces: (cleanPlaces || []) as any[],
        otherSpots: otherSpots as any[],
        now,
      });

      cleanZonesCount = cleanZoneSources.length;

      // Award per-task XP (+1 XP) for each newly-counted spot if not already awarded
      for (const source of cleanZoneSources) {
        try {
          const existing = await supabase
            .from('progression_events')
            .select('id')
            .eq('user_id', userId)
            .eq('source_table', source.sourceTable)
            .eq('source_id', source.sourceId)
            .maybeSingle();

          if (!existing || !existing.data) {
            await supabase.from('progression_events').insert({
              user_id: userId,
              event_type: 'clean_zone_task',
              source_table: source.sourceTable,
              source_id: source.sourceId,
              status_phase: 'validated',
              weight: 1,
              xp_base: 1,
              xp_awarded: 1,
              occurred_on: new Date().toISOString().slice(0, 10),
              metadata: {
                origin: source.key.startsWith("clean:") ? "clean" : "spot",
                spot_id: source.sourceId.replace(/^[^-]+-id:/, ""),
              },
            });

            try {
              const { auditXpAttribution } = await import('@/lib/gamification/notifications');
              await auditXpAttribution(
                supabase,
                userId,
                null,
                `Clean zone task ${source.sourceId} awarded`,
                1,
                source.sourceTable,
                source.sourceId,
                {
                  origin: source.key.startsWith("clean:") ? "clean" : "spot",
                  spot_id: source.sourceId.replace(/^[^-]+-id:/, ""),
                },
              );
            } catch {}

            try {
              await supabase.rpc('notify_gamification', { channel: 'gamification', payload: JSON.stringify({ type: 'clean_zone_task_awarded', userId, sourceTable: source.sourceTable, sourceId: source.sourceId }) });
            } catch {}
          }
        } catch (e) {}
      }

    } catch (e) {
      cleanZonesCount = 0;
    }

    // Expose clean zones badges and award XP per newly-crossed tier (best-effort)
    for (const tier of CLEAN_ZONES_TIERS as GemGrade[]) {
      const unlocked = cleanZonesCount >= tier.threshold;
      badges.push({
        id: tier.id,
        name: tier.label,
        description: `Zones propres et déclarées — ${tier.label}`,
        icon: tier.iconVariant,
        visualVariant: tier.visualVariant,
        tooltip: tier.tooltip,
        unlocked,
        minPoints: null,
        progress: { current: cleanZonesCount, target: tier.threshold },
      });

      if (unlocked) {
        (async () => {
          try {
            const existing = await supabase
              .from('progression_events')
              .select('id')
              .eq('user_id', userId)
              .eq('source_table', 'trash_spotter_spots')
              .eq('source_id', `clean-zone:${tier.id}`)
              .maybeSingle();
            if (!existing || !existing.data) {
              const baseXp = tier.xp ?? 1;
              await supabase.from('progression_events').insert({
                user_id: userId,
                event_type: 'clean_zone_tier_unlock',
                source_table: 'trash_spotter_spots',
                source_id: `clean-zone:${tier.id}`,
                status_phase: 'pending',
                weight: 1,
                xp_base: baseXp,
                xp_awarded: baseXp,
                occurred_on: new Date().toISOString().slice(0, 10),
                metadata: { tier: tier.id, threshold: tier.threshold },
              });

              try {
                const { auditXpAttribution } = await import('@/lib/gamification/notifications');
                await auditXpAttribution(supabase, userId, null, `Clean zones tier ${tier.id} unlocked`, baseXp, 'trash_spotter_spots', `clean-zone:${tier.id}`, { tier: tier.id });
              } catch {}

              try {
                await supabase.rpc('notify_gamification', { channel: 'gamification', payload: JSON.stringify({ type: 'clean_zone_tier_unlocked', userId, tierId: tier.id, threshold: tier.threshold }) });
              } catch {}
            }
          } catch (e) {}
        })();
      }
    }

    // Participation badges (clean-up participations) - progressive tiers inspired by exploration/cartography
    const PARTICIPANT_TIERS = [
      // thresholds: 1,3,5,10,15,20,25,30
      { threshold: 1, id: 'participant-1', label: 'Observateur', iconVariant: 'marker', visualVariant: 'parchment', tooltip: 'Participation initiale à une action de dépollution', xp: 1 },
      { threshold: 3, id: 'participant-3', label: 'Éclaireur', iconVariant: 'compass', visualVariant: 'bronze', tooltip: 'Participation assidue sur plusieurs lieux', xp: 1 },
      { threshold: 5, id: 'participant-5', label: 'Patrouilleur', iconVariant: 'boots', visualVariant: 'silver', tooltip: 'Participation récurrente à des opérations locales', xp: 1 },
      { threshold: 10, id: 'participant-10', label: 'Cartographe', iconVariant: 'map', visualVariant: 'gold', tooltip: 'Contribue à la couverture cartographique par l’action', xp: 1 },
      { threshold: 15, id: 'participant-15', label: 'Coordinateur', iconVariant: 'compass-rose', visualVariant: 'platinum', tooltip: 'Joue un rôle central dans les actions', xp: 1 },
      { threshold: 20, id: 'participant-20', label: 'Sentinelle', iconVariant: 'shield', visualVariant: 'diamond', tooltip: 'Garantie la pérennité des nettoyages', xp: 1 },
      { threshold: 25, id: 'participant-25', label: 'Conservateur', iconVariant: 'tree', visualVariant: 'cosmic', tooltip: 'Impact territorial notable', xp: 1 },
      { threshold: 30, id: 'participant-30', label: 'Gardien', iconVariant: 'guardian', visualVariant: 'cosmic', tooltip: 'Ambassadeur de terrain', xp: 1 },
    ];

    // compute participation count (best-effort)
    let participationCount = 0;
    try {
      const { count } = await supabase
        .from('action_participants')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      participationCount = Number(count ?? 0);
    } catch {
      participationCount = 0;
    }

    // expose participant tiers as separate badges and award 1 XP per newly-crossed tier (best-effort)
    for (const tier of PARTICIPANT_TIERS) {
      const unlocked = participationCount >= tier.threshold;
      badges.push({
        id: tier.id,
        name: tier.label,
        description: `Participation: ${tier.threshold} actions`,
        icon: tier.iconVariant,
        visualVariant: tier.visualVariant,
        tooltip: tier.tooltip,
        unlocked,
        minPoints: null,
        progress: { current: participationCount, target: tier.threshold },
      });

      // If unlocked, try to award 1 XP for this tier if not already awarded
      if (unlocked) {
        (async () => {
          try {
            const existing = await supabase
              .from('progression_events')
              .select('id')
              .eq('user_id', userId)
              .eq('source_table', 'action_participants')
              .eq('source_id', `participant:${tier.id}`)
              .maybeSingle();
            if (!existing || !existing.data) {
              await supabase.from('progression_events').insert({
                user_id: userId,
                event_type: 'participant_tier_unlock',
                source_table: 'action_participants',
                source_id: `participant:${tier.id}`,
                status_phase: 'pending',
                weight: 1,
                xp_base: tier.xp ?? 1,
                xp_awarded: tier.xp ?? 1,
                occurred_on: new Date().toISOString().slice(0, 10),
                metadata: { tier: tier.id, threshold: tier.threshold },
              });

              // record xp audit
              try {
                const { auditXpAttribution } = await import('@/lib/gamification/notifications');
                await auditXpAttribution(supabase, userId, null, `Participant tier ${tier.id} unlocked`, tier.xp ?? 1, 'action_participants', `participant:${tier.id}`, { tier: tier.id });
              } catch {}

              // emit realtime notify for participant tier unlock
              try {
                await supabase.rpc('notify_gamification', { channel: 'gamification', payload: JSON.stringify({ type: 'participant_tier_unlocked', userId, tierId: tier.id, threshold: tier.threshold }) });
              } catch {}
            }
          } catch (e) {
            // ignore — best-effort
          }
        })();
      }
    }

    // now add other badges (points-based and actions_validated)
    for (const badge of BADGES.filter((b) => b.special !== 'places_visited')) {
      let isUnlocked = false;
      if (badge.special === 'actions_validated') {
        isUnlocked = (actionsCount ?? 0) >= 5;
      } else if (
        badge.special === "first_trace_utile" ||
        badge.special === "trace_fondatrice"
      ) {
        isUnlocked = completeActionsCount >= 1;
      } else {
        isUnlocked = totalPoints >= (badge.minPoints ?? 0);
      }
      badges.push({
        id: badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        unlocked: isUnlocked,
        minPoints: badge.minPoints || null,
        progress:
          badge.special === "actions_validated"
            ? { current: actionsCount ?? 0, target: 5 }
            : badge.special === "first_trace_utile" ||
              badge.special === "trace_fondatrice"
              ? { current: completeActionsCount, target: 1 }
              : { current: totalPoints, target: badge.minPoints },
      });

      if (badge.special === "first_trace_utile" && isUnlocked) {
        (async () => {
          try {
            const existing = await supabase
              .from("progression_events")
              .select("id")
              .eq("user_id", userId)
              .eq("source_table", "actions")
              .eq("source_id", "first_trace_utile")
              .maybeSingle();
            if (!existing || !existing.data) {
              await supabase.from("progression_events").insert({
                user_id: userId,
                event_type: "action_declare_validation",
                source_table: "actions",
                source_id: "first_trace_utile",
                status_phase: "validated",
                weight: 1,
                xp_base: 1,
                xp_awarded: 1,
                occurred_on: new Date().toISOString().slice(0, 10),
                metadata: {
                  badge: "first_trace_utile",
                  completeActionsCount,
                },
              });

              try {
                const { auditXpAttribution } = await import('@/lib/gamification/notifications');
                await auditXpAttribution(
                  supabase,
                  userId,
                  null,
                  "Première trace utile débloquée",
                  1,
                  "actions",
                  "first_trace_utile",
                  { badge: "first_trace_utile", completeActionsCount },
                );
              } catch {}

              try {
                await supabase.rpc('notify_gamification', { channel: 'gamification', payload: JSON.stringify({ type: 'first_trace_utile_unlocked', userId, badgeId: 'first_trace_utile' }) });
              } catch {}
            }
          } catch (error) {
            console.error("[Gamification] Failed to award first_trace_utile badge", error);
          }
        })();
      }
    }

    const unlockedCount = badges.filter((b) => b.unlocked).length;

    // If user just reached a higher tier since last check, notify. Best-effort.
    try {
      // Notify when there is a nextTier and user already passed its min — this indicates a transition
      if (nextTier && currentPlaces >= nextTier.min) {
        const { notifyTierReached } = await import('@/lib/gamification/notifications');
        // Best-effort: do not block the response
        try {
          notifyTierReached(userId, nextTier.id, nextTier.title);
        } catch {}

        // record xp audit for explorer tier
        try {
          const { auditXpAttribution } = await import('@/lib/gamification/notifications');
          await auditXpAttribution(supabase, userId, null, `Explorer tier ${nextTier.id} unlocked`, 1, 'user_visited_places', `tier:${nextTier.id}`, { tier: nextTier.id });
        } catch {}

        // Also emit a Postgres NOTIFY for realtime listeners (best-effort)
        try {
          await supabase.rpc('notify_gamification', { channel: 'gamification', payload: JSON.stringify({ type: 'tier_unlocked', userId, tierId: nextTier.id, title: nextTier.title }) });
        } catch {}
      }
    } catch {}

    return NextResponse.json({
      status: "ok",
      totalPoints,
      badges,
      unlockedCount,
      totalBadges: badges.length,
      explorer: {
        currentPlaces,
        nextTier: nextTier ? { id: nextTier.id, title: nextTier.title, min: nextTier.min } : null,
        zonesToNext,
      },
    });
  } catch (error) {
    return handleApiError(error, "GET /api/gamification/badges/list");
  }
}
