import { beforeEach, describe, expect, it, vi } from "vitest";

const appendAdminOperationAuditMock = vi.hoisted(() => vi.fn());
const createChatNotificationsForMessageMock = vi.hoisted(() => vi.fn());
const loadActionByIdMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin/audit/operation-audit", () => ({
  appendAdminOperationAudit: appendAdminOperationAuditMock,
}));
vi.mock("@/lib/actions/store", () => ({ loadActionById: loadActionByIdMock }));
vi.mock("./chat-notifications", () => ({
  createChatNotificationsForMessage: createChatNotificationsForMessageMock,
}));
import {
  buildOfficialAssociationAnnouncementContent,
  isEligibleForOfficialAssociationAnnouncement,
  publishOfficialAssociationActionAnnouncement,
} from "./association-action-announcement";

const baseAction = {
  id: "action-1",
  action_date: "2099-06-15",
  event_start_time: "09:30:00",
  event_end_time: "12:00:00",
  location_label: "Parc public",
  actor_name: "Membre",
  organizer_name: "Association propre",
  organizer_type: "association" as const,
  status: "pending" as const,
  review_state: "approved" as const,
  published_at: "2099-01-01T10:00:00.000Z",
  moderation_visibility: "visible" as const,
  action_phase: "pre_action" as const,
  access_mode: "public" as const,
  preparation_data: {
    actionTitle: "Nettoyage du parc",
    shortDescription: "Une présentation courte et publique.",
  },
};

function createAnnouncementSupabase(options: {
  existingMessages?: Array<{ id: string } | null>;
  insertedMessage?: { id: string } | null;
  insertError?: { message: string } | null;
}) {
  let lookupIndex = 0;
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => ({
      data: options.existingMessages?.[lookupIndex++] ?? null,
      error: null,
    })),
    insert: vi.fn(() => builder),
    single: vi.fn(async () => ({ data: options.insertedMessage ?? null, error: options.insertError ?? null })),
  };
  return { from: vi.fn(() => builder), builder };
}

