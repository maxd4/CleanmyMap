import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionPhotoAsset } from "@/lib/actions/types";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const normalizeActionPhotosMock = vi.hoisted(() => vi.fn());
const inferActionVisionEstimateMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/vision", () => ({
  ACTION_VISION_ESTIMATION_ENABLED: false,
  normalizeActionPhotos: normalizeActionPhotosMock,
  inferActionVisionEstimate: inferActionVisionEstimateMock,
}));

import { useActionDeclarationFormMedia } from "./use-action-declaration-form-media";

type MediaSnapshot = ReturnType<typeof useActionDeclarationFormMedia>;

function Harness({ onSnapshot }: { onSnapshot: (snapshot: MediaSnapshot) => void }) {
  const media = useActionDeclarationFormMedia();
  onSnapshot(media);
  return null;
}

describe("useActionDeclarationFormMedia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    normalizeActionPhotosMock.mockResolvedValue([
      {
        id: "photo-1",
        name: "bilan.jpg",
        mimeType: "image/jpeg",
        dataUrl: "data:image/jpeg;base64,AAA",
        size: 42,
        width: 120,
        height: 80,
      } satisfies ActionPhotoAsset,
    ]);
  });

  it("keeps photo preparation while never invoking the disabled estimator", async () => {
    let latest!: MediaSnapshot;
    let renderer!: ReactTestRenderer;

    act(() => {
      renderer = create(React.createElement(Harness, {
        onSnapshot: (snapshot) => {
          latest = snapshot;
        },
      }));
    });

    await act(async () => {
      await latest.handlePhotoUpload([{} as File] as unknown as FileList);
    });

    expect(latest.photoAssets).toHaveLength(1);
    expect(latest.visionEstimate).toBeNull();
    expect(latest.visionStatus).toBe("idle");
    expect(normalizeActionPhotosMock).toHaveBeenCalledTimes(1);
    expect(inferActionVisionEstimateMock).not.toHaveBeenCalled();

    renderer.unmount();
  });
});
