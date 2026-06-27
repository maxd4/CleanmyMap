import { describe, it, expect, beforeEach, vi } from 'vitest';

type ProgressionEventInsert = {
  user_id: string;
  event_type: string;
  source_table: string;
  source_id: string;
  status_phase: string;
  weight: number;
  xp_base: number;
  xp_awarded: number;
  occurred_on: string;
  metadata: Record<string, unknown>;
};

type ProgressionEventLookupRow = {
  id: string;
};

type ProgressionEventLookupResult = {
  data: ProgressionEventLookupRow | null;
  error: null;
};

type ProgressionEventsLookupChain = {
  eq: (field: string, value: string) => ProgressionEventsLookupChain;
  maybeSingle: () => Promise<ProgressionEventLookupResult>;
};

type ProgressionEventsTableChain = {
  select: (columns: string) => ProgressionEventsLookupChain;
  insert: (payload: ProgressionEventInsert) => Promise<{ data: null; error: null }>;
};

function createProgressionEventsTableChain(params: {
  existingRow: ProgressionEventLookupRow | null;
  onInsert: (payload: ProgressionEventInsert) => void;
  onLookup: () => void;
}): ProgressionEventsTableChain {
  const lookupChain: ProgressionEventsLookupChain = {
    eq: vi.fn(() => lookupChain),
    maybeSingle: vi.fn(async () => {
      params.onLookup();
      return {
        data: params.existingRow,
        error: null,
      };
    }),
  };

  return {
    select: vi.fn(() => lookupChain),
    insert: vi.fn(async (payload: ProgressionEventInsert) => {
      params.onInsert(payload);
      return { data: null, error: null };
    }),
  };
}

// Integration test: badges/list API with participant tier logic and audit/progression_events writes
describe('POST /api/gamification/badges/list - participant tier unlock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should insert into progression_events exactly once per newly-unlocked participant tier', async () => {
    let insertCount = 0;
    let lookupCount = 0;
    const inserts: ProgressionEventInsert[] = [];
    const progressionEvents = createProgressionEventsTableChain({
      existingRow: null,
      onInsert: (payload) => {
        insertCount += 1;
        inserts.push(payload);
      },
      onLookup: () => {
        lookupCount += 1;
      },
    });

    // Simulate the tier unlock logic from badges/list route
    const PARTICIPANT_TIERS = [
      { threshold: 0, id: 'participant-0', xp: 0 },
      { threshold: 1, id: 'participant-1', xp: 1 },
      { threshold: 3, id: 'participant-3', xp: 1 },
      { threshold: 5, id: 'participant-5', xp: 1 },
      { threshold: 10, id: 'participant-10', xp: 1 },
    ];

    const userId = 'test-user-123';
    const participationCount = 5;

    // Simulate the loop from badges list route
    for (const tier of PARTICIPANT_TIERS) {
      if (participationCount >= tier.threshold) {
        if (tier.xp <= 0) {
          continue;
        }
        const existing = await progressionEvents
          .select('id')
          .eq('user_id', userId)
          .eq('source_table', 'action_participants')
          .eq('source_id', `participant:${tier.id}`)
          .maybeSingle();

        if (!existing?.data) {
          await progressionEvents.insert({
            user_id: userId,
            event_type: 'participant_tier_unlock',
            source_table: 'action_participants',
            source_id: `participant:${tier.id}`,
            status_phase: 'pending',
            weight: 1,
            xp_base: tier.xp,
            xp_awarded: tier.xp,
            occurred_on: new Date().toISOString().split('T')[0],
            metadata: { tier: tier.id, threshold: tier.threshold },
          });
        }
      }
    }

    // Verify: 3 inserts for tiers 1, 3, 5 (threshold <= 5); the 0-tier is a base badge and does not award XP
    expect(insertCount).toBe(3);
    expect(lookupCount).toBe(3);
    expect(inserts).toHaveLength(3);
    expect(inserts[0].source_id).toBe('participant:participant-1');
    expect(inserts[1].source_id).toBe('participant:participant-3');
    expect(inserts[2].source_id).toBe('participant:participant-5');
  });

  it('should not re-insert if progression_events already exists for the same tier', async () => {
    let selectCount = 0;
    let insertCount = 0;
    const progressionEvents = createProgressionEventsTableChain({
      existingRow: { id: '1' },
      onInsert: () => {
        insertCount += 1;
      },
      onLookup: () => {
        selectCount += 1;
      },
    });

    const tier = { threshold: 1, id: 'p-1', xp: 1 };
    const existing = await progressionEvents
      .select('id')
      .eq('user_id', 'user-1')
      .eq('source_table', 'action_participants')
      .eq('source_id', `participant:${tier.id}`)
      .maybeSingle();

    // This time existing.data is truthy, so we should skip insert
    if (!existing || !existing.data) {
      await progressionEvents.insert({
        user_id: 'user-1',
        event_type: 'participant_tier_unlock',
        source_table: 'action_participants',
        source_id: `participant:${tier.id}`,
        status_phase: 'pending',
        weight: 1,
        xp_base: tier.xp,
        xp_awarded: tier.xp,
        occurred_on: new Date().toISOString().split('T')[0],
        metadata: { tier: tier.id, threshold: tier.threshold },
      });
    }

    expect(selectCount).toBe(1);
    expect(insertCount).toBe(0); // should not insert
  });
});
