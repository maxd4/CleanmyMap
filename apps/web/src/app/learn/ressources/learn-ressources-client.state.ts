"use client";

import { useState } from "react";
import type { SyntheticEvent } from "react";

export function useDisclosureState(defaultOpen = false) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleToggle = (event: SyntheticEvent<HTMLDetailsElement>) => {
    setIsOpen(event.currentTarget.open);
  };

  return {
    isOpen,
    handleToggle,
  };
}
