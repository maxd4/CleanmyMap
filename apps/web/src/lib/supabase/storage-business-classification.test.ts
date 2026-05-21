import { describe, expect, it } from "vitest";
import {
  buildStorageBusinessMetadata,
  classifyStorageBusinessObject,
  extractStorageBusinessClassificationContext,
} from "./storage-business-classification";

describe("storage business classification", () => {
  it("extracts metadata context from storage objects", () => {
    const context = extractStorageBusinessClassificationContext({
      business_domain: "messages",
      sourceTable: "messages",
      businessContext: "chat_attachment",
    });

    expect(context.businessDomain).toBe("messages");
    expect(context.sourceTable).toBe("messages");
    expect(context.businessContext).toBe("chat_attachment");
  });

  it("uses the explicit business domain before other signals", () => {
    const classification = classifyStorageBusinessObject({
      bucketId: "archives",
      name: "nested/report.pdf",
      mimeType: "application/pdf",
      metadata: buildStorageBusinessMetadata({
        businessDomain: "socle_estimateur_impact",
        sourceTable: "messages",
        businessContext: "chat_attachment",
      }),
    });

    expect(classification.id).toBe("socle_estimateur_impact");
    expect(classification.signal).toBe("businessDomain");
    expect(classification.matchedSignals.map((item) => item.signal)).toContain(
      "businessDomain",
    );
  });

  it("uses business context before generic bucket heuristics", () => {
    const classification = classifyStorageBusinessObject({
      bucketId: "chat-attachments",
      name: "dm/photo.jpg",
      mimeType: "image/jpeg",
      metadata: buildStorageBusinessMetadata({
        sourceTable: "messages",
        businessContext: "chat_attachment",
      }),
    });

    expect(classification.id).toBe("messages");
    expect(classification.signal).toBe("businessContext");
    expect(classification.matchedSignals.map((item) => item.signal)).toContain(
      "businessContext",
    );
    expect(classification.matchedSignals.map((item) => item.signal)).toContain(
      "mime",
    );
  });

  it("uses the source table when the feature context is not explicit", () => {
    const classification = classifyStorageBusinessObject({
      bucketId: "archives",
      name: "nested/report.pdf",
      mimeType: "application/pdf",
      metadata: buildStorageBusinessMetadata({
        sourceTable: "governance_monthly_reports",
      }),
    });

    expect(classification.id).toBe("socle_estimateur_impact");
    expect(classification.signal).toBe("sourceTable");
    expect(classification.matchedSignals.map((item) => item.signal)).toContain(
      "sourceTable",
    );
  });

  it.each([
    {
      title: "reports bucket",
      input: {
        bucketId: "reports",
        name: "reports/rapport-2026.pdf",
        mimeType: "application/pdf",
      },
      expectedId: "socle_estimateur_impact",
      expectedSignal: "bucket",
    },
    {
      title: "emails bucket",
      input: {
        bucketId: "emails",
        name: "emails/message.eml",
        mimeType: "message/rfc822",
      },
      expectedId: "emails",
      expectedSignal: "bucket",
    },
    {
      title: "messages bucket",
      input: {
        bucketId: "messages",
        name: "messages/thread.mp4",
        mimeType: "video/mp4",
      },
      expectedId: "messages",
      expectedSignal: "bucket",
    },
    {
      title: "action photos bucket",
      input: {
        bucketId: "action-photos",
        name: "action-photos/photo-1.jpg",
        mimeType: "image/jpeg",
      },
      expectedId: "pieces_jointes_photo",
      expectedSignal: "bucket",
    },
    {
      title: "chat attachments document mime",
      input: {
        bucketId: "chat-attachments",
        name: "chat-attachments/rapport.pdf",
        mimeType: "application/pdf",
      },
      expectedId: "pieces_jointes_document",
      expectedSignal: "mime",
    },
    {
      title: "avatars bucket",
      input: {
        bucketId: "avatars",
        name: "avatars/user-1.png",
        mimeType: "image/png",
      },
      expectedId: "donnees_utilisateur",
      expectedSignal: "bucket",
    },
    {
      title: "badges bucket",
      input: {
        bucketId: "badges",
        name: "badges/gold.png",
        mimeType: "image/png",
      },
      expectedId: "badges_gamification",
      expectedSignal: "bucket",
    },
    {
      title: "terrain bucket",
      input: {
        bucketId: "mission-assets",
        name: "mission-assets/mission.mp4",
        mimeType: "video/mp4",
      },
      expectedId: "actions_terrain",
      expectedSignal: "bucket",
    },
  ])(
    "classifies nominal business buckets: $title",
    ({ input, expectedId, expectedSignal }) => {
      const classification = classifyStorageBusinessObject(input);

      expect(classification.id).toBe(expectedId);
      expect(classification.signal).toBe(expectedSignal);
    },
  );

  it("falls back to the bucket rule when a known attachment bucket has no useful file signal", () => {
    const classification = classifyStorageBusinessObject({
      bucketId: "attachments",
      name: "attachments/fichier",
      mimeType: "application/octet-stream",
    });

    expect(classification.id).toBe("pieces_jointes_document");
    expect(classification.signal).toBe("bucket");
  });

  it("falls back to autres for an unknown bucket, bad mime and generic name", () => {
    const classification = classifyStorageBusinessObject({
      bucketId: "misc",
      name: "misc/fichier",
      mimeType: "application/octet-stream",
    });

    expect(classification.id).toBe("autres");
    expect(classification.signal).toBe("keyword");
  });

  it("reclassifies the same file when it moves between categories", () => {
    const file = {
      name: "shared/fichier.png",
      mimeType: "image/png",
    };

    const before = classifyStorageBusinessObject({
      bucketId: "reports",
      ...file,
    });
    const after = classifyStorageBusinessObject({
      bucketId: "avatars",
      ...file,
    });

    expect(before.id).toBe("socle_estimateur_impact");
    expect(after.id).toBe("donnees_utilisateur");
    expect(before.id).not.toBe(after.id);
  });

  it("keeps classifying large batches consistently", () => {
    const bulk = Array.from({ length: 1000 }, (_, index) => {
      if (index % 3 === 0) {
        return classifyStorageBusinessObject({
          bucketId: "reports",
          name: `reports/${index}.pdf`,
          mimeType: "application/pdf",
        });
      }

      if (index % 3 === 1) {
        return classifyStorageBusinessObject({
          bucketId: "avatars",
          name: `avatars/${index}.png`,
          mimeType: "image/png",
        });
      }

      return classifyStorageBusinessObject({
        bucketId: "mission-assets",
        name: `mission-assets/${index}.mp4`,
        mimeType: "video/mp4",
      });
    });

    const counts = bulk.reduce<Map<string, number>>((map, item) => {
      map.set(item.id, (map.get(item.id) ?? 0) + 1);
      return map;
    }, new Map());

    expect(counts.get("socle_estimateur_impact")).toBe(334);
    expect(counts.get("donnees_utilisateur")).toBe(333);
    expect(counts.get("actions_terrain")).toBe(333);
  });

  it("falls back to autres when a future category is not part of the taxonomy", () => {
    const classification = classifyStorageBusinessObject({
      bucketId: "future-assets",
      name: "future-assets/inconnu.bin",
      mimeType: "application/octet-stream",
      businessDomain: "future_category",
      sourceTable: "future_table",
      businessContext: "future_context",
    });

    expect(classification.id).toBe("autres");
    expect(classification.signal).toBe("keyword");
    expect(classification.matchedSignals).toHaveLength(1);
  });

  it("falls back to the existing bucket and mime heuristics", () => {
    const classification = classifyStorageBusinessObject({
      bucketId: "action-photos",
      name: "action-1/photo-1.jpg",
      mimeType: "image/jpeg",
    });

    expect(classification.id).toBe("pieces_jointes_photo");
    expect(classification.signal).toBe("bucket");
    expect(classification.matchedSignals.map((item) => item.signal)).toContain(
      "bucket",
    );
  });
});
