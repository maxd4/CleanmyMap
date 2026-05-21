import { afterEach, beforeEach, describe, expect, it, vi } from"vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const resendSendMock = vi.hoisted(() => vi.fn());
const getResendClientMock = vi.hoisted(() => vi.fn());
const envMock = vi.hoisted(() => ({
 RESEND_API_KEY:"re_test_key",
 EMAIL_FROM:"CleanMyMap <contact@mail.cleanmymap.fr>" as string | undefined,
 CONTACT_EMAIL:"contact@cleanmymap.fr" as string | undefined,
 RESEND_TEST_TOKEN:"local-token" as string | undefined,
}));

vi.mock("@/lib/authz", () => ({
 requireAdminAccess: requireAdminAccessMock,
}));

vi.mock("@/lib/env", () => ({
 env: envMock,
}));

vi.mock("@/lib/services/resend", () => ({
 getResendClient: getResendClientMock,
}));

describe("POST /api/send", () => {
 beforeEach(() => {
 requireAdminAccessMock.mockResolvedValue({ ok: true });
 resendSendMock.mockResolvedValue({ data: { id:"email_123" }, error: null });
 getResendClientMock.mockReturnValue({
  emails: { send: resendSendMock },
 });
 envMock.EMAIL_FROM ="CleanMyMap <contact@mail.cleanmymap.fr>";
 envMock.CONTACT_EMAIL ="contact@cleanmymap.fr";
 envMock.RESEND_TEST_TOKEN ="local-token";
});

 afterEach(() => {
 vi.clearAllMocks();
 });

 it("sends a test email when test token is valid", async () => {
 const { POST } = await import("./route");
 const response = await POST(
 new Request("http://localhost/api/send", {
 method:"POST",
 headers: {
"content-type":"application/json",
"x-resend-test-token":"local-token",
 },
 body: JSON.stringify({
 to:"contact@cleanmymap.fr",
 subject:"Hello World",
 html:"<p>Test OK</p>",
 }),
 }),
 );

 const body = (await response.json()) as {
 ok?: boolean;
 id?: string;
 to?: string;
 };

 expect(response.status).toBe(200);
 expect(body.ok).toBe(true);
 expect(body.id).toBe("email_123");
 expect(body.to).toBe("contact@cleanmymap.fr");
 expect(resendSendMock).toHaveBeenCalledWith({
 from:"CleanMyMap <contact@mail.cleanmymap.fr>",
 to:"contact@cleanmymap.fr",
 subject:"Hello World",
 html:"<p>Test OK</p>",
 replyTo:"contact@cleanmymap.fr",
 });
 expect(requireAdminAccessMock).not.toHaveBeenCalled();
 });

 it("returns 503 when resend is not configured", async () => {
 const { POST } = await import("./route");
 envMock.EMAIL_FROM = undefined;
 envMock.CONTACT_EMAIL = undefined;

 const response = await POST(
 new Request("http://localhost/api/send", {
 method:"POST",
 headers: {
"x-resend-test-token":"local-token",
 },
 }),
 );

 const body = (await response.json()) as { error?: string };
 expect(response.status).toBe(503);
 expect(body.error).toBe("Resend not configured");
 });
});
