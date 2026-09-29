import type { FormState } from "./model";

export type { FormState };

export type DeclarationMode = "quick" | "complete";

export type UpdateFormField = <K extends keyof FormState>(
 key: K,
 value: FormState[K],
) => void;
