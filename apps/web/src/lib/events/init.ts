import { registerEventHandlers } from "./handlers";
import { logFailure } from "@/lib/logging/failure-log";

if (typeof window === "undefined") {
  try {
    registerEventHandlers();
  } catch (error) {
    logFailure("Events", "Handler registration failed", error);
  }
}

export function initializeEventHandlers(): void {
  registerEventHandlers();
}
