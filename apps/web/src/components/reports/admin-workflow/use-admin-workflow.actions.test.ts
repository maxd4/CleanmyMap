import { describe, expect, it, vi } from"vitest";
import { ModerationClientError, postAdminModeration } from"@/lib/admin/moderation-client";
import { runImportConfirm, runImportDryRun } from"./services";
import {
 createAdminWorkflowActions,
 type AdminWorkflowActionState,
} from"./actions";

vi.mock("./services", async () => {
 const actual = await vi.importActual<typeof import("./services")>("./services");
 return {
 ...actual,
 downloadFromUrl: vi.fn(),
 runImportConfirm: vi.fn(),
 runImportDryRun: vi.fn(),
 triggerBrowserDownload: vi.fn(),
 };
});

vi.mock("@/lib/admin/moderation-client", async () => {
 const actual = await vi.importActual<
 typeof import("@/lib/admin/moderation-client")
 >("@/lib/admin/moderation-client");
 return {
 ...actual,
 postAdminModeration: vi.fn(),
 };
});

function createState(
 overrides: Partial<AdminWorkflowActionState> = {},
): AdminWorkflowActionState {
 return {
 setCsvState: vi.fn(),
 setJsonState: vi.fn(),
 setImportState: vi.fn(),
 setImportDryRunState: vi.fn(),
 setModerationState: vi.fn(),
 setErrorMessage: vi.fn(),
 setLastSuccessMessage: vi.fn(),
 importPayload: '{"items":[]}',
 setImportPreview: vi.fn(),
 setImportPreviewSignature: vi.fn(),
 setImportConfirmationText: vi.fn(),
 canConfirmImport: true,
 importPreview: {
 status:"dry_run",
 count: 1,
 dryRunProof: {
 token:"token-1",
 expiresAt:"2026-04-20T00:00:00.000Z",
 payloadHash:"hash-1",
 },
 stats: {
 withCoordinates: 1,
 missingCoordinates: 0,
 totalWasteKg: 1,
 totalButts: 0,
 totalVolunteers: 1,
 dateMin:"2026-04-01",
 dateMax:"2026-04-01",
 },
 },
 importConfirmationText:"CONFIRMER IMPORT",
 moderationEntityType:"action",
 moderationId:"action-1",
 actionStatus:"approved",
 cleanPlaceStatus:"validated",
 moderationConfirmed: true,
 moderationConfirmationText:"CONFIRMER MODERATION",
 actionEditDraft: null,
 cleanPlaceEditDraft: null,
 setModerationResult: vi.fn(),
 resetModerationConfirmationState: vi.fn(),
 pushModerationJournal: vi.fn(),
 ...overrides,
 };
}

describe("admin workflow actions", () => {
 it("surfaces dry-run errors in state", async () => {
 vi.mocked(runImportDryRun).mockRejectedValueOnce(new Error("Dry-run invalide."));
 const state = createState();
 const actions = createAdminWorkflowActions({
 state,
 csvExportUrl:"/api/reports/actions.csv",
 jsonExportUrl:"/api/reports/actions.json",
 mutatePreview: vi.fn(),
 });

 await actions.onImportDryRun();

 expect(state.setImportDryRunState).toHaveBeenNthCalledWith(1,"pending");
 expect(state.setImportDryRunState).toHaveBeenLastCalledWith("error");
 expect(state.setErrorMessage).toHaveBeenLastCalledWith("Dry-run invalide.");
 });

 it("blocks import confirmation when dry-run confirmation is missing", async () => {
 const state = createState({ canConfirmImport: false });
 const actions = createAdminWorkflowActions({
 state,
 csvExportUrl:"/api/reports/actions.csv",
 jsonExportUrl:"/api/reports/actions.json",
 mutatePreview: vi.fn(),
 });

 await actions.onImportPastActions();

 expect(state.setImportState).toHaveBeenCalledWith("error");
 expect(state.setErrorMessage).toHaveBeenLastCalledWith(
"Lance d'abord un dry-run valide avant de confirmer l'import.",
 );
 expect(runImportConfirm).not.toHaveBeenCalled();
 });

 it("maps moderation permission errors to an actionable message", async () => {
 vi.mocked(postAdminModeration).mockRejectedValueOnce(
 new ModerationClientError({
 code:"permission_denied",
 message:"forbidden",
 status: 403,
 }),
 );
 const state = createState();
 const actions = createAdminWorkflowActions({
 state,
 csvExportUrl:"/api/reports/actions.csv",
 jsonExportUrl:"/api/reports/actions.json",
 mutatePreview: vi.fn(),
 });

 await actions.onModerateEntity();

 expect(state.setModerationState).toHaveBeenNthCalledWith(1,"pending");
 expect(state.setModerationState).toHaveBeenLastCalledWith("error");
 expect(state.setErrorMessage).toHaveBeenLastCalledWith(
"Acces admin requis (forbidden).",
 );
 expect(state.pushModerationJournal).toHaveBeenCalledWith(
 expect.objectContaining({
 outcome:"error",
 id:"action-1",
 }),
 );
 });

 it("sends selected form field corrections with moderation", async () => {
 vi.mocked(postAdminModeration).mockResolvedValueOnce({
 status:"ok",
 entityType:"action",
 id:"action-1",
 });
 const state = createState({
 actionEditDraft: {
 actorName:"Marie Admin",
 associationName:"Action spontanée",
 actionDate:"2026-04-22",
 locationLabel:"Canal Saint-Martin",
 departureLocationLabel:"Départ",
 arrivalLocationLabel:"Arrivée",
 routeStyle:"souple",
 routeAdjustmentMessage:"",
 latitude:"48.87",
 longitude:"2.36",
 wasteKg:"3.2",
 cigaretteButts:"120",
 volunteersCount:"4",
 durationMinutes:"75",
 notes:"Corrigé par admin",
 placeType:"Canal",
 submissionMode:"complete",
 wasteMegotsKg:"0.4",
 wasteMegotsCondition:"humide",
 wastePlastiqueKg:"1",
 wasteVerreKg:"",
 wasteMetalKg:"",
 wasteMixteKg:"",
 triQuality:"moyenne",
 manualDrawingJson:"",
 },
 });
 const actions = createAdminWorkflowActions({
 state,
 csvExportUrl:"/api/reports/actions.csv",
 jsonExportUrl:"/api/reports/actions.json",
 mutatePreview: vi.fn(),
 });

 await actions.onModerateEntity();

 expect(postAdminModeration).toHaveBeenCalledWith(
 expect.objectContaining({
 entityType:"action",
 id:"action-1",
 status:"approved",
 edits: expect.objectContaining({
 actionDate:"2026-04-22",
 locationLabel:"Canal Saint-Martin",
 wasteKg: 3.2,
 wasteBreakdown: expect.objectContaining({
 megotsKg: 0.4,
 megotsCondition:"humide",
 plastiqueKg: 1,
 }),
 }),
 }),
 );
 });
});
