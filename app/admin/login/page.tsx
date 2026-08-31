"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  supabaseBrowser,
} from "@/lib/supabase-browser";

export default function Login() {
  const [
    email,
    setEmail,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    busy,
    setBusy,
  ] = useState(false);

  const router =
    useRouter();

  const signIn =
    async () => {
      setError("");
      setBusy(true);

      try {
        const {
          error: authError,
        } =
          await supabaseBrowser()
            .auth.signInWithPassword({
              email,
              password,
            });

        if (
          authError
        ) {
          setError(
            authError.message
          );
          return;
        }

        router.push(
          "/admin"
        );
      } catch {
        setError(
          "Unable to sign in. Please try again."
        );
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
            Nailtech access
          </div>

          <h1 className="serif">
            Admin login
          </h1>

          <div className="field">
            <label>
              Email
            </label>

            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(
                event
              ) =>
                setEmail(
                  event.target
                    .value
                )
              }
            />
          </div>

          <div className="field">
            <label>
              Password
            </label>

            <input
              type="password"
              autoComplete="current-password"
              value={
                password
              }
              onChange={(
                event
              ) =>
                setPassword(
                  event.target
                    .value
                )
              }
              onKeyDown={(
                event
              ) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  signIn();
                }
              }}
            />
          </div>

          {error && (
            <div className="notice">
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
            onClick={
              signIn
            }
          >
            {busy
              ? "Signing in…"
              : "Sign in"}
          </button>
        </div>
      </div>
    </main>
  );
}