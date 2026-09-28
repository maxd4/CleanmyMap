import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const handleApiErrorMock = vi.hoisted(() => vi.fn());
const fromMock = vi.hoisted(() => vi.fn());
const selectMock = vi.hoisted(() => vi.fn());
const orderMock = vi.hoisted(() => vi.fn());
const rangeMock = vi.hoisted(() => vi.fn());
const eqMock = vi.hoisted(() => vi.fn());
const gteMock = vi.hoisted(() => vi.fn());
const lteMock = vi.hoisted(() => vi.fn());
const thenMock = vi.hoisted(() => vi.fn());

const supabaseMock = {
  from: fromMock,
};

vi.mock('@/lib/authz', () => ({
  requireAdminAccess: requireAdminAccessMock,
}));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

vi.mock('@/lib/http/api-errors', () => ({
  handleApiError: handleApiErrorMock,
}));

function resetQueryMocks() {
  vi.clearAllMocks();
  requireAdminAccessMock.mockResolvedValue({ ok: true, userId: 'admin-1' });
  getSupabaseServerClientMock.mockReturnValue(supabaseMock);
  handleApiErrorMock.mockImplementation(
    () => new Response(JSON.stringify({ error: 'internal' }), { status: 500 }),
  );
  fromMock.mockReturnValue(supabaseMock);
  selectMock.mockReturnValue(supabaseMock);
  orderMock.mockReturnValue(supabaseMock);
  eqMock.mockReturnValue(supabaseMock);
  gteMock.mockReturnValue(supabaseMock);
  lteMock.mockReturnValue(supabaseMock);
  rangeMock.mockReturnValue(supabaseMock);
  thenMock.mockImplementation((resolve: (result: unknown) => unknown) =>
    Promise.resolve({
      data: [
        {
          id: 'audit-1',
          created_at: '2026-09-28T10:00:00.000Z',
          user_id: 'user-1',
          actor_id: 'admin-1',
          reason: 'manual_adjustment',
          xp_change: 10,
          source_table: 'profiles',
          source_id: 'user-1',
          metadata: { source: 'test' },
        },
      ],
      error: null,
    }).then(resolve),
  );

  Object.assign(supabaseMock, {
    select: selectMock,
    order: orderMock,
    range: rangeMock,
    eq: eqMock,
    gte: gteMock,
    lte: lteMock,
    then: thenMock,
  });
}

import { GET } from './route';

describe('GET /api/gamification/xp_audit/admin', () => {
  beforeEach(() => {
    resetQueryMocks();
  });

  it('returns the canonical 401 response and never creates a privileged client anonymously', async () => {
    requireAdminAccessMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      error: 'Unauthorized',
    });

    const response = await GET(
      new Request('http://localhost/api/gamification/xp_audit/admin'),
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({
      kind: 'permission',
      code: 'unauthorized',
      hint: 'Unauthorized',
    });
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('returns the canonical 403 response and never creates a privileged client for non-admins', async () => {
    requireAdminAccessMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      error: 'Forbidden',
    });

    const response = await GET(
      new Request('http://localhost/api/gamification/xp_audit/admin'),
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      kind: 'permission',
      code: 'forbidden',
      hint: 'Forbidden',
    });
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('keeps the existing audit response and query filters for admins', async () => {
    const response = await GET(
      new Request(
        'http://localhost/api/gamification/xp_audit/admin?userId=user-1&from=2026-09-01&to=2026-09-28&limit=2&offset=4',
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: 'ok',
      items: [
        {
          id: 'audit-1',
          created_at: '2026-09-28T10:00:00.000Z',
          user_id: 'user-1',
          actor_id: 'admin-1',
          reason: 'manual_adjustment',
          xp_change: 10,
          source_table: 'profiles',
          source_id: 'user-1',
          metadata: { source: 'test' },
        },
      ],
    });
    expect(requireAdminAccessMock).toHaveBeenCalledTimes(1);
    expect(getSupabaseServerClientMock).toHaveBeenCalledWith(true);
    expect(fromMock).toHaveBeenCalledWith('xp_audit');
    expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(eqMock).toHaveBeenCalledWith('user_id', 'user-1');
    expect(gteMock).toHaveBeenCalledWith('created_at', '2026-09-01');
    expect(lteMock).toHaveBeenCalledWith('created_at', '2026-09-28');
    expect(rangeMock).toHaveBeenCalledWith(4, 5);
  });
});
