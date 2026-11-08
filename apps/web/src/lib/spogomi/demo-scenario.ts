export const SPOGOMI_CACHAN_DEMO_SCENARIO_NAME = "SPOGOMI Cachan, démonstration CleanMyMap";
export const SPOGOMI_CACHAN_DEMO_MARKER = "DEMONSTRATION / NON OFFICIEL";
export const SPOGOMI_CACHAN_DEMO_NOTICE = "Démonstration fictive, données synthétiques, règlement non officiel";

export function isSpogomiCachanDemoEvent(event: Pick<{ name: string }, "name">): boolean {
  return event.name.includes(SPOGOMI_CACHAN_DEMO_SCENARIO_NAME) && event.name.includes(SPOGOMI_CACHAN_DEMO_MARKER);
}
