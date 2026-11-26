/** Short 8-char human-friendly reference code derived from a UUID/opaque ID. */
export function shortRef(id: string): string {
  const clean = id.replace(/[^a-zA-Z0-9]/g, "");
  return `#${(clean.slice(0, 8) || id.slice(0, 8)).toUpperCase()}`;
}

/** Match search query (stripping optional leading `#`) against ref codes, full IDs, and text fields. */
export function matchesRefOrText(
  rawQuery: string,
  id: string,
  bundleId?: string | null,
  ...fields: Array<string | null | undefined>
): boolean {
  const q = rawQuery.trim().replace(/^#/, "").toLowerCase();
  if (!q) return true;
  if (id.toLowerCase().includes(q) || shortRef(id).slice(1).toLowerCase().includes(q)) return true;
  if (bundleId && (bundleId.toLowerCase().includes(q) || shortRef(bundleId).slice(1).toLowerCase().includes(q))) {
    return true;
  }
  return fields.some((f) => (f ?? "").toLowerCase().includes(q));
}

export interface BundleGroup<T> {
  key: string;
  bundleId: string | null;
  items: T[];
}

/** Group records that share a bundle_id into ordered bundle groups while keeping standalone rows in order. */
export function groupByBundle<T extends { id: string; bundle_id?: string | null }>(rows: T[]): BundleGroup<T>[] {
  const groups: BundleGroup<T>[] = [];
  const bundleIndex = new Map<string, number>();
  for (const row of rows) {
    if (row.bundle_id) {
      const existingIdx = bundleIndex.get(row.bundle_id);
      if (existingIdx !== undefined) {
        groups[existingIdx]!.items.push(row);
      } else {
        bundleIndex.set(row.bundle_id, groups.length);
        groups.push({ key: `bundle:${row.bundle_id}`, bundleId: row.bundle_id, items: [row] });
      }
    } else {
      groups.push({ key: `single:${row.id}`, bundleId: null, items: [row] });
    }
  }
  return groups;
}
