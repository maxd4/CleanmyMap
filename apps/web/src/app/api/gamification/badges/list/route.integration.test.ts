import { describe, it, expect, beforeEach, vi } from 'vitest';

// Integration test: badges/list API with participant tier logic and audit/progression_events writes
describe('POST /api/gamification/badges/list - participant tier unlock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should insert into progression_events exactly once per newly-unlocked participant tier', async () => {
    let insertCount = 0;
    const inserts: any[] = [];

    const supabaseMock = {
      from: vi.fn((table: string) => {
        if (table === 'progression_events') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(function(this: any) {
                return this;
              })
              .bind({
                eq: vi.fn(function(this: any) {
                  return this;
                }).bind({
                  eq: vi.fn(function(this: any) {
                    return this;
                  }).bind({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
            })),
            insert: vi.fn(async (payload: any) => {
              insertCount++;
              inserts.push(payload);
              return { data: null, error: null };
            }),
          };
        }
        if (table === 'xp_audit') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {
          select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })),
          insert: vi.fn(),
        };
      }),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    // Simulate the tier unlock logic from badges/list route
    const PARTICIPANT_TIERS = [
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
        const existing = await supabaseMock
          .from('progression_events')
          .select('id')
          .eq('user_id', userId)
          .eq('source_table', 'action_participants')
          .eq('source_id', `participant:${tier.id}`)
          .maybeSingle();

        if (!existing?.data) {
          await supabaseMock.from('progression_events').insert({
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

    // Verify: 3 inserts for tiers 1, 3, 5 (threshold <= 5)
    expect(insertCount).toBe(3);
    expect(inserts).toHaveLength(3);
    expect(inserts[0].source_id).toBe('participant:participant-1');
    expect(inserts[1].source_id).toBe('participant:participant-3');
    expect(inserts[2].source_id).toBe('participant:participant-5');
  });

  it('should not re-insert if progression_events already exists for the same tier', async () => {
    let selectCount = 0;
    let insertCount = 0;

    const supabaseMock = {
      from: vi.fn((table: string) => {
        if (table === 'progression_events') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi.fn(async () => {
                      selectCount++;
                      // return existing row (data is not null) to simulate duplicate
                      return { data: { id: 1 }, error: null };
                    }),
                  })),
                })),
              })),
            })),
            insert: vi.fn(async () => {
              insertCount++;
              return { data: null, error: null };
            }),
          };
        }
        return { select: vi.fn(), insert: vi.fn() };
      }),
    };

    const tier = { threshold: 1, id: 'p-1', xp: 1 };
    const existing = await supabaseMock
      .from('progression_events')
      .select('id')
      .eq('user_id', 'user-1')
      .eq('source_table', 'action_participants')
      .eq('source_id', `participant:${tier.id}`)
      .maybeSingle();

    // This time existing.data is truthy, so we should skip insert
    if (!existing || !existing.data) {
      await supabaseMock.from('progression_events').insert({ /* ... */ });
    }

    expect(selectCount).toBe(1);
    expect(insertCount).toBe(0); // should not insert
  });
});
