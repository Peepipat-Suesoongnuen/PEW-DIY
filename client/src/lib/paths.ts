/**
 * Route path helpers. Equipment IDs are opaque strings (f-02) and may contain
 * URL-significant characters (e.g. `#`, `%`, `/`) — every path built from an
 * id MUST encode it so the id survives the URL round-trip (PR #34 review P2-2).
 */
export function itemPath(id: string): string {
  return `/items/${encodeURIComponent(id)}`;
}
