import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { upsertSpogomiGalleryPhoto, withdrawSpogomiGalleryPhoto } from "./photo-gallery-service";

function fakeSupabase(initialPreparationData: Record<string, unknown>, simulateConflict = false) {
  let preparationData = initialPreparationData;
  let updateAttempt = 0;
  const updates: Record<string, unknown>[] = [];
  const client = {
    from(table: string) {
      expect(table).toBe("actions");
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => ({
                  data: { id: "action-1", status: "approved", published_at: "2026-10-12T08:00:00.000Z", moderation_visibility: "visible", preparation_data: preparationData },
                  error: null,
                }),
              };
            },
          };
        },
        update(values: Record<string, unknown>) {
          const builder = {
            eq() { return builder; },
            is() { return builder; },
            select() {
              return {
                maybeSingle: async () => {
                  updateAttempt += 1;
                  updates.push(values);
                  if (simulateConflict && updateAttempt === 1) {
                    preparationData = { ...preparationData, concurrentNote: "kept", spogomiGallery: [] };
                    return { data: null, error: null };
                  }
                  preparationData = values.preparation_data as Record<string, unknown>;
                  return { data: { id: "action-1" }, error: null };
                },
              };
            },
          };
          return builder;
        },
      };
    },
  };
  return { client, getPreparationData: () => preparationData, updates };
}

const publishedInput = {
  id: "photo-1",
  url: "https://cdn.example.test/photo-1.jpg",
  alt: "Photo autorisée",
  sourceUrl: "https://organizer.example.test/photo-1",
  ownerName: "Organisateur local",
  status: "published" as const,
  rightsStatus: "authorized" as const,
  approvedForPublication: true,
  subjectProtectionReviewed: true,
  minorProtectionReviewed: true,
};

describe("SPOGOMI gallery service mutations", () => {
  it("retries a compare-and-swap conflict without losing concurrent preparation metadata", async () => {
    const fake = fakeSupabase({ otherFeature: { enabled: true }, spogomiGallery: [] }, true);
    const photo = await upsertSpogomiGalleryPhoto({
      supabase: fake.client as never,
      actionId: "action-1",
      photo: publishedInput,
      actorUserId: "organizer-1",
    });
    expect(photo).toMatchObject({ id: "photo-1", approvedByUserId: "organizer-1" });
    expect(fake.getPreparationData()).toMatchObject({ otherFeature: { enabled: true }, concurrentNote: "kept" });
    expect((fake.getPreparationData().spogomiGallery as unknown[]).length).toBe(1);
    expect(fake.updates).toHaveLength(2);
  });

  it("withdraws an existing published photo and leaves drafts non-public", async () => {
    const fake = fakeSupabase({
      spogomiGallery: [
        {
          ...publishedInput,
          approvedAt: "2026-10-12T08:00:00.000Z",
          approvedByUserId: "organizer-1",
          publishedAt: "2026-10-12T08:00:00.000Z",
          withdrawnAt: null,
        },
        { ...publishedInput, id: "draft-1", status: "draft", rightsStatus: "pending", approvedForPublication: false, subjectProtectionReviewed: false, minorProtectionReviewed: false },
      ],
    });
    const withdrawn = await withdrawSpogomiGalleryPhoto({ supabase: fake.client as never, actionId: "action-1", photoId: "photo-1", withdrawnAt: "2026-10-12T12:00:00.000Z" });
    expect(withdrawn).toBe(true);
    expect(fake.getPreparationData().spogomiGallery).toMatchObject([{ status: "withdrawn" }, { id: "draft-1", status: "draft" }]);
  });
});
