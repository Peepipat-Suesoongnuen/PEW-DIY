import type { ReactNode } from "react";

/** Dedicated empty state — never a generic error (f-02 §3, ui-spec §0.3). */
export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-white px-6 py-12 text-center">
      <p className="text-base text-text-muted">{message}</p>
      {action}
    </div>
  );
}
