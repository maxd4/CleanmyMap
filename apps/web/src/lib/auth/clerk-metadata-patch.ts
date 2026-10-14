type MetadataRecord = Record<string, unknown>;

function sameMetadataValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => sameMetadataValue(value, right[index]));
  }
  if (
    left === null
    || right === null
    || typeof left !== "object"
    || typeof right !== "object"
  ) {
    return false;
  }

  const leftRecord = left as MetadataRecord;
  const rightRecord = right as MetadataRecord;
  const leftKeys = Object.keys(leftRecord);
  const rightKeys = Object.keys(rightRecord);
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key) => Object.hasOwn(rightRecord, key)
      && sameMetadataValue(leftRecord[key], rightRecord[key]));
}

/** Build a targeted Clerk metadata mutation without replacing unrelated keys. */
export function buildClerkMetadataPatch(
  current: MetadataRecord | null | undefined,
  next: MetadataRecord,
): MetadataRecord {
  const currentRecord = current ?? {};
  const patch: MetadataRecord = {};

  for (const [key, value] of Object.entries(next)) {
    if (!sameMetadataValue(currentRecord[key], value)) {
      patch[key] = value;
    }
  }

  for (const key of Object.keys(currentRecord)) {
    if (!Object.hasOwn(next, key)) {
      patch[key] = null;
    }
  }

  return patch;
}
