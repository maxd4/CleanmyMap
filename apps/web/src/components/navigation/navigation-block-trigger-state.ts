export function getNavigationBlockTriggerStateClassName({
  isActiveSpace,
  isOpen,
}: {
  isActiveSpace: boolean;
  isOpen: boolean;
}): string {
  if (isOpen) {
    return "bg-white/[0.16] text-white";
  }

  if (isActiveSpace) {
    return "bg-white/[0.08] text-white hover:bg-white/[0.13]";
  }

  return "text-white hover:bg-white/[0.16] hover:text-white";
}

export function resolveOpenNavigationSpaceId<T extends string>(
  currentSpaceId: T | null,
  nextSpaceId: T,
  open: boolean,
): T | null {
  if (open) {
    return nextSpaceId;
  }

  return currentSpaceId === nextSpaceId ? null : currentSpaceId;
}
