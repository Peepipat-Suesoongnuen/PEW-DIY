import { Link } from "react-router-dom";
import type { Equipment } from "../lib/api";
import { AvailabilityBadge } from "./AvailabilityBadge";

/**
 * Mobile list card for catalog items (ui-spec §2.2/§2.4: name, category,
 * badge, available/total). The whole card is the detail target (decision C-4)
 * with accessible name "View {item name}" (§2.5).
 */
export function ItemCard({ item }: { item: Equipment }) {
  return (
    <Link
      to={`/items/${item.id}`}
      aria-label={`View ${item.name}`}
      className="block rounded-card border border-border bg-white p-4 hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-medium text-text">{item.name}</h3>
        <AvailabilityBadge availability={item.availability} />
      </div>
      <p className="mt-1 text-sm text-text-muted">{item.category}</p>
      <p className="mt-2 text-sm text-text">
        <strong>{item.quantity_available}</strong> available of {item.quantity_total} total
      </p>
    </Link>
  );
}
