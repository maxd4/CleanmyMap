import { describe, expect, it } from "vitest";
import { spogomiReadSchema, spogomiSendSchema, spogomiRoomSchema, isSpogomiRoomWritable } from "./spogomi-chat-contract";

const eventId = "00000000-0000-4000-8000-000000000001";
describe("SPOGOMI event chat contract", () => {
  it("requires an event and a canonical room", () => {
    expect(spogomiSendSchema.safeParse({ eventId, room: "general", content: "Bonjour" }).success).toBe(true);
    expect(spogomiSendSchema.safeParse({ room: "general", content: "Bonjour" }).success).toBe(false);
    expect(spogomiRoomSchema.safeParse("spogomi").success).toBe(false);
  });
  it("rejects a forged actor and empty or oversized messages", () => {
    const base = { eventId, room: "general", content: "Bonjour" };
    expect(spogomiSendSchema.safeParse({ ...base, userId: "other" }).success).toBe(false);
    expect(spogomiSendSchema.safeParse({ ...base, content: " " }).success).toBe(false);
    expect(spogomiSendSchema.safeParse({ ...base, content: "x".repeat(2001) }).success).toBe(false);
  });
  it("requires both cursor components", () => {
    expect(spogomiReadSchema.safeParse({ eventId, room: "general", beforeId: eventId }).success).toBe(false);
  });
  it.each(["draft", "cancelled", "archived", "unknown"])("fails closed for %s", state => {
    expect(isSpogomiRoomWritable({ id: eventId, name: "Event", state, startsAt: "" })).toBe(false);
  });
});
