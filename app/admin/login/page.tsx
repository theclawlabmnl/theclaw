"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase-browser";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const router = useRouter();

  const signIn = async () => {
    if (busy) {
      return;
    }

    setError("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setBusy(true);

    try {
      const { error: authError } =
        await supabaseBrowser().auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

      if (authError) {
        setError("Invalid email or password.");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="form-page">
      <div
        className="container"
        style={{
          maxWidth: 450,
        }}
      >
        <div className="card">
          <div className="kicker">
            Nails by Arkie access
          </div>

          <h1 className="serif">
            Admin login
          </h1>

          <div className="field">
            <label htmlFor="admin-email">
              Email
            </label>

            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
              }}
              disabled={busy}
            />
          </div>

          <div className="field">
            <label htmlFor="admin-password">
              Password
            </label>

            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  signIn();
                }
              }}
              disabled={busy}
            />
          </div>

          {error && (
            <div
              className="notice"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="button"
            className="btn"
            style={{
              marginTop: 16,
            }}
            disabled={busy}
            onClick={signIn}
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </div>
    </main>
  );
}