import { useLocation } from "react-router-dom";

/**
 * Route path helpers. Equipment IDs are opaque strings (f-02) and may contain
 * URL-significant characters (`#`, `/`, `%`, …) — every path built from an id
 * MUST encode it so the id survives the URL round-trip (PR #34 review P2-2).
 */
export function itemPath(id: string): string {
  return `/items/${encodeURIComponent(id)}`;
}

/**
 * Route-boundary id reader (PR #34 review round 2 — opaque-id double decode).
 *
 * React Router transforms `:id` params twice: `decodePath()` decodes each path
 * segment and `matchPathImpl()` then rewrites `%2F` back to `/` — so the params
 * API cannot distinguish the opaque ids `fixture/opaque` and `fixture%2Fopaque`
 * (both come back as `fixture/opaque`) and the wrong item can be opened. To
 * preserve the original id exactly, read the RAW (still-encoded) pathname and
 * decode it EXACTLY once here. Source: react-router 7.18 `decodePath` +
 * `matchPathImpl` param extraction.
 */
export function itemIdFromPathname(pathname: string): string | null {
  const marker = "/items/";
  const start = pathname.indexOf(marker);
  if (start === -1) {
    return null;
  }
  const rawSegment = pathname.slice(start + marker.length).split("/")[0];
  if (rawSegment === undefined || rawSegment === "") {
    return null;
  }
  try {
    return decodeURIComponent(rawSegment);
  } catch {
    // Malformed percent-encoding: keep the raw segment (same fallback the
    // router uses for malformed URL segments) — never throw at the boundary.
    return rawSegment;
  }
}

/**
 * The item id as written in the URL, decoded exactly once (see
 * {@link itemIdFromPathname}). `useLocation().pathname` is the raw encoded
 * path, unlike `useParams()` which applies the router's double transform.
 */
export function useItemRouteId(): string | null {
  const location = useLocation();
  return itemIdFromPathname(location.pathname);
}

export function requestPath(id: string): string {
  return `/requests/${encodeURIComponent(id)}`;
}

export function loanPath(id: string): string { return `/loans/${encodeURIComponent(id)}`; }
export function loanIdFromPathname(pathname: string): string | null {
  const raw = pathname.match(/^\/loans\/([^/]+)\/?$/)?.[1];
  if (!raw) return null;
  try { return decodeURIComponent(raw); } catch { return raw; }
}

export function requestIdFromPathname(pathname: string): string | null {
  const raw = pathname.match(/^\/requests\/([^/]+)\/?$/)?.[1];
  if (!raw) return null;
  try { return decodeURIComponent(raw); } catch { return raw; }
}
