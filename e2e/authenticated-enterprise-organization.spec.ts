import { createClerkClient } from "@clerk/backend";
import { clerk } from "@clerk/testing/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  buildTemporaryEmail,
  createTemporaryMetadata,
  isOwnedTemporaryUser,
  TEMPORARY_OWNER,
} from "./clerk-lifecycle.mjs";

type ManagedUser = { version: 1; owner: string; lifecycle: string; userId: string; runId: string };

const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
const managedMemberFile = "artifacts/playwright/clerk/enterprise-organization-member.json";

function assertEphemeralTarget(): void {
  if (
    process.env.CMM_SUPABASE_TEST_ENVIRONMENT !== "ephemeral" ||
    process.env.CMM_SUPABASE_EPHEMERAL_TEST_AUTHORIZATION !== "I_UNDERSTAND_EPHEMERAL_ONLY"
  ) throw new Error("Organization E2E fixtures require the authorized ephemeral Supabase lane.");

  const configuredUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const hostname = new URL(configuredUrl).hostname;
  if (hostname !== "127.0.0.1" && hostname !== "localhost") {
    throw new Error("Organization E2E fixtures refused a non-local Supabase target.");
  }
}

function queryEphemeralDatabase(sql: string): void {
  assertEphemeralTarget();
  const executable = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(executable, [
    "supabase", "db", "query", "--workdir", "apps/web", "--local", sql,
  ], { cwd: process.cwd(), encoding: "utf8", shell: false, windowsHide: true });
  if (result.status !== 0) throw new Error("Synthetic organization fixture operation failed in ephemeral PostgreSQL.");
}

async function readManagedPrimary(): Promise<ManagedUser> {
  const raw = await readFile("artifacts/playwright/clerk/managed-user.json", "utf8");
  const parsed = JSON.parse(raw) as ManagedUser;
  if (
    parsed.version !== 1 || parsed.owner !== TEMPORARY_OWNER || parsed.lifecycle !== "TEMPORARY" ||
    !parsed.userId || !parsed.runId
  ) throw new Error("Organization E2E requires the harness-owned temporary Clerk account.");
  return parsed;
}

async function signIn(page: Page, emailAddress: string): Promise<void> {
  await page.goto("/");
  await clerk.signIn({ page, emailAddress });
  await page.waitForFunction(() => Boolean(window.Clerk?.user && window.Clerk?.session));
}

