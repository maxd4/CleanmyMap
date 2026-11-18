"use client";

import { CmmButton } from "@/components/ui/cmm-button";

export function PrintActionButton() {
  return (
    <CmmButton
      tone="primary"
      size="md"
      onClick={() => {
        if (typeof window !== "undefined") {
          window.print();
        }
      }}
      className="gap-2"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M5 2.75C5 1.784 5.784 1 6.75 1h6.5c.966 0 1.75.784 1.75 1.75v3.5A1.75 1.75 0 0 1 16.75 8H17a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1.25a.75.75 0 0 1 0-1.5H17a.5.5 0 0 0 .5-.5v-5a.5.5 0 0 0-.5-.5H3a.5.5 0 0 0-.5.5v5a.5.5 0 0 0 .5.5h1.25a.75.75 0 0 1 0 1.5H3a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h.25A1.75 1.75 0 0 1 5 6.25v-3.5Zm1.5 0v3.5c0 .138.112.25.25.25h6.5a.25.25 0 0 0 .25-.25v-3.5a.25.25 0 0 0-.25-.25h-6.5a.25.25 0 0 0-.25.25ZM5 12.25A1.75 1.75 0 0 1 6.75 10.5h6.5A1.75 1.75 0 0 1 15 12.25v4.5A1.75 1.75 0 0 1 13.25 18.5h-6.5A1.75 1.75 0 0 1 5 16.75v-4.5Zm1.5.25v4.25c0 .138.112.25.25.25h6.5a.25.25 0 0 0 .25-.25V12.5a.25.25 0 0 0-.25-.25h-6.5a.25.25 0 0 0-.25.25Z"
          clipRule="evenodd"
        />
      </svg>
      Imprimer / Enregistrer en PDF
    </CmmButton>
  );
}
