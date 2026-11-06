import type { InputHTMLAttributes, ReactNode } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  error?: string | null;
  children?: ReactNode;
}

/**
 * Input + Label + FieldError (ui-spec §0.2 vocabulary). Error messages are
 * linked via aria-describedby (ui-spec §1.5); safe input is preserved by the
 * caller, the password value must never be re-rendered (f-01 §2.3).
 */
export function Field({ label, id, error, children, ...rest }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={
            "h-11 w-full rounded-control border border-border bg-white px-3 text-base text-text " +
            "placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-offset-1 " +
            "focus-visible:outline-primary disabled:bg-white/50"
          }
          {...rest}
        />
        {children}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
