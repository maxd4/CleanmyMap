import { z } from "zod";

const TotalsSchema = z.object({
  wasteKg: z.number(),
  butts: z.number(),
});

export type BadgeTotals = z.infer<typeof TotalsSchema>;
export type BadgeIncrementType = "dechets" | "megots";

export async function fetchBadgeTotals(userId: string): Promise<BadgeTotals> {
  const res = await fetch(`/api/gamification/badges/${encodeURIComponent(userId)}`, {
    method: "GET",
    headers: { "content-type": "application/json" },
  });
  if (!res.ok) throw new Error(`fetchBadgeTotals failed (${res.status})`);
  const json = (await res.json()) as unknown;

  const parsed = z.object({ totals: TotalsSchema }).safeParse(json);
  if (!parsed.success) throw new Error("fetchBadgeTotals: invalid response shape");
  return parsed.data.totals;
}

export async function incrementBadge(
  userId: string,
  type: BadgeIncrementType,
  amount: number,
): Promise<BadgeTotals> {
  const res = await fetch(
    `/api/gamification/badges/${encodeURIComponent(userId)}/increment`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type, amount }),
    },
  );
  if (!res.ok) throw new Error(`incrementBadge failed (${res.status})`);
  const json = (await res.json()) as unknown;

  const parsed = z.object({ totals: TotalsSchema }).safeParse(json);
  if (!parsed.success) throw new Error("incrementBadge: invalid response shape");
  return parsed.data.totals;
}

