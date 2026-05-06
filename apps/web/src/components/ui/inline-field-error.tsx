"use client";

import { ErrorMessage } from "@/components/ui/error-message";

type InlineFieldErrorProps = {
  message: string;
  className?: string;
};

export function InlineFieldError({ message, className }: InlineFieldErrorProps) {
  return (
    <ErrorMessage
      kind="validation"
      dense
      message={message}
      className={className}
    />
  );
}
