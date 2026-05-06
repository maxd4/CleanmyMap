import { registerEventHandlers } from "./handlers";

if (typeof window === "undefined") {
  try {
    registerEventHandlers();
  } catch (error) {
    console.error("[Events] Failed to register handlers:", error);
  }
}

export function initializeEventHandlers(): void {
  registerEventHandlers();
}