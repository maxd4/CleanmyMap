import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountSettingsEditor, type AccountSettingsInitialData } from "./account-settings-editor";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const viewState = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }));

vi.mock("./account-settings-editor.view", () => ({
  AccountSettingsView: (props: Record<string, unknown>) => {
    viewState.current = props;
    return null;
  },
}));

const initialData: AccountSettingsInitialData = {
  firstName: "Marie",
  lastName: "Curie",
  email: "marie@example.com",
  imageUrl: null,
  handle: "marie_curie",
  displayNameMode: "full_name",
  locationPreferences: { residence: "Paris", work: "Lille" },
  activityStatus: "active",
  ageBand: "15_or_over",
};

function response(body: unknown, status = 200): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderEditor(): { renderer: ReactTestRenderer; props: () => Record<string, unknown> } {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(<AccountSettingsEditor locale="fr" initialData={initialData} />);
  });
  return { renderer, props: () => viewState.current as Record<string, unknown> };
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("AccountSettingsEditor behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    viewState.current = null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects blank identity locally and never sends an incomplete payload", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const editor = renderEditor();

    act(() => {
      (editor.props().setFirstName as (value: string) => void)("   ");
      (editor.props().setLastName as (value: string) => void)("");
    });
    await act(async () => {
      (editor.props().onSaveIdentity as () => void)();
      await flush();
    });

    expect(editor.props().identityState).toBe("error");
    expect(fetchMock).not.toHaveBeenCalled();
    editor.renderer.unmount();
  });

  it("keeps Clerk/Supabase synchronization pending distinct from a hard identity error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ status: "clerk_updated_supabase_sync_pending" }, 503));
    vi.stubGlobal("fetch", fetchMock);
    const editor = renderEditor();

    await act(async () => {
      (editor.props().onSaveIdentity as () => void)();
      await flush();
    });

    expect(editor.props().identityState).toBe("pending");
    expect(fetchMock).toHaveBeenCalledWith("/api/account/identity", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ firstName: "Marie", lastName: "Curie" }),
    }));
    editor.renderer.unmount();
  });

  it("classifies handle conflicts, validation responses and provider failures separately", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ error: "taken" }, 409))
      .mockResolvedValueOnce(response({ error: "invalid" }, 422))
      .mockResolvedValueOnce(response({ error: "unavailable" }, 503));
    vi.stubGlobal("fetch", fetchMock);
    const editor = renderEditor();

    await act(async () => {
      (editor.props().setHandle as (value: string) => void)("already_taken");
      (editor.props().onSaveHandle as () => void)();
      await flush();
    });
    expect(editor.props().handleError).toBe("conflict");

    await act(async () => {
      (editor.props().onSaveHandle as () => void)();
      await flush();
    });
    expect(editor.props().handleError).toBe("validation");

    await act(async () => {
      (editor.props().onSaveHandle as () => void)();
      await flush();
    });
    expect(editor.props().handleError).toBe("unavailable");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    editor.renderer.unmount();
  });

  it("keeps location states independent and accepts the requested age-band fallback", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ locationPreferences: { residence: "Paris", work: "Lille" } }))
      .mockResolvedValueOnce(response({ status: "clerk_updated_supabase_sync_pending" }, 503))
      .mockResolvedValueOnce(response(undefined))
      .mockResolvedValueOnce(response({ error: "unavailable" }, 503));
    vi.stubGlobal("fetch", fetchMock);
    const editor = renderEditor();

    await act(async () => {
      (editor.props().onSaveLocation as (kind: "residence" | "work") => void)("residence");
      await flush();
    });
    expect((editor.props().locationState as Record<string, string>).residence).toBe("saved");

    await act(async () => {
      (editor.props().onSaveLocation as (kind: "residence" | "work") => void)("work");
      await flush();
    });
    expect((editor.props().locationState as Record<string, string>).residence).toBe("saved");
    expect((editor.props().locationState as Record<string, string>).work).toBe("pending");

    await act(async () => {
      (editor.props().onSaveAgeBand as (value: "under_15" | "15_or_over" | "unknown") => void)("unknown");
      await flush();
    });
    expect(editor.props().ageBand).toBe("unknown");
    expect(editor.props().ageBandState).toBe("saved");

    await act(async () => {
      (editor.props().onSaveAgeBand as (value: "under_15" | "15_or_over" | "unknown") => void)("under_15");
      await flush();
    });
    expect(editor.props().ageBandState).toBe("error");
    editor.renderer.unmount();
  });
});
