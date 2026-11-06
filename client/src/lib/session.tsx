import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError, type User } from "./api";

interface SessionValue {
  user: User | null;
  /** "loading" until the initial GET /api/auth/me settles. */
  status: "loading" | "ready";
  /** Set when a later API call returned 401 mid-session (ui-spec §1.3). */
  expiredNotice: boolean;
  signIn(username: string, password: string): Promise<User>;
  signOut(): Promise<void>;
  /** Clear stale identity locally after a 401 (f-01 §2.3: no fallback user). */
  clear(): void;
  clearExpiredNotice(): void;
  /** 401 on a later call: mark expiry + drop stale identity (ui-spec §1.3). */
  expire(): void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [expiredNotice, setExpiredNotice] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then((res) => {
        if (!cancelled) setUser(res.data.user);
      })
      .catch(() => {
        // Not signed in (or session revoked) — never fall back to a fake user.
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setStatus("ready");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const res = await api.login(username, password);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const signOut = useCallback(async () => {
    // Only clear the session after a confirmed success (204) — logout failure
    // must not drop the user's identity (f-01 §2.3; PR #27 P2 review).
    await api.logout();
    setUser(null);
  }, []);

  const clear = useCallback(() => setUser(null), []);
  const clearExpiredNotice = useCallback(() => setExpiredNotice(false), []);

  const value = useMemo(
    () => ({
      user,
      status,
      expiredNotice,
      signIn,
      signOut,
      clear,
      clearExpiredNotice,
      /** 401 on a LATER call: mark the expiry + drop stale identity. */
      expire: () => {
        setExpiredNotice(true);
        setUser(null);
      },
    }),
    // `expire` is intentionally recreated per render like `clear` — both only
    // call stable setState setters.
    [user, status, expiredNotice, signIn, signOut, clear, clearExpiredNotice],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used inside <SessionProvider>");
  }
  return ctx;
}

/**
 * Shared 401 behavior (ui-spec §0.3/§1.3): on a 401 from a LATER call, mark the
 * session as expired (Login shows the info notice), clear stale private state
 * and return to Login — never show partially-cleared data. The notice lives in
 * session state (not router state) because a protected layout may also
 * redirect when the user is cleared, which would overwrite router state.
 */
export function useUnauthorizedRedirect(): (err: unknown) => boolean {
  const navigate = useNavigate();
  const { expire } = useSession();
  return useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        expire();
        navigate("/login", { replace: true });
        return true;
      }
      return false;
    },
    [navigate, expire],
  );
}
