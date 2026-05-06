import { describe, it, expect } from"vitest";
import {
  unauthorizedJsonResponse,
  forbiddenJsonResponse,
  adminAccessErrorJsonResponse,
} from"@/lib/http/auth-responses";

/**
 * Non-regression tests for standardized auth error responses.
 * Ensures the JSON structure is consistent across 401 & 403.
 */
describe("Auth Response Helpers", () => {
  describe("unauthorizedJsonResponse", () => {
    it("returns 401 with standardized JSON structure", async () => {
      const response = unauthorizedJsonResponse();
      expect(response.status).toBe(401);

      const json = await response.json();
      expect(json).toMatchObject({
        error: expect.any(String),
        code:"unauthorized",
        hint: expect.any(String),
        referenceCode: expect.any(String),
      });
    });

    it("uses custom hint and operationId when provided", async () => {
      const response = unauthorizedJsonResponse({
        hint:"Custom hint",
        operationId:"op-123",
      });
      const json = await response.json();
      expect(json.hint).toBe("Custom hint");
      expect(json.referenceCode).toBe("AUTH-op-123".slice(0, 12));
    });
  });

  describe("forbiddenJsonResponse", () => {
    it("returns 403 with standardized JSON structure", async () => {
      const response = forbiddenJsonResponse();
      expect(response.status).toBe(403);

      const json = await response.json();
      expect(json).toMatchObject({
        error: expect.any(String),
        code:"forbidden",
        hint: expect.any(String),
        referenceCode: expect.any(String),
      });
    });

    it("uses custom hint and operationId when provided", async () => {
      const response = forbiddenJsonResponse({
        hint:"Pas admin",
        operationId:"op-456",
      });
      const json = await response.json();
      expect(json.hint).toBe("Pas admin");
      expect(json.referenceCode).toBe("FRB-op-456".slice(0, 12));
    });
  });

  describe("adminAccessErrorJsonResponse", () => {
    it("returns 401 for status 401", async () => {
      const response = adminAccessErrorJsonResponse(
        { ok: false, status: 401, error:"Unauthorized" },
        "op-789",
      );
      expect(response.status).toBe(401);

      const json = await response.json();
      expect(json.code).toBe("unauthorized");
      expect(json.referenceCode).toBe("AUTH-op-789".slice(0, 12));
    });

    it("returns 403 for status 403", async () => {
      const response = adminAccessErrorJsonResponse(
        { ok: false, status: 403, error:"Forbidden" },
        "op-abc",
      );
      expect(response.status).toBe(403);

      const json = await response.json();
      expect(json.code).toBe("forbidden");
      expect(json.referenceCode).toBe("FRB-op-abc".slice(0, 12));
    });

    it("generates referenceCode when operationId not provided", async () => {
      const response = adminAccessErrorJsonResponse({
        ok: false,
        status: 401,
        error:"Unauthorized",
      });
      const json = await response.json();
      expect(json.referenceCode).toBeTruthy();
      expect(typeof json.referenceCode).toBe("string");
      expect(json.referenceCode.startsWith("AUTH-")).toBe(true);
    });
  });
});
