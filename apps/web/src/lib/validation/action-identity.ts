import { z } from "zod";
import { isOrganizerType, type OrganizerType } from "@/lib/actions/organizer-type";
import { normalizeOrganizerName } from "@/lib/actions/organizer-directory-registry";

const associationNameSchema = z.string().min(1).max(120);
const organizerNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .refine(
    (value) => Boolean(normalizeOrganizerName(value)),
    "Le nom de l'organisateur doit contenir des caractères lisibles.",
  );
const organizerIdSchema = z.string().trim().min(1).max(120).nullable().optional();
const organizerTypeSchema = z.custom<OrganizerType>(
  isOrganizerType,
  "Type de structure invalide.",
);
const accountTokensSchema = z.array(z.string().min(1).max(120)).max(50).optional();

export const commonActionIdentitySchemaFields = {
  actorName: z.string().min(1).max(120).optional(),
  associationName: associationNameSchema,
  organizerType: organizerTypeSchema.nullable().optional(),
  organizerId: organizerIdSchema,
  organizerName: organizerNameSchema.optional(),
  organizerAccounts: z.array(z.string().min(1).max(120)).max(20).optional(),
  participantAccounts: accountTokensSchema,
  groupJoinEnabled: z.boolean().optional(),
};

export const userMetadataSchema = z.object({
  userId: z.string().min(1).max(120),
  handle: z.string().min(1).max(120).optional(),
  username: z.string().min(1).max(120).optional(),
  displayName: z.string().min(1).max(200).optional(),
  email: z.string().email().max(200).optional(),
});
