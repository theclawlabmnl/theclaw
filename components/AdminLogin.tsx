"use client";

import {
  FormEvent,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase-browser";

export default function AdminLogin() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const {
        error: authError,
      } =
        await supabaseBrowser()
          .auth
          .signInWithPassword({
            email: email.trim(),
            password,
          });

      if (authError) {
        throw new Error(
          "Invalid email or password."
        );
      }

      router.push("/admin");
      router.refresh();
    } catch (
      error: any
    ) {
      setError(
        error?.message ||
          "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="status-page">
      <div className="status-page-inner">

        <div className="status-card">

          {/* BRAND */}
          <div className="status-brand">
            The Claw Lab MNL
          </div>

          {/* HEADER */}
          <div className="status-header">
            <h1>
              Admin Login
            </h1>
          </div>

          {/* MESSAGE */}
          <div className="status-message">

            <h2>
              Welcome back
            </h2>

            <p>
              Sign in to access your
              studio dashboard.
            </p>

          </div>

          {/* LOGIN */}
          <section className="status-summary">

            <div className="status-summary-title">
              Admin Access
            </div>

            <form
              onSubmit={handleSubmit}
            >

              {/* EMAIL */}
              <div className="status-summary-item">

                <span>
                  Email Address
                </span>

                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(
                    event
                  ) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  placeholder="Enter your email address"
                  autoComplete="email"
                  required
                  style={{
                    width: "100%",
                    marginTop: "7px",
                    boxSizing:
                      "border-box",
                    padding:
                      "11px 12px",
                    border:
                      "1px solid #ddd",
                    borderRadius:
                      "7px",
                    fontFamily:
                      "inherit",
                    fontSize:
                      "13px",
                    outline:
                      "none",
                  }}
                />

              </div>

              {/* PASSWORD */}
              <div
                className="status-summary-item"
                style={{
                  marginTop: "16px",
                }}
              >

                <span>
                  Password
                </span>

                <input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(
                    event
                  ) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  style={{
                    width: "100%",
                    marginTop: "7px",
                    boxSizing:
                      "border-box",
                    padding:
                      "11px 12px",
                    border:
                      "1px solid #ddd",
                    borderRadius:
                      "7px",
                    fontFamily:
                      "inherit",
                    fontSize:
                      "13px",
                    outline:
                      "none",
                  }}
                />

              </div>

              {/* ERROR */}
              {error && (
                <div
                  className="status-review-box"
                  style={{
                    marginTop: "12px",
                  }}
                >

                  <strong>
                    Unable to sign in
                  </strong>

                  <p>
                    {error}
                  </p>

                </div>
              )}

              {/* SUBMIT */}
              <button
                type="submit"
                className="status-primary-button"
                disabled={loading}
                style={{
                  marginTop: "12px",
                  width: "100%",
                  opacity:
                    loading ? 0.65 : 1,
                  cursor:
                    loading
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {loading
                  ? "Signing in..."
                  : "Sign In"}
              </button>

            </form>

          </section>

          {/* FOOTER */}
          <div className="status-footer">

            <Link href="/">
              Back to TheClawLabMNL Homepage
            </Link>

          </div>

        </div>

      </div>
    </main>
  );
}