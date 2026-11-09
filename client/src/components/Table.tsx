import type { ReactNode } from "react";

/**
 * Dense data table (ui-spec §2.2). Column visibility per viewport is handled by
 * the caller with Tailwind responsive utilities (§2.4 tablet = reduced columns,
 * desktop = full columns). Header cells use th scope="col" (§2.5).
 */
export function Table({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-card border border-border bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-white">
          {header}
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

export function Th({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-left font-medium text-text-muted ${className}`}
    >
      {children}
    </th>
  );
}
