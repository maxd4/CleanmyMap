import { describe, expect, it } from"vitest";
import { getChatFeedState } from"./chat-feed-state";

describe("getChatFeedState", () => {
 it("returns ready for nominal chat flow with messages", () => {
 expect(
 getChatFeedState({
 isLoading: false,
 hasMessages: true,
 hasError: false,
 }),
 ).toBe("ready");
 });

 it("returns degraded when the chat request fails", () => {
 expect(
 getChatFeedState({
 isLoading: false,
 hasMessages: false,
 hasError: true,
 }),
 ).toBe("degraded");
 });

 it("returns empty when the feed is loaded but has no messages", () => {
 expect(
 getChatFeedState({
 isLoading: false,
 hasMessages: false,
 hasError: false,
 }),
 ).toBe("empty");
 });
});

