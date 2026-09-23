"use client";

import { useState } from "react";

export function ClientBoundary() {
  const [ready] = useState(true);
  return <span>{String(ready)}</span>;
}
