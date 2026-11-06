/**
 * Availability badge + Quantity Tracking display (ui-spec §2.2/§3.2).
 *
 * Component handoff for #10 (F-03, UI-02 AC-11):
 * - AvailabilityBadge renders the `availability` API field as text + color
 *   (never color alone). Values: "AVAILABLE" | "UNAVAILABLE".
 * - QuantityDisplay renders quantity_available / quantity_total ("Quantity
 *   Tracking", SRS A-01).
 * - Both are pure display: pass the server-computed fields unchanged; F-03
 *   owns the computation and post-checkout updates (ui-02-evidence.md
 *   "Component Handoff" section documents props + usage).
 */

interface AvailabilityBadgeProps {
  availability: "AVAILABLE" | "UNAVAILABLE";
}

export function AvailabilityBadge({ availability }: AvailabilityBadgeProps) {
  const available = availability === "AVAILABLE";
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " +
        (available ? "bg-success/10 text-success" : "bg-danger/10 text-danger")
      }
    >
      {available ? "AVAILABLE" : "UNAVAILABLE"}
    </span>
  );
}

interface QuantityDisplayProps {
  available: number;
  total: number;
}

export function QuantityDisplay({ available, total }: QuantityDisplayProps) {
  return (
    <span>
      <strong>{available}</strong> available of {total} total
    </span>
  );
}
