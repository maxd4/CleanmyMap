export async function patchAction(payload: unknown, actionId = "action-test-1") {
  const { PATCH } = await import("@/app/api/actions/[actionId]/route");
  return PATCH(
    new Request(`http://localhost/api/actions/${actionId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
    { params: Promise.resolve({ actionId }) },
  );
}
