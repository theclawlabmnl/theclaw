export const dynamic = "force-dynamic";

import Link from "next/link";

import { supabaseAdmin } from "@/lib/supabase-admin";

import {
  formatDate,
  peso,
} from "@/lib/utils";

const INSTRUCTIONS_URL =
  "https://drive.google.com/drive/folders/1rC9dDjIRK_eQGOiGQFVQAXopEtvo3zIp?usp=drive_link";

const CANCELLATION_WINDOW_HOURS = 48;

function getCancellationDeadline(
  confirmedAt: string | null | undefined
): Date | null {
  if (!confirmedAt) {
    return null;
  }

  const confirmedDate = new Date(confirmedAt);

  if (Number.isNaN(confirmedDate.getTime())) {
    return null;
  }

  return new Date(
    confirmedDate.getTime() +
      CANCELLATION_WINDOW_HOURS * 60 * 60 * 1000
  );
}

function formatPhilippineDateTime(date: Date) {
  return date.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function Confirmed({
  params,
}: {
  params: Promise<{
    token: string;
  }>;
}) {
  const { token } = await params;

  const db = supabaseAdmin();

  const {
    data: booking,
  } = await db
    .from("bookings")
    .select("*,booking_services(*)")
    .eq("access_token", token)
    .single();

  /*
   * CONFIRMATION NOT AVAILABLE
   */
  if (
    !booking ||
    booking.status !== "confirmed"
  ) {
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
                Appointment
              </h1>
            </div>

            {/* STATUS */}
            <div className="status-pill status-pill-pending">
              <span className="status-pill-dot" />
              Not Available Yet
            </div>

            {/* MESSAGE */}
            <div className="status-message">
              <h2>
                Confirmation is not available yet
              </h2>

              <p>
                Your appointment confirmation
                will appear here once your
                payment has been verified by
                The Claw Lab MNL.
              </p>
            </div>

            {/* ACTION */}
            <div className="status-action">
              <Link
                href={`/status/${token}`}
                className="status-primary-button"
              >
                ← Back to Booking Status
              </Link>
            </div>

            {/* CONTACT */}
            <div className="status-contact">
              <p>
                Need help? Message us.
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
              <Link href="/status">
                Check another booking
              </Link>
            </div>

          </div>
        </div>
      </main>
    );
  }

  const estimatedTotal = Number(
    booking.estimated_total || 0
  );

  const downPayment = Number(
    booking.down_payment || 0
  );

  const remaining = Math.max(
    0,
    estimatedTotal - downPayment
  );

  /*
   * 48-HOUR CANCELLATION POLICY
   *
   * The cancellation window starts from the
   * exact time the booking was confirmed.
   */
  const cancellationDeadline =
    getCancellationDeadline(
      booking.confirmed_at
    );

  const cancellationRefundEligible =
    cancellationDeadline !== null &&
    Date.now() <=
      cancellationDeadline.getTime();

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
              Appointment Confirmation
            </h1>
          </div>

          {/* STATUS */}
          <div className="status-pill status-pill-confirmed">
            <span className="status-pill-dot" />
            Confirmed
          </div>

          {/* MESSAGE */}
          <div className="status-message">
            <h2>
              Your appointment is confirmed ✨
            </h2>

            <p>
              Your payment has been verified
              and your appointment is officially
              confirmed.
            </p>
          </div>

          {/* BOOKING SUMMARY */}
          <section className="status-summary">

            <div className="status-summary-title">
              Booking Summary
            </div>

            <div className="status-summary-grid">

              <div className="status-summary-item">
                <span>
                  Client
                </span>

                <strong>
                  {booking.customer_name || "—"}
                </strong>
              </div>

              <div className="status-summary-item">
                <span>
                  Appointment
                </span>

                <strong>
                  {formatDate(
                    booking.preferred_date
                  )}
                  {" · "}
                  {booking.preferred_time || "—"}
                </strong>
              </div>

              <div className="status-summary-item">
                <span>
                  Reference
                </span>

                <strong>
                  {booking.reference_code || "—"}
                </strong>
              </div>

            </div>

          </section>

          {/* 48-HOUR CANCELLATION POLICY */}
          <section
            style={{
              marginTop: "24px",
              padding: "13px 14px",
              borderRadius: "8px",
              border:
                cancellationRefundEligible
                  ? "1px solid rgba(50, 130, 80, 0.30)"
                  : "1px solid rgba(190, 50, 50, 0.30)",
              background:
                cancellationRefundEligible
                  ? "rgba(50, 130, 80, 0.06)"
                  : "rgba(190, 50, 50, 0.06)",
              color: "#000",
            }}
          >

            <strong
              style={{
                display: "block",
                marginBottom: "6px",
                fontSize: "13px",
                lineHeight: 1.4,
              }}
            >
              {cancellationRefundEligible
                ? "48-Hour Cancellation Policy"
                : "48-Hour Cancellation Period Has Ended"}
            </strong>

            {cancellationDeadline ? (
              <>
                <p
                  style={{
                    margin: "0 0 7px",
                    fontSize: "11px",
                    lineHeight: 1.55,
                  }}
                >
                  Your 48-hour cancellation period
                  starts from the exact time your
                  booking was confirmed.
                </p>

                <p
                  style={{
                    margin: "0 0 7px",
                    fontSize: "11px",
                    lineHeight: 1.55,
                  }}
                >
                  Cancellation deadline:
                </p>

                <strong
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "12px",
                    lineHeight: 1.4,
                  }}
                >
                  {formatPhilippineDateTime(
                    cancellationDeadline
                  )}{" "}
                  (Philippine Time)
                </strong>

                {cancellationRefundEligible ? (
                  <p
                    style={{
                      margin: 0,
                      fontSize: "11px",
                      lineHeight: 1.55,
                    }}
                  >
                    You may cancel within the
                    48-hour window and your
                    booking/down payment is eligible
                    for a refund, minus any applicable
                    non-refundable payment processing
                    fees.
                  </p>
                ) : (
                  <p
                    style={{
                      margin: 0,
                      fontSize: "11px",
                      lineHeight: 1.55,
                    }}
                  >
                    You may still cancel your
                    booking, but the booking/down
                    payment is now{" "}
                    <strong>
                      non-refundable
                    </strong>
                    .
                  </p>
                )}
              </>
            ) : (
              <p
                style={{
                  margin: 0,
                  fontSize: "11px",
                  lineHeight: 1.55,
                }}
              >
                The 48-hour cancellation period is
                calculated from the exact time your
                booking was confirmed. Please message
                us if you need help with your
                cancellation.
              </p>
            )}

          </section>

          {/* CONFIRMATION ACTION */}
          <div className="status-action">

            {/* No back button here */}

          </div>

          {/* SERVICES */}
          <section
            style={{
              marginTop: "24px",
              paddingTop: "22px",
              borderTop:
                "1px solid var(--line)",
            }}
          >

            <div className="status-summary-title">
              Appointment Summary
            </div>

            <h2
              style={{
                margin: "6px 0 12px",
                fontFamily:
                  "var(--font-serif, Georgia, serif)",
                fontSize: "28px",
                fontWeight: 400,
              }}
            >
              Services
            </h2>

            <div>
              {(booking.booking_services || []).map(
                (item: any) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "flex-start",
                      gap: "16px",
                      padding: "13px 0",
                      borderBottom:
                        "1px solid var(--line)",
                    }}
                  >

                    <div
                      style={{
                        minWidth: 0,
                      }}
                    >
                      <strong>
                        {item.service_name}
                      </strong>

                      {item.variation_name && (
                        <div
                          className="muted"
                          style={{
                            marginTop: "3px",
                            fontSize: "13px",
                          }}
                        >
                          {item.variation_name}
                        </div>
                      )}
                    </div>

                    <strong
                      style={{
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {peso(item.price)}
                    </strong>

                  </div>
                )
              )}
            </div>

            {/* PAYMENT SUMMARY */}
            <div
              style={{
                display: "grid",
                gap: "9px",
                marginTop: "18px",
              }}
            >

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  gap: "12px",
                }}
              >
                <span className="muted">
                  Total
                </span>

                <strong>
                  {peso(estimatedTotal)}
                </strong>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  gap: "12px",
                }}
              >
                <span className="muted">
                  Down payment
                </span>

                <strong>
                  {peso(downPayment)}
                </strong>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  gap: "12px",
                  marginTop: "4px",
                  paddingTop: "12px",
                  borderTop:
                    "1px solid var(--line)",
                }}
              >
                <strong>
                  Remaining balance
                </strong>

                <strong>
                  {peso(remaining)}
                </strong>
              </div>

            </div>

          </section>

          {/* BEFORE YOUR APPOINTMENT */}
          <section
            style={{
              marginTop: "24px",
              paddingTop: "22px",
              borderTop:
                "1px solid var(--line)",
            }}
          >

            <div className="status-summary-title">
              Before Your Appointment
            </div>

            <h2
              style={{
                margin: "6px 0 8px",
                fontFamily:
                  "var(--font-serif, Georgia, serif)",
                fontSize: "28px",
                fontWeight: 400,
              }}
            >
              Appointment Instructions
            </h2>

            <p
              className="muted"
              style={{
                lineHeight: 1.65,
                margin: 0,
              }}
            >
              Please review the appointment
              instructions, studio reminders,
              policies, and other important
              information you may need before your
              visit.
            </p>

            <a
              href={INSTRUCTIONS_URL}
              target="_blank"
              rel="noreferrer"
              className="status-primary-button"
              style={{
                marginTop: "14px",
                display: "inline-flex",
                textDecoration: "none",
                background: "#f3d6dc",
                color: "#000",
              }}
            >
              View Appointment Instructions →
            </a>

            <Link
              href={`/status/${token}`}
              className="status-primary-button"
              style={{
                marginTop: "10px",
              }}
            >
              ← Back to Booking Status
            </Link>

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

            <Link href={`/status/${token}`}>
              ← Back to Booking Status
            </Link>

          </div>

        </div>

      </div>

    </main>
  );
}