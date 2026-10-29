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

  it("adds photos incrementally, removes them by stable id and replaces one without clearing the others", async () => {
    let latest!: MediaSnapshot;
    let renderer!: ReactTestRenderer;

    act(() => {
      renderer = create(React.createElement(Harness, {
        onSnapshot: (snapshot) => { latest = snapshot; },
      }));
    });

    await act(async () => {
      await latest.handlePhotoUpload([{} as File] as unknown as FileList);
    });
    expect(latest.photoAssets).toHaveLength(1);

    await act(async () => {
      await latest.handlePhotoReplace("photo-1", {} as File);
    });
    expect(latest.photoAssets).toHaveLength(1);
    expect(latest.photoAssets[0]?.id).toBe("photo-1");

    act(() => latest.removePhoto("photo-1"));
    expect(latest.photoAssets).toHaveLength(0);
    renderer.unmount();
  });

  it("reports an excessive selection without silently losing the existing valid photos", async () => {
    let latest!: MediaSnapshot;
    let renderer!: ReactTestRenderer;

    act(() => {
      renderer = create(React.createElement(Harness, {
        onSnapshot: (snapshot) => { latest = snapshot; },
      }));
    });

    await act(async () => {
      await latest.handlePhotoUpload([{} as File, {} as File, {} as File, {} as File] as unknown as FileList);
    });

    expect(latest.photoAssets).toHaveLength(3);
    expect(latest.photoError).toContain("Sélection limitée à 3 photos");
    expect(normalizeActionPhotosMock).toHaveBeenCalledTimes(3);
    renderer.unmount();
  });

  it("keeps already prepared photos when a later file fails validation", async () => {
    let latest!: MediaSnapshot;
    let renderer!: ReactTestRenderer;

    act(() => {
      renderer = create(React.createElement(Harness, {
        onSnapshot: (snapshot) => { latest = snapshot; },
      }));
    });

    await act(async () => {
      await latest.handlePhotoUpload([{} as File] as unknown as FileList);
    });
    normalizeActionPhotosMock.mockRejectedValueOnce(new Error("Compression impossible."));

    await act(async () => {
      await latest.handlePhotoUpload([{} as File] as unknown as FileList);
    });

    expect(latest.photoAssets).toHaveLength(1);
    expect(latest.photoError).toContain("Compression impossible.");
    renderer.unmount();
  });

  it("rejects an unsupported format without adding or clearing photos", async () => {
    let latest!: MediaSnapshot;
    let renderer!: ReactTestRenderer;

    normalizeActionPhotosMock.mockResolvedValueOnce([{
      id: "photo-gif",
      name: "bilan.gif",
      mimeType: "image/gif",
      dataUrl: "data:image/gif;base64,AAA",
      size: 42,
      width: 120,
      height: 80,
    } satisfies ActionPhotoAsset]);

    act(() => {
      renderer = create(React.createElement(Harness, {
        onSnapshot: (snapshot) => { latest = snapshot; },
      }));
    });

    await act(async () => {
      await latest.handlePhotoUpload([{} as File] as unknown as FileList);
    });

    expect(latest.photoAssets).toHaveLength(0);
    expect(latest.photoError).toContain("Format photo non pris en charge");
    renderer.unmount();
  });
});
