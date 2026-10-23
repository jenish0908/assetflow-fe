import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { useSession } from "../auth";
import { AssetLabel } from "../components/AssetTag";
import { ErrorNotice, Field } from "../components/ui";

// Accounts created by the backend README's quickstart. Hidden when the image
// is built with VITE_DEMO=false.
const demoAccounts =
  import.meta.env.VITE_DEMO === "false"
    ? []
    : [
        { email: "admin@assetflow.dev", password: "admin-pass-123", role: "Admin" },
        { email: "mgr@assetflow.dev", password: "mgr-pass-123", role: "Manager" },
        { email: "priya@assetflow.dev", password: "priya-pass-123", role: "Viewer" },
      ];

export function SignInPage() {
  const { signIn, signedIn } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  if (signedIn) return <Navigate to={from} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="signin">
      <section className="signin-art" aria-label="About AssetFlow">
        <div className="brand" style={{ padding: 0 }}>
          AssetFlow
        </div>
        <div className="signin-stage">
          <AssetLabel tag="L-102" name="MacBook Pro 14, with Priya Shah" />
        </div>
        <div>
          <h1>Every laptop, monitor and phone, and who has it.</h1>
          <p>
            Allocate equipment in two clicks, see its full history, take payments, and ask the assistant in plain English.
          </p>
        </div>
      </section>

      <section className="signin-form">
        <form onSubmit={submit} aria-labelledby="signin-title">
          <div>
            <h2 id="signin-title">Sign in</h2>
            <p className="muted">Use your work email.</p>
          </div>
          {error !== null && <ErrorNotice error={error} />}
          <Field label="Email">
            <input className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password">
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {demoAccounts.length > 0 && (
          <div className="demo-accounts">
            <span className="field-label">Demo accounts</span>
            <ul>
              {demoAccounts.map((a) => (
                <li key={a.email}>
                  <button
                    type="button"
                    className="demo-account"
                    onClick={() => {
                      setEmail(a.email);
                      setPassword(a.password);
                    }}
                  >
                    <span>{a.email}</span>
                    <span className="muted">{a.role}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
