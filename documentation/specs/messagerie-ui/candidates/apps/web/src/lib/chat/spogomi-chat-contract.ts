import { z } from "zod";

export const SPOGOMI_CHAT_ROOMS = ["general", "coordination", "teams"] as const;
export const spogomiRoomSchema = z.enum(SPOGOMI_CHAT_ROOMS);
export type SpogomiRoom = z.infer<typeof spogomiRoomSchema>;
export const spogomiRoomLabels: Record<SpogomiRoom, string> = {
  general: "Discussion générale",
  coordination: "Organisation et coordination",
  teams: "Équipes et bénévolat",
};
export const spogomiEventSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  state: z.string(),
  startsAt: z.string(),
});
export type SpogomiChatEvent = z.infer<typeof spogomiEventSchema>;
export const spogomiDirectorySchema = z.object({
  events: z.array(spogomiEventSchema),
  nextCursor: z.string().uuid().nullable(),
});
export const spogomiCursorSchema = z.object({
  createdAt: z.string().datetime({ offset: true }),
  id: z.string().uuid(),
});
export const spogomiThreadSchema = z.object({
  event: spogomiEventSchema,
  messages: z.array(z.object({
    id: z.string().uuid(),
    senderId: z.string(),
    senderName: z.string(),
    content: z.string(),
    createdAt: z.string(),
  })),
  nextCursor: spogomiCursorSchema.nullable(),
});
export const spogomiSendSchema = z.object({
  eventId: z.string().uuid(),
  room: spogomiRoomSchema,
  content: z.string().trim().min(1).max(2000),
}).strict();
export const spogomiReadSchema = z.object({
  eventId: z.string().uuid(),
  room: spogomiRoomSchema,
  beforeAt: z.string().datetime({ offset: true }).optional(),
  beforeId: z.string().uuid().optional(),
  q: z.string().trim().min(2).max(100).optional(),
}).refine(value => Boolean(value.beforeAt) === Boolean(value.beforeId));
export function isSpogomiRoomWritable(event: SpogomiChatEvent): boolean {
  return ["registration_open", "composition_locked", "in_progress", "judging", "certified"].includes(event.state);
}
