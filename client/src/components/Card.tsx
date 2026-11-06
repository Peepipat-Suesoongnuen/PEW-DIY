import type { ReactNode } from "react";

export function Card({
  title,
  children,
  className = "",
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-card border border-border bg-white p-6 shadow-sm ${className}`}
    >
      {title ? <h2 className="mb-4 text-lg font-semibold text-text">{title}</h2> : null}
      {children}
    </section>
  );
}
