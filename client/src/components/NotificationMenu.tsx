import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Check, Trash2 } from "lucide-react";
import { api, ApiError, type NotificationView } from "../lib/api";
import { useUnauthorizedRedirect } from "../lib/session";

/**
 * Persistent notification bell & popover (F-07, BR-13):
 * - Marks individual notifications read (dismisses on acknowledge)
 * - Allows clearing all notifications at once
 */
export function NotificationMenu() {
  const onUnauthorized = useUnauthorizedRedirect();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationView[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await api.listNotifications();
      setItems(res.data);
      setError(null);
    } catch (cause) {
      if (onUnauthorized(cause)) return;
      if (cause instanceof ApiError && cause.status === 401) return;
      setError("Could not load notifications.");
    }
  }, [onUnauthorized]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      await loadNotifications();
    }
  }

  async function dismissOne(id: string) {
    setBusy(true);
    try {
      await api.markNotificationRead(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setError(null);
    } catch (cause) {
      if (onUnauthorized(cause)) return;
      setError("Could not dismiss notification.");
    } finally {
      setBusy(false);
    }
  }

  async function clearAll() {
    setBusy(true);
    try {
      await api.clearNotifications();
      setItems([]);
      setError(null);
    } catch (cause) {
      if (onUnauthorized(cause)) return;
      setError("Could not clear notifications.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={containerRef} className="no-print relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={items.length > 0 ? `Notifications (${items.length} unread)` : "Notifications"}
        onClick={() => void handleToggle()}
        className="relative flex items-center justify-center rounded-control border border-border p-2 text-text hover:border-primary/40"
      >
        <Bell aria-hidden="true" className="h-4 w-4" />
        {items.length > 0 ? (
          <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-xs font-semibold text-white">
            {items.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-30 mt-2 w-80 max-w-[90vw] rounded-card border border-border bg-white p-3 shadow-md"
        >
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 className="text-sm font-semibold text-text">Notifications</h2>
            {items.length > 0 ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void clearAll()}
                className="inline-flex items-center gap-1 text-xs font-medium text-danger hover:underline disabled:opacity-60"
              >
                <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                Clear all
              </button>
            ) : null}
          </div>

          {error ? (
            <p role="alert" className="mt-2 text-xs text-danger">
              {error}
            </p>
          ) : null}

          {items.length === 0 ? (
            <p className="py-6 text-center text-xs text-text-muted">No unread notifications.</p>
          ) : (
            <ul className="mt-2 max-h-72 divide-y divide-border overflow-y-auto">
              {items.map((n) => (
                <li key={n.id} className="flex items-start justify-between gap-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-text">{n.title}</p>
                    <p className="mt-0.5 text-xs text-text-muted">{n.message}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Mark notification ${n.title} read`}
                    disabled={busy}
                    onClick={() => void dismissOne(n.id)}
                    className="rounded-control border border-border p-1 text-text-muted hover:border-primary/40 hover:text-primary disabled:opacity-60"
                  >
                    <Check aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