test("two Clerk Development accounts share only their authorized organization workspace", async ({ page, browser }) => {
  assertEphemeralTarget();
  const primary = await readManagedPrimary();
  const backendToken = process.env.CMM_E2E_CLERK_DEV_BACKEND_TOKEN;
  if (!backendToken?.startsWith("sk_test_")) throw new Error("Organization E2E requires Clerk Development credentials.");

  const client = createClerkClient({ secretKey: backendToken });
  const secondRunId = `${primary.runId}-member-${randomUUID()}`;
  const memberEmail = buildTemporaryEmail(secondRunId);
  const primaryEmail = buildTemporaryEmail(primary.runId);
  const orgId = randomUUID();
  const requestId = randomUUID();
  const entryId = `e2e-org-${randomUUID()}`;
  const organizerRef = `e2e-company-${randomUUID()}`;
  let memberId = "";
  let memberContext: BrowserContext | null = null;

  try {
    const primaryAccount = await client.users.getUser(primary.userId);
    await client.users.updateUserMetadata(primary.userId, {
      publicMetadata: {
        ...primaryAccount.publicMetadata,
        role: "benevole",
        activeRole: "benevole",
        profileSetupCompleted: true,
        profileSetupVersion: 2,
      },
    });
    const member = await client.users.createUser({
      emailAddress: [memberEmail],
      firstName: "E2E",
      lastName: "Collaborateur",
      skipPasswordRequirement: true,
      publicMetadata: {
        cleanmymapE2E: true,
        cleanmymapOwner: TEMPORARY_OWNER,
        cleanmymapLifecycle: "TEMPORARY",
        profileSetupCompleted: true,
        profileSetupVersion: 2,
      },
    });
    memberId = member.id;
    await writeFile(
      managedMemberFile,
      JSON.stringify(createTemporaryMetadata({ userId: memberId, runId: secondRunId })),
      { encoding: "utf8", mode: 0o600 },
    );

    const sql = `
      begin;
      insert into public.partner_onboarding_requests (
        id,submitted_by_user_id,organization_name,organization_type,legal_identity,
        contact_name,contact_channel,contact_details,motivation,status,creator_state
      ) values (
        ${quote(requestId)},${quote(primary.userId)},'E2E Synthetic Organization','entreprise',${quote(organizerRef)},
        'Synthetic contact','email','e2e@example.invalid','Ephemeral browser test','accepted','accepted'
      );
      insert into public.partner_annuaire_entries (
        id,source_request_id,publication_status,reviewed_at,reviewed_by_user_id,public_data
      ) values (${quote(entryId)},${quote(requestId)},'accepted',now(),'e2e-reviewer','{"name":"E2E Synthetic Organization"}');
      insert into public.organizations (id,partner_entry_id,organizer_ref,verified_by_clerk_id)
      values (${quote(orgId)}::uuid,${quote(entryId)},${quote(organizerRef)},${quote(primary.userId)});
      insert into public.organization_memberships (organization_id,clerk_user_id,member_role,state)
      values (${quote(orgId)}::uuid,${quote(primary.userId)},'owner','active');
      commit;
    `;
    queryEphemeralDatabase(sql);

    await signIn(page, primaryEmail);
    await page.goto("/dashboard");
    const workspaceLink = page.getByRole("link", { name: /Espace entreprise|Organization workspace/ });
    await expect(workspaceLink).toBeVisible();
    await workspaceLink.click();
    await expect(page.getByText(/Mon équipe|My team/)).toBeVisible();
    await expect(page.getByText(/Rôle actif : Bénévole|Active role: Volunteer/i)).toBeVisible();

    memberContext = await browser.newContext();
    const memberPage = await memberContext.newPage();
    await signIn(memberPage, memberEmail);

    await page.locator('input[type="email"]').fill(memberEmail);
    await page.getByRole("button", { name: /Inviter|Invite/ }).click();
    await expect(page.getByText(/Compte sans nom.*(Membre|Member).*pending/)).toBeVisible();

    await memberPage.goto("/dashboard");
    const memberWorkspaceLink = memberPage.getByRole("link", { name: /Espace entreprise|Organization workspace/ });
    await expect(memberWorkspaceLink).toBeVisible();
    await memberWorkspaceLink.click();
    await expect(memberPage.getByText(/invitation \(|invitation \(/i)).toBeVisible();
    await memberPage.getByRole("button", { name: /Accepter|Accept/ }).click();
    await expect(memberPage.getByText(/Mon équipe|My team/)).toBeVisible();
    await expect(memberPage.locator('input[type="email"]')).toHaveCount(0);
    await expect(memberPage.getByText(new RegExp(memberId, "i"))).toHaveCount(0);
    const forbiddenInviteStatus = await memberPage.evaluate(async ({ organizationId, email }) => {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          requestId: crypto.randomUUID(),
          operation: "invite",
          targetEmail: email,
          role: "member",
          siteId: null,
        }),
      });
      return response.status;
    }, { organizationId: orgId, email: `unauthorized-${secondRunId}@example.invalid` });
    expect(forbiddenInviteStatus).toBe(403);

    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  } finally {
    await memberContext?.close().catch(() => undefined);
    if (memberId) {
      const member = await client.users.getUser(memberId).catch(() => null);
      if (isOwnedTemporaryUser(createTemporaryMetadata({ userId: memberId, runId: secondRunId }), member)) {
        await client.users.deleteUser(memberId).catch(() => undefined);
      }
    }
    await unlink(managedMemberFile).catch(() => undefined);
    queryEphemeralDatabase(`
      begin;
      delete from public.organization_audit where organization_id=${quote(orgId)}::uuid;
      delete from public.organization_campaign_actions where organization_id=${quote(orgId)}::uuid;
      delete from public.organization_campaigns where organization_id=${quote(orgId)}::uuid;
      delete from public.action_organizations where organization_id=${quote(orgId)}::uuid;
      delete from public.organization_sites where organization_id=${quote(orgId)}::uuid;
      delete from public.organization_memberships where organization_id=${quote(orgId)}::uuid;
      delete from public.organizations where id=${quote(orgId)}::uuid;
      delete from public.partner_annuaire_entries where id=${quote(entryId)};
      delete from public.partner_onboarding_requests where id=${quote(requestId)};
      commit;
    `);
  }
});
