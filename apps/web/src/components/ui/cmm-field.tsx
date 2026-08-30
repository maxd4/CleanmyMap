import {
  cloneElement,
  isValidElement,
  useId,
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type CmmFieldControlProps = {
  id?: string;
  className?: string;
  required?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
  "aria-required"?: boolean | "true" | "false";
};

export type CmmFieldProps = {
  children: ReactElement<CmmFieldControlProps>;
  label: ReactNode;
  id?: string;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
};

function hasMessage(message: ReactNode): boolean {
  return message !== undefined && message !== null && message !== false && message !== "";
}

function joinDescribedBy(...ids: Array<string | undefined>): string | undefined {
  const values = ids.flatMap((value) => value?.split(/\s+/) ?? []).filter(Boolean);
  return values.length > 0 ? Array.from(new Set(values)).join(" ") : undefined;
}

function getControlId(id: string | undefined, childId: string | undefined, fallbackId: string): string {
  return id ?? childId ?? fallbackId;
}

export function CmmField({
  children,
  label,
  id,
  required = false,
  hint,
  error,
  className,
}: CmmFieldProps) {
  if (!isValidElement<CmmFieldControlProps>(children)) {
    throw new Error("CmmField expects one form control element as its child.");
  }

  const generatedId = `cmm-field-${useId().replace(/:/g, "")}`;
  const controlId = getControlId(id, children.props.id, generatedId);
  const hintId = hasMessage(hint) ? `${controlId}-hint` : undefined;
  const errorId = hasMessage(error) ? `${controlId}-error` : undefined;
  const describedBy = joinDescribedBy(children.props["aria-describedby"], hintId, errorId);
  const hasError = hasMessage(error);

  const control = cloneElement(children, {
    id: controlId,
    required: required || children.props.required || undefined,
    "aria-required": required || children.props["aria-required"] || undefined,
    "aria-invalid": hasError || children.props["aria-invalid"] || undefined,
    "aria-describedby": describedBy,
  });

  return (
    <div className={cn("cmm-field", className)}>
      <label className="cmm-field-label" htmlFor={controlId}>
        {label}
        {required ? <span className="cmm-field-required"> (requis)</span> : null}
      </label>
      {control}
      {hintId ? (
        <p className="cmm-field-hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {errorId ? (
        <p className="cmm-field-error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type CmmInputProps = ComponentPropsWithoutRef<"input">;
type CmmSelectProps = ComponentPropsWithoutRef<"select">;
type CmmTextareaProps = ComponentPropsWithoutRef<"textarea">;

function controlClassName(className: string | undefined): string {
  return cn("cmm-field-control", className);
}

export const CmmInput = forwardRef<HTMLInputElement, CmmInputProps>(function CmmInput(
  { className, ...props },
  ref,
) {
  return (
    <input
      {...props}
      ref={ref}
      className={controlClassName(className)}
      data-cmm-field-control="input"
    />
  );
});

export const CmmSelect = forwardRef<HTMLSelectElement, CmmSelectProps>(function CmmSelect(
  { className, ...props },
  ref,
) {
  return (
    <select
      {...props}
      ref={ref}
      className={controlClassName(className)}
      data-cmm-field-control="select"
    />
  );
});

export const CmmTextarea = forwardRef<HTMLTextAreaElement, CmmTextareaProps>(function CmmTextarea(
  { className, ...props },
  ref,
) {
  return (
    <textarea
      {...props}
      ref={ref}
      className={controlClassName(className)}
      data-cmm-field-control="textarea"
    />
  );
});
