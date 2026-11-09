import { useState, type FormEvent } from "react";
import { Cpu, Eye, EyeOff } from "lucide-react";
import { Navigate } from "react-router-dom";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Field } from "../components/Field";
import { ApiError } from "../lib/api";
import { useSession } from "../lib/session";

/**
 * Login (ui-spec §1): centered single card; generic credential error identical
 * for unknown user and wrong password (FR-01/AC-F01-02); preserve username,
 * never re-render the password (f-01 §2.3); pending state disables the form.
 */
export function LoginPage() {
  const { user, status, signIn, expiredNotice, clearExpiredNotice } = useSession();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<{ message: string; requestId?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === "loading") {
    return null;
  }
  if (user) {
    return <Navigate to="/catalog" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    // Client-side validation first — no network call for empty fields (§1.3).
    let valid = true;
    if (!username.trim()) {
      setUsernameError("Username is required.");
      valid = false;
    } else {
      setUsernameError(null);
    }
    if (!password) {
      setPasswordError("Password is required.");
      valid = false;
    } else {
      setPasswordError(null);
    }
    if (!valid) {
      // f-01 §2.3: when showing an error, preserve ONLY safe input — the
      // username stays, the password is cleared on every failed submit.
      setPassword("");
      return;
    }

    setBusy(true);
    clearExpiredNotice();
    try {
      await signIn(username, password);
      // Success → Catalog (both roles). React Router state handles navigation
      // after re-render via <Navigate> below (user is now set).
    } catch (err) {
      // Preserve only safe input on ANY failure (401, 500/503, network):
      // username kept, password cleared (f-01 §2.3 — PR #34 review P2-3).
      setPassword("");
      if (err instanceof ApiError && err.status === 401) {
        // One generic message for unknown user AND wrong password (§1.3).
        setFormError({ message: "Invalid credentials." });
      } else if (err instanceof ApiError) {
        setFormError({ message: "Something went wrong. Please try again.", requestId: err.requestId });
      } else {
        setFormError({ message: "Something went wrong. Please try again." });
      }
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex flex-col items-center gap-1 text-center">
          <span className="flex items-center gap-2 text-primary">
            <Cpu aria-hidden="true" className="h-6 w-6" />
            <span className="text-xl font-semibold">PEW-DIY</span>
          </span>
          <p className="text-sm text-text-muted">D.I.Y. Room Equipment Borrowing System</p>
        </div>
        <Card title="Sign in">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {expiredNotice && !formError ? (
              <Alert tone="info">Your session has expired. Please sign in again.</Alert>
            ) : null}
            {formError ? <Alert tone="danger">{formError.message}</Alert> : null}
            {formError?.requestId ? (
              <p className="-mt-2 text-xs text-text-muted">Request ID: {formError.requestId}</p>
            ) : null}
            <Field
              label="Username"
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              disabled={busy}
              error={usernameError}
              onChange={(event) => setUsername(event.target.value)}
            />
            <Field
              label="Password"
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              disabled={busy}
              error={passwordError}
              onChange={(event) => setPassword(event.target.value)}
            >
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-control p-2 text-text-muted hover:text-text"
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <Eye aria-hidden="true" className="h-4 w-4" />
                )}
              </button>
            </Field>
            <Button type="submit" fullWidth loading={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
