import { Link } from "react-router-dom";
import type { Equipment } from "../lib/api";
import { itemPath } from "../lib/paths";
import { AvailabilityBadge } from "./AvailabilityBadge";
import { EquipmentImage } from "./EquipmentImage";
import { CatalogStatusBadge } from "./StatusBadge";

/**
 * Mobile list card for catalog items (ui-spec §2.2/§2.4).
 * Includes equipment preview thumbnail and clear affordance to open details.
 */
export function ItemCard({ item }: { item: Equipment }) {
  return (
    <Link
      to={itemPath(item.id)}
      aria-label={`View ${item.name}`}
      className="block rounded-card border border-border bg-white p-4 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start gap-3">
        <EquipmentImage imageUrl={item.image_url} name={item.name} category={item.category} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-base font-medium text-text">{item.name}</h3>
              {item.catalog_status === "RETIRED" ? <CatalogStatusBadge status="RETIRED" /> : null}
            </div>
            <AvailabilityBadge availability={item.availability} />
          </div>
          <p className="mt-1 text-sm text-text-muted">{item.category}</p>
          <p className="mt-2 text-sm text-text">
            <strong>{item.quantity_available}</strong> available of {item.quantity_total} total
          </p>
        </div>
      </div>
    </Link>
  );
}
