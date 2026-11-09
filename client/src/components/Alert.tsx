import type { ReactNode } from "react";

type Tone = "danger" | "warning" | "success" | "info";

interface AlertProps {
  tone: Tone;
  children: ReactNode;
  /** Shown as small muted text — safe request id only (never raw server text). */
  requestId?: string;
  /** Failure alerts use role="alert"; confirmations use role="status" (ui-spec §1.5/§3.5). */
  role?: "alert" | "status";
}

const tones: Record<Tone, string> = {
  danger: "border-danger/40 bg-danger/10 text-danger",
  warning: "border-warning/40 bg-warning/10 text-warning",
  success: "border-success/40 bg-success/10 text-success",
  info: "border-border bg-white text-text",
};

const defaultRole: Record<Tone, "alert" | "status"> = {
  danger: "alert",
  warning: "alert",
  success: "status",
  info: "status",
};

export function Alert({ tone, children, requestId, role }: AlertProps) {
  return (
    <div
      role={role ?? defaultRole[tone]}
      className={`rounded-control border px-4 py-3 text-sm ${tones[tone]}`}
    >
      <div>{children}</div>
      {requestId ? <p className="mt-1 text-xs text-text-muted">Request ID: {requestId}</p> : null}
    </div>
  );
}