describe("official association action announcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appendAdminOperationAuditMock.mockResolvedValue(undefined);
    loadActionByIdMock.mockResolvedValue(baseAction);
  });

  it("accepts pending and approved public future publications", () => {
    const now = new Date("2099-01-01T09:00:00.000Z");
    expect(isEligibleForOfficialAssociationAnnouncement(baseAction, now)).toBe(true);
    expect(
      isEligibleForOfficialAssociationAnnouncement({ ...baseAction, status: "approved" }, now),
    ).toBe(true);
  });

  it("rejects incomplete, private, hidden, unpublished, cancelled, and past actions", () => {
    const now = new Date("2099-01-01T09:00:00.000Z");
    expect(isEligibleForOfficialAssociationAnnouncement({ ...baseAction, review_state: "pending_review" }, now)).toBe(false);
    expect(isEligibleForOfficialAssociationAnnouncement({ ...baseAction, review_state: "draft" }, now)).toBe(false);
    expect(isEligibleForOfficialAssociationAnnouncement({ ...baseAction, status: "rejected" }, now)).toBe(false);
    expect(isEligibleForOfficialAssociationAnnouncement({ ...baseAction, access_mode: "invite_link" }, now)).toBe(false);
    expect(isEligibleForOfficialAssociationAnnouncement({ ...baseAction, status: "cancelled" }, now)).toBe(false);
    expect(isEligibleForOfficialAssociationAnnouncement({ ...baseAction, moderation_visibility: "hidden" }, now)).toBe(false);
    expect(isEligibleForOfficialAssociationAnnouncement({ ...baseAction, published_at: null }, now)).toBe(false);
    expect(
      isEligibleForOfficialAssociationAnnouncement(
        { ...baseAction, action_date: "2098-06-15", published_at: "2098-01-01T10:00:00.000Z" },
        now,
      ),
    ).toBe(false);
  });

  it("builds a bounded public presentation with the canonical action link", () => {
    const presentation = buildOfficialAssociationAnnouncementContent(baseAction);
    expect(presentation.content).toContain("Nettoyage du parc");
    expect(presentation.content).toContain("Une présentation courte et publique.");
    expect(presentation.content).toContain("Organisé par : Association propre");
    expect(presentation.content).toContain("/sections/rejoindre-une-action?actionId=action-1");
    expect(presentation.content).not.toContain("preparation_data");
    expect(presentation.href).toBe("/sections/rejoindre-une-action?actionId=action-1");
  });

  it("announces a newly approved review while the action remains pending", async () => {
    const supabase = createAnnouncementSupabase({ insertedMessage: { id: "message-1" } });
    createChatNotificationsForMessageMock.mockResolvedValue(3);

    const publication = await publishOfficialAssociationActionAnnouncement({
      supabase: supabase as never,
      actionId: "action-1",
      actorUserId: "admin-1",
      operationId: "operation-1",
      now: new Date("2099-01-01T09:00:00.000Z"),
    });

    expect(publication).toEqual({
      actionId: "action-1",
      state: "diffused",
      messageId: "message-1",
      notificationCount: 3,
      retryable: false,
    });
    expect(supabase.builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ official_action_publication_id: "action-1" }),
    );
    expect(createChatNotificationsForMessageMock).toHaveBeenCalledWith(
      supabase,
      "message-1",
      "admin-1",
    );
    expect(loadActionByIdMock).toHaveBeenCalledWith(supabase, "action-1");
  });

  it("reuses the durable message on retry and never creates a second announcement", async () => {
    const supabase = createAnnouncementSupabase({ existingMessages: [{ id: "message-1" }, { id: "message-1" }] });
    createChatNotificationsForMessageMock.mockResolvedValue(0);

    const first = await publishOfficialAssociationActionAnnouncement({
      supabase: supabase as never,
      actionId: "action-1",
      actorUserId: "admin-1",
      operationId: "operation-1",
      now: new Date("2099-01-01T09:00:00.000Z"),
    });
    const retry = await publishOfficialAssociationActionAnnouncement({
      supabase: supabase as never,
      actionId: "action-1",
      actorUserId: "admin-1",
      operationId: "operation-2",
      retry: true,
      now: new Date("2099-01-01T09:00:00.000Z"),
    });

    expect(first.messageId).toBe("message-1");
    expect(retry).toMatchObject({ state: "already_diffused", messageId: "message-1", retryable: false });
    expect(supabase.builder.insert).not.toHaveBeenCalled();
    expect(createChatNotificationsForMessageMock).toHaveBeenCalledTimes(2);
  });

  it("keeps the message and returns a retryable partial result when fan-out fails", async () => {
    const supabase = createAnnouncementSupabase({ insertedMessage: { id: "message-1" } });
    createChatNotificationsForMessageMock.mockRejectedValueOnce(new Error("fanout unavailable"));

    const publication = await publishOfficialAssociationActionAnnouncement({
      supabase: supabase as never,
      actionId: "action-1",
      actorUserId: "admin-1",
      operationId: "operation-1",
      now: new Date("2099-01-01T09:00:00.000Z"),
    });

    expect(publication).toEqual({
      actionId: "action-1",
      state: "partial",
      messageId: "message-1",
      notificationCount: null,
      retryable: true,
    });
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "error",
        details: expect.objectContaining({
          operation: "association_action_announcement_publish_notification_failure",
          partialMutation: true,
        }),
      }),
    );
  });

  it("does not announce a review that is no longer publicly eligible", async () => {
    loadActionByIdMock.mockResolvedValue({ ...baseAction, status: "rejected" });
    const supabase = createAnnouncementSupabase({ insertedMessage: { id: "message-1" } });

    const publication = await publishOfficialAssociationActionAnnouncement({
      supabase: supabase as never,
      actionId: "action-1",
      actorUserId: "admin-1",
      operationId: "operation-1",
      now: new Date("2099-01-01T09:00:00.000Z"),
    });

    expect(publication).toEqual({
      actionId: "action-1",
      state: "not_eligible",
      messageId: null,
      notificationCount: null,
      retryable: false,
    });
    expect(supabase.builder.insert).not.toHaveBeenCalled();
    expect(createChatNotificationsForMessageMock).not.toHaveBeenCalled();
  });
});
