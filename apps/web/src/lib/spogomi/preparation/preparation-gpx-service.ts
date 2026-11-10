/**
 * Compatibility entry point for callers that still import the historical GPX
 * service. The division-aware route service is the single mutation owner.
 */
export { attachOfficialGpx } from "./preparation-route-service";
