import { trackFunnel } from "@/lib/analytics/funnel-client";
import type { FormState } from "../model";

type ActionDeclarationFormStartParams = {
  hasTrackedStartRef: { current: boolean };
  declarationMode: "complete";
  form: FormState;
  linkedEventId?: string;
};

export function trackActionDeclarationFormStart({
  hasTrackedStartRef,
  declarationMode,
  form,
  linkedEventId,
}: ActionDeclarationFormStartParams): void {
  if (hasTrackedStartRef.current) return;

  hasTrackedStartRef.current = true;
  void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ trackFunnel(
    "start_form",
    declarationMode,
    {
      source: "action_declaration_form",
      declarationMode,
      recordType: form.recordType,
      routePath: typeof window !== "undefined" ? window.location.pathname : null,
      formVariant: "legacy",
      linkedEventId: linkedEventId ?? null,
    },
  );
}
