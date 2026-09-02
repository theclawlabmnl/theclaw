export const dynamic = "force-dynamic";

import Link from "next/link";

import { supabaseAdmin } from "@/lib/supabase-admin";

import StatusAutoRefresh from "@/components/StatusAutoRefresh";

const STATUS_WINDOW_DAYS = 5;

function getAppointmentDateTime(
  dateValue: string | null | undefined,
  timeValue: string | null | undefined
): Date | null {
  if (!dateValue || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return null;
  }

  const time = String(timeValue || "00:00").slice(0, 5);

  if (!/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }

  const date = new Date(`${dateValue}T${time}:00+08:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function hasActiveStatusAccess(
  appointmentDate: string | null | undefined,
  appointmentTime: string | null | undefined
) {
  const appointment = getAppointmentDateTime(
    appointmentDate,
    appointmentTime
  );

  if (!appointment) {
    return false;
  }

  const expiry =
    appointment.getTime() +
    STATUS_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  return Date.now() <= expiry;
}

function getStatusContent(status: string) {
  switch (status) {
    case "pending":
      return {
        label: "Pending",
        title: "Your booking request is pending.",
        description:
          "We are reviewing your booking request. Please check this page again for updates.",
        tone: "pending",
      };

    case "approved":
      return {
        label: "Payment Required",
        title: "Your booking has been approved.",
        description:
          "Your appointment is ready for the payment step. Please submit the required down payment to secure your appointment.",
        tone: "approved",
      };

    case "payment_submitted":
      return {
        label: "Payment Submitted",
        title: "Your payment is being reviewed.",
        description:
          "Thank you! Your payment proof has been received and is now being reviewed by The Claw Lab MNL.",
        tone: "review",
      };

    case "confirmed":
      return {
        label: "Confirmed",
        title: "Your appointment is confirmed ✨",
        description:
          "Your payment has been verified and your appointment is officially confirmed.",
        tone: "confirmed",
      };

    case "completed":
      return {
        label: "Completed",
        title: "Your appointment has been completed. ♡",
        description:
          "Thank you for visiting The Claw Lab MNL. We would love to hear about your experience.",
        tone: "completed",
      };

    case "cancelled":
      return {
        label: "Cancelled",
        title: "This booking has been cancelled.",
        description:
          "Please message us if you need assistance.",
        tone: "cancelled",
      };

    case "rejected":
      return {
        label: "Not Approved",
        title: "This booking request was not approved.",
        description:
          "Please message us if you need help with another booking.",
        tone: "rejected",
      };

    default:
      return {
        label: "Updated",
        title: "Your booking status has been updated.",
        description:
          "Please check this page again for the latest update.",
        tone: "default",
      };
  }
}

export default async function Status({
  params,
}: {
  params: Promise<{
    token: string;
  }>;
}) {
  const { token } = await params;

  const db = supabaseAdmin();

  const { data: booking } = await db
    .from("bookings")
    .select(
      `
      id,
      status,
      reference_code,
      customer_name,
      preferred_date,
      preferred_time,
      access_token
      `
    )
    .eq("access_token", token)
    .single();

  /*
   * BOOKING NOT FOUND
   */
  if (!booking) {
    return (
      <main className="status-page">
        <div className="status-page-inner">
          <div className="status-card">

            <div className="status-brand">
              The Claw Lab MNL
            </div>

            <div className="status-label">
              Booking status
            </div>

            <h1>
              Booking not found
            </h1>

            <p className="status-description">
              We couldn't find this booking.
              Please check your booking ID or
              return to the status lookup page.
            </p>

            <Link
              href="/status"
              className="status-primary-button"
            >
              Check another booking
            </Link>

            <div
              style={{
                marginTop: "10px",
                textAlign: "center",
              }}
            >
              <Link
                href="/"
                style={{
                  fontSize: "11px",
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
      </main>
    );
  }

  /*
   * STATUS EXPIRY
   */
  const statusActive = hasActiveStatusAccess(
    booking.preferred_date,
    booking.preferred_time
  );

  if (!statusActive) {
    return (
      <main className="status-page">
        <div className="status-page-inner">
          <div className="status-card">

            <div className="status-brand">
              The Claw Lab MNL
            </div>

            <div className="status-label">
              Booking status
            </div>

            <h1>
              Status no longer available
            </h1>

            <p className="status-description">
              Online booking status is available
              until 5 days after your scheduled
              appointment time.
            </p>

            <Link
              href="/status"
              className="status-primary-button"
            >
              Check another booking
            </Link>

            <p className="status-help">
              Need help? Message us.
            </p>

            <div
              style={{
                marginTop: "10px",
                textAlign: "center",
              }}
            >
              <Link
                href="/"
                style={{
                  fontSize: "11px",
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
      </main>
    );
  }

  const status = String(booking.status || "");

  const content = getStatusContent(status);

  /*
   * VIEW CONFIRMATION IS ONLY AVAILABLE
   * FOR CONFIRMED BOOKINGS.
   *
   * COMPLETED BOOKINGS DO NOT SHOW
   * VIEW CONFIRMATION.
   */
  const canViewConfirmation =
    status === "confirmed";

  const appointmentText =
    booking.preferred_date || "—";

  const timeText =
    booking.preferred_time
      ? ` · ${booking.preferred_time}`
      : "";

  return (
    <main className="status-page">

      {status === "payment_submitted" && (
        <StatusAutoRefresh />
      )}

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

          {/* STATUS */}
          <div
            className={`status-pill status-pill-${content.tone}`}
          >
            <span className="status-pill-dot" />
            {content.label}
          </div>

          {/* MESSAGE */}
          <div className="status-message">

            <h2>
              {content.title}
            </h2>

            <p>
              {content.description}
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
                  {appointmentText}
                  {timeText}
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

          {/* ACTION */}
          <div className="status-action">

            {/* APPROVED */}
            {status === "approved" && (
              <>
                <section
                  style={{
                    marginBottom: "12px",
                    padding: "9px 12px",
                    borderRadius: "7px",
                    border:
                      "1px solid rgba(190, 50, 50, 0.35)",
                    background:
                      "rgba(190, 50, 50, 0.07)",
                    color: "#000",
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      marginBottom: "2px",
                      fontSize: "12px",
                      lineHeight: 1.3,
                    }}
                  >
                    ⏰ 3-Hour Payment Deadline
                  </strong>

                  <p
                    style={{
                      margin: 0,
                      lineHeight: 1.4,
                      fontSize: "11px",
                    }}
                  >
                    Your appointment is reserved for{" "}
                    <strong>
                      3 hours after approval
                    </strong>
                    . Please submit your payment
                    and payment proof within this time.
                    If payment is not submitted within
                    3 hours, your booking will be{" "}
                    <strong>
                      automatically cancelled
                    </strong>
                    .
                  </p>
                </section>

                <Link
                  href={`/payment/${token}`}
                  className="status-primary-button"
                >
                  Proceed to Payment
                </Link>
              </>
            )}

            {/* CONFIRMED ONLY */}
            {canViewConfirmation && (
              <Link
                href={`/confirmed/${token}`}
                className="status-primary-button"
              >
                View Confirmation
              </Link>
            )}

            {/* PAYMENT SUBMITTED */}
            {status === "payment_submitted" && (
              <div className="status-review-box">
                <strong>
                  Payment Proof submitted
                </strong>

                <p>
                  This page will automatically
                  update once your payment has
                  been verified.
                </p>
              </div>
            )}

            {/* COMPLETED */}
            {status === "completed" && (
              <>
                {/* REVIEW REQUEST */}
                <section
                  style={{
                    marginTop: "4px",
                    marginBottom: "12px",
                    padding: "12px 14px",
                    borderRadius: "8px",
                    border:
                      "1px solid rgba(190, 120, 135, 0.28)",
                    background:
                      "rgba(243, 214, 220, 0.35)",
                    color: "#000",
                    textAlign: "center",
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      marginBottom: "4px",
                      fontSize: "13px",
                      lineHeight: 1.35,
                    }}
                  >
                    Loved your experience? ♡
                  </strong>

                  <p
                    style={{
                      margin: 0,
                      fontSize: "11px",
                      lineHeight: 1.5,
                    }}
                  >
                    We would love to hear what you
                    thought about your appointment.
                    Your feedback helps The Claw Lab MNL
                    and future clients.
                  </p>
                </section>

                {/* LEAVE A REVIEW */}
                <Link
                  href={`/review/${booking.access_token}?booking_id=${encodeURIComponent(
                    booking.id
                  )}`}
                  className="status-primary-button"
                >
                  Leave a Review ♡
                </Link>

                {/* BOOK AGAIN */}
                <Link
                  href="/book"
                  className="status-primary-button"
                  style={{
                    marginTop: "8px",
                    background: "#f3d6dc",
                    color: "#000",
                    borderColor: "#f3d6dc",
                  }}
                >
                  Book Again
                </Link>
              </>
            )}

          </div>

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

            <Link href="/status">
              Check another booking
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

    </main>
  );
}
