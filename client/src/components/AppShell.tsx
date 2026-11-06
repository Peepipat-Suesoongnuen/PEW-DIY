import { useState, type ReactNode } from "react";
import { Cpu, Menu, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useSession } from "../lib/session";
import { AccountMenu } from "./AccountMenu";

/**
 * AppShell: top navigation + centered content (ui-spec §2.1/§2.2, decision N-1).
 * Nav links rule (ui-spec §2.2): links for later-sprint screens appear ONLY
 * when their features land (no dead links) — My Requests/My Loans/Submitted
 * Requests entries are added by #11 (F-04) and #12 (F-05) when those screens
 * are implemented.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-control px-3 py-2 text-sm ${
      isActive ? "bg-primary/10 font-medium text-primary" : "text-text hover:text-primary"
    }`;

  return (
    <div className="min-h-screen bg-white">
      <nav aria-label="Main" className="border-b border-border">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <NavLink to="/catalog" className="flex items-center gap-2 text-primary">
              <Cpu aria-hidden="true" className="h-5 w-5" />
              <span className="text-lg font-semibold">PEW-DIY</span>
            </NavLink>
            <div className="hidden items-center gap-1 md:flex">
              <NavLink to="/catalog" className={navLinkClass}>
                Catalog
              </NavLink>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user ? <AccountMenu user={user} /> : null}
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((value) => !value)}
              className="rounded-control border border-border p-2 md:hidden"
            >
              {menuOpen ? <X aria-hidden="true" className="h-4 w-4" /> : <Menu aria-hidden="true" className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {menuOpen ? (
          <div className="border-t border-border px-4 py-2 md:hidden">
            <NavLink to="/catalog" className={navLinkClass} onClick={() => setMenuOpen(false)}>
              Catalog
            </NavLink>
          </div>
        ) : null}
      </nav>
      <main className="mx-auto max-w-[1200px] px-4 py-6">{children}</main>
    </div>
  );
}
