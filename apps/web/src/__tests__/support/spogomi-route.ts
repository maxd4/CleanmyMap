export function requireSpogomiResponse(response: Response | undefined): Response {
  if (!response) throw new Error("Expected a Spogomi route response");
  return response;
}

export function spogomiEventParams(eventId: string): { params: Promise<{ eventId: string }> } {
  return { params: Promise.resolve({ eventId }) };
}
