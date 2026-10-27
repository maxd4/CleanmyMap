import { beforeEach, describe, expect, it, vi } from "vitest";

const buildTrainingMock = vi.hoisted(() => vi.fn(() => ({ action_id: "a1" })));
const recordTrainingMock = vi.hoisted(() => vi.fn(async () => undefined));
const fetchByIdMock = vi.hoisted(() => vi.fn());
const fetchRowsMock = vi.hoisted(() => vi.fn());
const toContractMock = vi.hoisted(() => vi.fn((row: unknown) => row));
const evaluateMock = vi.hoisted(() => vi.fn(() => ({ id: "evaluation-1" })));
const persistEvaluationMock = vi.hoisted(() => vi.fn(async () => undefined));
const logFailureMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/training", () => ({ buildTrainingExampleInsert: buildTrainingMock, recordTrainingExample: recordTrainingMock }));
vi.mock("./store-queries", () => ({ fetchActionRowById: fetchByIdMock, fetchActionRows: fetchRowsMock }));
vi.mock("@/lib/actions/unified-source/contracts", () => ({ toActionContract: toContractMock }));
vi.mock("@/lib/actions/pollution/repollution-prediction-evaluation", () => ({ evaluateRepollutionPredictionBeforeObservation: evaluateMock }));
vi.mock("@/lib/actions/pollution/repollution-prediction-evaluation-store", () => ({ persistRepollutionPredictionEvaluation: persistEvaluationMock }));
vi.mock("@/lib/logging/failure-log", () => ({ logFailure: logFailureMock }));

import { recordCreateActionTrainingExample, recordRepollutionPredictionEvaluationForAction } from "./store-post-processing";

const payload = { actionDate: "2026-10-27", locationLabel: "Paris", wasteKg: 1, cigaretteButts: null, volunteersCount: 1, durationMinutes: 10 } as never;
const supabase = {} as never;

describe("action post-processing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildTrainingMock.mockReturnValue({ action_id: "a1" });
    recordTrainingMock.mockResolvedValue(undefined);
    fetchRowsMock.mockResolvedValue([]);
    evaluateMock.mockReturnValue({ id: "evaluation-1" });
    persistEvaluationMock.mockResolvedValue(undefined);
  });

  it("records training data best-effort and swallows a training dependency failure", async () => {
    await recordCreateActionTrainingExample(supabase, { actionId: "a1", payload });
    expect(buildTrainingMock).toHaveBeenCalledWith(expect.objectContaining({ actionId: "a1", realWeightKg: 1 }));
    expect(recordTrainingMock).toHaveBeenCalledWith(supabase, { action_id: "a1" });

    recordTrainingMock.mockRejectedValueOnce(new Error("training unavailable"));
    await expect(recordCreateActionTrainingExample(supabase, { actionId: "a1", payload })).resolves.toBeUndefined();
    expect(logFailureMock).toHaveBeenCalledWith("Actions/Create", expect.any(String), expect.any(Error), { actionId: "a1" });
  });

  it("does not evaluate absent or non-approved actions, then persists a bounded approved evaluation", async () => {
    fetchByIdMock.mockResolvedValueOnce(null);
    await recordRepollutionPredictionEvaluationForAction(supabase, "missing");
    expect(evaluateMock).not.toHaveBeenCalled();

    fetchByIdMock.mockResolvedValueOnce({ id: "a1", status: "pending" });
    await recordRepollutionPredictionEvaluationForAction(supabase, "a1");
    expect(evaluateMock).not.toHaveBeenCalled();

    const current = { id: "a1", status: "approved" };
    fetchByIdMock.mockResolvedValueOnce(current);
    fetchRowsMock.mockResolvedValueOnce([{ id: "a1" }, { id: "a2" }]);
    await recordRepollutionPredictionEvaluationForAction(supabase, "a1");
    expect(fetchRowsMock).toHaveBeenCalledWith(supabase, { limit: 1001, status: "approved", requireCoordinates: true });
    expect(evaluateMock).toHaveBeenCalledWith(expect.objectContaining({ newObservation: current, historyCompleteness: "partial" }));
    expect(persistEvaluationMock).toHaveBeenCalledWith(supabase, { id: "evaluation-1" });
  });

  it("keeps post-processing non-blocking when reads or writes fail", async () => {
    fetchByIdMock.mockRejectedValueOnce(new Error("read failed"));
    await expect(recordRepollutionPredictionEvaluationForAction(supabase, "a1")).resolves.toBeUndefined();
    expect(logFailureMock).toHaveBeenCalled();

    logFailureMock.mockClear();
    fetchByIdMock.mockResolvedValueOnce({ id: "a1", status: "approved" });
    persistEvaluationMock.mockRejectedValueOnce(new Error("write failed"));
    await expect(recordRepollutionPredictionEvaluationForAction(supabase, "a1")).resolves.toBeUndefined();
    expect(logFailureMock).toHaveBeenCalledWith("Actions/RepollutionEvaluation", expect.any(String), expect.any(Error), { actionId: "a1" });
  });
});
