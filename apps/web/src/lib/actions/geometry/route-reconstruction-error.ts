export class ActionRouteReconstructionError extends Error {
  constructor(public readonly fieldErrors: Record<string, string[]>) {
    super("Action route could not be reconstructed.");
    this.name = "ActionRouteReconstructionError";
  }
}
