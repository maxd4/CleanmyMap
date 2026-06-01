type PolicyDocument = Document & {
  permissionsPolicy?: {
    allowsFeature(feature: string): boolean;
  };
  featurePolicy?: {
    allowsFeature(feature: string): boolean;
  };
};

export function canRequestGeolocation(): boolean {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    return false;
  }

  if (typeof document !== "undefined") {
    const policy = document as PolicyDocument;
    const permissionsPolicy = policy.permissionsPolicy ?? policy.featurePolicy;
    if (permissionsPolicy && typeof permissionsPolicy.allowsFeature === "function") {
      try {
        return permissionsPolicy.allowsFeature("geolocation");
      } catch {
        return false;
      }
    }
  }

  return true;
}
