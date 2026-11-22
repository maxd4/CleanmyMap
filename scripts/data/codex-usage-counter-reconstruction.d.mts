export type CounterFieldStats = { present: number; missing: number; decreases: number; repeats: number };
export type CounterReconstruction = {
  values: Record<string, number | "NA">;
  contributions: Record<string, Array<{ timestamp: string; value: number }>>;
  stats: Record<string, CounterFieldStats>;
  semantics: "cumulative_counter_with_reset_detection" | "per_event_delta";
};
type Options = {
  fields: readonly string[];
  sourceKey: string;
  safeTimestamp?: (value: unknown) => string | null;
};
export function reconstructCumulativeCounters(records: readonly unknown[], options: Options): CounterReconstruction;
export function reconstructDirectCounters(records: readonly unknown[], options: Options): CounterReconstruction;
