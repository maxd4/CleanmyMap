import type { ActiveRole } from "@/lib/domain-language";
import type { FormState } from "../model";

export interface ActionStepIdentityProps {
  form: FormState;
  updateField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  updateFields: (updates: Partial<FormState>) => void;
  userMetadata: {
    userId: string;
    activeRole?: ActiveRole;
    handle?: string;
    displayName?: string;
    username?: string;
  };
  recordType: FormState["recordType"];
  hasAttemptedSubmit?: boolean;
  mode?:
    | "all"
    | "action"
    | "participants"
    | "duration"
    | "time"
    | "organization"
    | "collection"
    | "details";
}
