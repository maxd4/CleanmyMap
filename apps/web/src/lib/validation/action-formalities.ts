import { z } from "zod";
import { actionFormalitiesFactsSchema } from "@/lib/actions/formalities-workflow";
import type { ActionFormalitiesWorkflowState } from "@/lib/actions/formalities-workflow";

export const preparationFormalitiesSchemaFields = {
  administrativeRequirements: z
    .object({
      status: z.enum(["pending", "validated"]),
      validatedAt: z.string().datetime().nullable().optional(),
      validatedByUserId: z.string().min(1).max(120).nullable().optional(),
    })
    .strict()
    .optional(),
  formalitiesContext: actionFormalitiesFactsSchema.optional(),
  // This protected sub-state is accepted for read/compatibility payloads,
  // then removed below so generic writes cannot forge workflow progress.
  formalitiesWorkflow: z.custom<ActionFormalitiesWorkflowState>().optional(),
};
