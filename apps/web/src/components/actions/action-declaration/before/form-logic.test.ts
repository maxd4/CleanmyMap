import { describe, expect, it } from "vitest";
import { createInitialFormState } from "../payload";
import { buildBeforeActionPayload } from "./form-logic";

describe("pre-action identity payload", () => {
  it("sends the authenticated creator label and distinct organizer/participant ids", () => {
    const form = createInitialFormState("legacy-alias", "action");
    form.associationName = "Association locale";
    form.organizerType = "association";
    form.organizerAccounts = "user-organizer, user-organizer";
    form.participantAccounts = ["user-participant", "user-participant"];

    const payload = buildBeforeActionPayload({
      form,
      userMetadata: {
        userId: "user-creator",
        displayName: "Maxence",
        handle: "maxence_deroome",
      },
    });

    expect(payload.actorName).toBe("Maxence");
    expect(payload.organizerAccounts).toEqual(["user-organizer"]);
    expect(payload.participantAccounts).toEqual(["user-participant"]);
  });
});
