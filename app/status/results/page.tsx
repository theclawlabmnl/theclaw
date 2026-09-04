"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type BookingStatusResult = {
  token?: string | null;
  reference_code?: string | null;
  customer_name?: string | null;
  preferred_date?: string | null;
  preferred_time?: string | null;
  status?: string | null;
  status_active?: boolean;
};

function statusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Pending";
    case "approved":
      return "Payment Required";
    case "payment_submitted":
      return "Payment Submitted";
    case "confirmed":
      return "Confirmed";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "rejected":
      return "Not Approved";
    default:
      return status || "Updated";
  }
}

function formatDate(value?: string | null) {
  if (!value) return "Date unavailable";

  const date = new Date(`${value}T00:00:00+08:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(value?: string | null) {
  if (!value) return "";

  const match = String(value).match(/^(\d{1,2}):(\d{2})/);

  if (!match) return value;

  const hour = Number(match[1]);
  const minute = match[2];
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;

  return `${hour12}:${minute} ${suffix}`;
}

export default function StatusResultsPage() {
  const [bookings, setBookings] = useState<BookingStatusResult[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(
        "booking-status-results"
      );

      if (!raw) {
        setBookings([]);
        return;
      }

      const parsed = JSON.parse(raw);

      setBookings(
        Array.isArray(parsed) ? parsed : []
      );
    } catch {
      setBookings([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  const visibleBookings = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          booking &&
          booking.token &&
          String(booking.status || "") !== "draft"
      ),
    [bookings]
  );

  if (!loaded) {
    return (
      <main className="status-page">
        <div className="status-page-inner">
          <div className="status-card">
            <div className="status-brand">
              The Claw Lab MNL
            </div>

            <div className="status-header">
              <h1>Booking Status</h1>
            </div>

            <div className="status-message">
              <h2>Loading your bookings…</h2>
              <p>Please wait a moment.</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="status-page">
      <div className="status-page-inner">
        <div className="status-card">
          <div className="status-brand">
            The Claw Lab MNL
          </div>

          <div className="status-header">
            <h1>Booking Status</h1>
          </div>

          <div className="status-message">
            <h2>Your bookings</h2>
            <p>
              These are the bookings connected to the
              email address you entered.
            </p>
          </div>

          {visibleBookings.length > 0 ? (
            <section className="status-results-list">
              {visibleBookings.map((booking, index) => {
                const status = String(
                  booking.status || ""
                );

                const inactive =
                  booking.status_active === false;

                return (
                  <article
                    className="status-result-card"
                    key={
                      booking.token ||
                      `${booking.reference_code}-${index}`
                    }
                  >
                    <div className="status-result-top">
                      <div>
                        <span className="status-result-label">
                          Booking ID
                        </span>
                        <strong className="status-result-reference">
                          {booking.reference_code || "—"}
                        </strong>
                      </div>

                      <span
                        className={`status-result-pill status-result-pill-${status}`}
                      >
                        {statusLabel(status)}
                      </span>
                    </div>

                    <div className="status-result-details">
                      <div>
                        <span>Client</span>
                        <strong>
                          {booking.customer_name || "—"}
                        </strong>
                      </div>

                      <div>
                        <span>Appointment</span>
                        <strong>
                          {formatDate(
                            booking.preferred_date
                          )}
                          {booking.preferred_time
                            ? ` · ${formatTime(
                                booking.preferred_time
                              )}`
                            : ""}
                        </strong>
                      </div>
                    </div>

                    {inactive ? (
                      <div className="status-result-expired">
                        Online status access has ended for
                        this appointment.
                      </div>
                    ) : (
                      <Link
                        href={`/status/${booking.token}`}
                        className="status-primary-button status-result-button"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "auto",
                          minWidth: "150px",
                          minHeight: "32px",
                          margin: "16px auto 4px",
                          padding: "6px 14px",
                          fontSize: "10px",
                          lineHeight: 1.2,
                          boxSizing: "border-box",
                          alignSelf: "center",
                        }}
                      >
                        View Booking Status
                      </Link>
                    )}
                  </article>
                );
              })}
            </section>
          ) : (
            <section className="status-summary">
              <div className="status-summary-title">
                No bookings found
              </div>
              <p className="status-results-empty">
                We could not find any submitted bookings
                from your previous search. Please try
                again.
              </p>
            </section>
          )}

          <div className="status-footer">
            <Link href="/status">
              Search another email or booking ID
            </Link>

            <Link
              href="/"
              style={{
                display: "block",
                marginTop: "5px",
                fontSize: "11px",
                lineHeight: 1.4,
                fontWeight: 400,
                color: "#555",
                textDecoration: "none",
              }}
            >
              Back to TheClawLabMNL Homepage
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .status-results-list {
          display: grid;
          gap: 10px;
          margin-top: 14px;
        }

        .status-result-card {
          padding: 13px;
          border: 1px solid #e7dddd;
          border-radius: 10px;
          background: #fff;
        }

        .status-result-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .status-result-label,
        .status-result-details span {
          display: block;
          margin-bottom: 3px;
          color: #777;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .status-result-reference {
          display: block;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .status-result-pill {
          flex: 0 0 auto;
          padding: 5px 8px;
          border-radius: 999px;
          background: #f2eeee;
          color: #4d4545;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }

        .status-result-pill-confirmed,
        .status-result-pill-completed {
          background: #edf7ef;
          color: #28633a;
        }

        .status-result-pill-approved,
        .status-result-pill-payment_submitted {
          background: #fff4db;
          color: #765815;
        }

        .status-result-pill-cancelled,
        .status-result-pill-rejected {
          background: #fff0ef;
          color: #9d3028;
        }

        .status-result-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid #f0e9e7;
        }

        .status-result-details strong {
          display: block;
          font-size: 12px;
          line-height: 1.4;
        }

        .status-card .status-result-button {
          display: inline-flex !important;
          align-items: center;
          justify-content: center;
          width: auto !important;
          max-width: none !important;
          min-width: 150px;
          min-height: 32px;
          margin: 16px auto 4px !important;
          padding: 6px 14px !important;
          box-sizing: border-box;
          font-size: 10px !important;
          line-height: 1.2;
          text-decoration: none;
          align-self: center;
        }

        .status-result-card {
          display: flex;
          flex-direction: column;
        }

        .status-result-expired,
        .status-results-empty {
          margin: 10px 0 0;
          color: #777;
          font-size: 11px;
          line-height: 1.5;
        }

        @media (max-width: 560px) {
          .status-result-top {
            flex-direction: column;
          }

          .status-result-details {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
