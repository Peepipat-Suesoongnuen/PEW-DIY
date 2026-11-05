import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "../lib/api";
import { useSession } from "../lib/session";

const roleLabels: Record<User["role"], string> = {
  BORROWER: "Borrower",
  CUSTODIAN: "Custodian",
};

function initials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

/**
 * Account menu (ui-spec §2.2): current username + role label; "Sign out" in the
 * menu. Logout succeeds → Login; failure → safe message + retry WITHOUT
 * redirect (shared logout behavior §4; PR #27 P2 review).
 */
export function AccountMenu({ user }: { user: User }) {
  const { signOut } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleSignOut() {
    setError(null);
    setBusy(true);
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch {
      // Uncertain outcome (network) or confirmed failure: keep the session
      // page and offer retry — never pretend the logout happened.
      setError("Could not sign out. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-control border border-border px-2.5 py-1.5 text-sm hover:border-primary/40"
      >
        {/* Mobile: avatar initials; desktop: username + role label (§2.2). */}
        <span
          aria-hidden="true"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-white"
        >
          {initials(user.username)}
        </span>
        <span className="hidden md:inline">
          {user.username} · {roleLabels[user.role]}
        </span>
        <span className="sr-only md:hidden">{user.username}, {roleLabels[user.role]}</span>
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 z-20 mt-2 w-48 rounded-card border border-border bg-white p-2 shadow-md">
          <p className="px-2 py-1 text-xs text-text-muted">
            {user.username} · {roleLabels[user.role]}
          </p>
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={handleSignOut}
            className="mt-1 w-full rounded-control px-2 py-2 text-left text-sm hover:bg-white/50 disabled:opacity-60"
          >
            {busy ? "Signing out…" : "Sign out"}
          </button>
          {error ? (
            <p role="alert" className="mt-2 px-2 text-xs text-danger">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
