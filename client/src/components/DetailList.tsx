import type { ReactNode } from "react";

interface DetailItem {
  term: ReactNode;
  value: ReactNode;
}

/** Description list for item information — <dl>/<dt>/<dd> (ui-spec §3.5). */
export function DetailList({ items }: { items: DetailItem[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
      {items.map((item, index) => (
        <div key={index} className="contents">
          <dt className="font-medium text-text-muted">{item.term}</dt>
          <dd className="text-text">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
