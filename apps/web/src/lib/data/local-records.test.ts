import { describe, expect, it } from "vitest";
import {
  isLocalRecordStatus,
  mapActionStatusToLocalStatus,
  mapLocalStatusToActionStatus,
} from "./local-records";

describe("local records status mapping", () => {
  it("maps action statuses to local statuses", () => {
    expect(mapActionStatusToLocalStatus("approved")).toBe("validated");
    expect(mapActionStatusToLocalStatus("rejected")).toBe("rejected");
    expect(mapActionStatusToLocalStatus("pending")).toBe("pending");
    expect(mapActionStatusToLocalStatus("anything-else")).toBe("pending");
  });

  it("maps local statuses to action statuses", () => {
    expect(mapLocalStatusToActionStatus("validated")).toBe("approved");
    expect(mapLocalStatusToActionStatus("rejected")).toBe("rejected");
    expect(mapLocalStatusToActionStatus("pending")).toBe("pending");
    expect(mapLocalStatusToActionStatus("test")).toBe("pending");
  });

  it("validates local status values", () => {
    expect(isLocalRecordStatus("validated")).toBe(true);
    expect(isLocalRecordStatus("pending")).toBe(true);
    expect(isLocalRecordStatus("approved")).toBe(false);
  });
});
