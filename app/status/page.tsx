"use client";

import {
  FormEvent,
  useState,
} from "react";

import Link from "next/link";
export default function StatusPage() {
  const [mode, setMode] = useState<
    "reference" | "email"
  >("reference");

  const [referenceCode, setReferenceCode] =
    useState("");

  const [email, setEmail] =
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
      const body =
        mode === "reference"
          ? {
              reference_code:
                referenceCode.trim(),
            }
          : {
              email:
                email.trim(),
            };

      const response = await fetch(
        "/api/status-lookup",
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const result =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to find your booking."
        );
      }

      const bookings =
        Array.isArray(
          result.bookings
        )
          ? result.bookings
          : [];

      if (
        bookings.length === 0
      ) {
        throw new Error(
          "We couldn't find your booking."
        );
      }

      /*
       * If there is exactly one booking,
       * go directly to its status page.
       */
      if (
        bookings.length === 1 &&
        bookings[0]?.token
      ) {
        window.location.href =
          `/status/${bookings[0].token}`;

        return;
      }

      /*
       * If multiple bookings match,
       * store the result in sessionStorage
       * and let the selection page display them.
       */
      sessionStorage.setItem(
        "booking-status-results",
        JSON.stringify(bookings)
      );

      window.location.href =
        "/status/results";
    } catch (
      error: any
    ) {
      setError(
        error?.message ||
          "Unable to find your booking."
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
              Booking Status
            </h1>
          </div>

          {/* MESSAGE */}
          <div className="status-message">

            <h2>
              Check your appointment
            </h2>

            <p>
              Enter your booking ID or the
              email address you used for your
              booking to view your appointment
              status.
            </p>

          </div>

          {/* LOOKUP */}
          <section className="status-summary">

            <div className="status-summary-title">
              Find Your Booking
            </div>

            {/* LOOKUP OPTIONS */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginBottom: "18px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className={
                  mode === "reference"
                    ? "status-primary-button"
                    : "status-primary-button"
                }
                onClick={() => {
                  setMode("reference");
                  setError("");
                }}
                style={{
                  flex: 1,
                  minWidth: "120px",
                  border:
                    mode === "reference"
                      ? undefined
                      : "1px solid #ddd",
                  background:
                    mode === "reference"
                      ? undefined
                      : "#fff",
                  color:
                    mode === "reference"
                      ? undefined
                      : "#555",
                }}
              >
                Booking ID
              </button>

              <button
                type="button"
                className={
                  mode === "email"
                    ? "status-primary-button"
                    : "status-primary-button"
                }
                onClick={() => {
                  setMode("email");
                  setError("");
                }}
                style={{
                  flex: 1,
                  minWidth: "120px",
                  border:
                    mode === "email"
                      ? undefined
                      : "1px solid #ddd",
                  background:
                    mode === "email"
                      ? undefined
                      : "#fff",
                  color:
                    mode === "email"
                      ? undefined
                      : "#555",
                }}
              >
                Email Address
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
            >
              {mode ===
                "reference" ? (
                <div className="status-summary-item">
                  <span>
                    Booking ID
                  </span>

                  <input
                    id="reference_code"
                    value={
                      referenceCode
                    }
                    onChange={(
                      event
                    ) =>
                      setReferenceCode(
                        event.target
                          .value
                      )
                    }
                    placeholder="Enter your booking ID"
                    autoComplete="off"
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
              ) : (
                <div className="status-summary-item">
                  <span>
                    Email Address
                  </span>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(
                      event
                    ) =>
                      setEmail(
                        event.target
                          .value
                      )
                    }
                    placeholder="Enter the email used for your booking"
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
              )}

              {/* ERROR */}
              {error && (
                <div
                  className="status-review-box"
                  style={{
                    marginTop: "12px",
                  }}
                >
                  <strong>
                    Unable to find your booking
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
                  ? "Checking..."
                  : "Check Booking Status"}
              </button>
            </form>

          </section>

          {/* CONTACT */}
          <div className="status-contact">

            <p>
              Questions? Message us.
            </p>

            <div className="status-contact-links">

              <a
                href="https://instagram.com/theclawlabmnl"
                target="_blank"
                rel="noreferrer"
              >
                Instagram
              </a>

              <a
                href="https://m.me/theclawlabmnl"
                target="_blank"
                rel="noreferrer"
              >
                Messenger
              </a>

            </div>

          </div>

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