export const dynamic = "force-dynamic";

import Link from "next/link";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { peso, formatDate } from "@/lib/utils";
import SubmitRequest from "@/components/SubmitRequest";

export default async function Review({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <main className="status-page">
        <div className="status-page-inner">
          <div className="status-card">
            <div className="status-brand">
              The Claw Lab MNL
            </div>

            <div className="status-label">
              Booking review
            </div>

            <div className="status-header">
              <h1>Review Your Request</h1>
            </div>

            <div className="status-message">
              <p>
                We couldn't open your booking review.
                Please return to the booking form and
                try again.
              </p>
            </div>

            <div className="status-action">
              <Link
                href="/book"
                className="status-primary-button"
              >
                Back to Booking
              </Link>
            </div>

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

  const db = supabaseAdmin();

  const { data: booking } = await db
    .from("bookings")
    .select(
      `
      id,
      customer_name,
      email,
      mobile_number,
      social_handle,
      preferred_date,
      preferred_time,
      removal,
      promo_name,
      discount_amount,
      estimated_total,
      inspiration_count,
      notes,
      terms_accepted,
      access_token,
      booking_services(
        id,
        service_name,
        variation_name,
        price
      )
      `
    )
    .eq("access_token", token)
    .single();

  if (!booking) {
    return (
      <main className="status-page">
        <div className="status-page-inner">
          <div className="status-card">
            <div className="status-brand">
              The Claw Lab MNL
            </div>

            <div className="status-label">
              Booking review
            </div>

            <div className="status-header">
              <h1>Request not found</h1>
            </div>

            <div className="status-message">
              <p>
                We couldn't find this booking request.
                Please return to the booking form and
                try again.
              </p>
            </div>

            <div className="status-action">
              <Link
                href="/book"
                className="status-primary-button"
              >
                Back to Booking
              </Link>
            </div>

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

  const services = Array.isArray(booking.booking_services)
    ? booking.booking_services
    : [];

  const servicesSubtotal = services.reduce(
    (sum: number, item: any) =>
      sum + Number(item.price || 0),
    0
  );

  const storedEstimatedTotal = Number(
    booking.estimated_total || 0
  );

  const discountAmount = Math.min(
    Math.max(
      0,
      Number(booking.discount_amount || 0)
    ),
    Math.max(
      0,
      servicesSubtotal || storedEstimatedTotal
    )
  );

  const subtotal =
    servicesSubtotal > 0
      ? servicesSubtotal
      : storedEstimatedTotal;

  const estimatedTotal = Math.max(
    0,
    Math.round(
      (subtotal - discountAmount) * 100
    ) / 100
  );

  const hasDiscount =
    discountAmount > 0 &&
    booking.promo_name &&
    booking.promo_name !== "Not Applicable";

  return (
    <main className="status-page">
      <div className="status-page-inner">
        <div className="status-card">

          {/* BRAND */}
          <div className="status-brand">
            The Claw Lab MNL
          </div>

          <div className="status-header">
            <h1>Review Your Request</h1>
          </div>

          {/* INTRO */}
          <div className="status-message">
            <h2>Almost there ♡</h2>

            <p>
              Please check your booking details
              before submitting your request.
            </p>
          </div>

          {/* CUSTOMER DETAILS */}
          <section className="status-summary">
            <div className="status-summary-title">
              Customer Details
            </div>

            <div className="status-summary-grid">
              <div className="status-summary-item">
                <span>Client</span>

                <strong>
                  {booking.customer_name || "—"}
                </strong>
              </div>

              <div className="status-summary-item">
                <span>Mobile</span>

                <strong>
                  {booking.mobile_number || "—"}
                </strong>
              </div>

              <div className="status-summary-item">
                <span>Email</span>

                <strong
                  style={{
                    overflowWrap: "anywhere",
                  }}
                >
                  {booking.email || "—"}
                </strong>
              </div>

              <div className="status-summary-item">
                <span>Social Handle</span>

                <strong>
                  {booking.social_handle || "—"}
                </strong>
              </div>
            </div>
          </section>

          {/* SERVICES */}
          <section className="status-summary">
            <div className="status-summary-title">
              Services
            </div>

            <div>
              {services.map((item: any) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "15px",
                    padding: "11px 0",
                    borderBottom:
                      "1px solid rgba(0,0,0,0.07)",
                  }}
                >
                  <div>
                    <strong
                      style={{
                        display: "block",
                        fontSize: "12px",
                        lineHeight: 1.4,
                      }}
                    >
                      {item.service_name}
                    </strong>

                    {item.variation_name && (
                      <span
                        style={{
                          display: "block",
                          marginTop: "2px",
                          fontSize: "11px",
                          color: "#777",
                          lineHeight: 1.4,
                        }}
                      >
                        {item.variation_name}
                      </span>
                    )}
                  </div>

                  <strong
                    style={{
                      fontSize: "12px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {peso(Number(item.price || 0))}
                  </strong>
                </div>
              ))}
            </div>
          </section>

          {/* APPOINTMENT */}
          <section className="status-summary">
            <div className="status-summary-title">
              Appointment
            </div>

            <div className="status-summary-grid">
              <div className="status-summary-item">
                <span>Date</span>

                <strong>
                  {formatDate(
                    booking.preferred_date
                  )}
                </strong>
              </div>

              <div className="status-summary-item">
                <span>Time</span>

                <strong>
                  {booking.preferred_time || "—"}
                </strong>
              </div>
            </div>
          </section>

          {/* OTHER DETAILS */}
          <section className="status-summary">
            <div className="status-summary-title">
              Other Details
            </div>

            <div className="status-summary-grid">
              <div className="status-summary-item">
                <span>Removal</span>

                <strong>
                  {booking.removal || "None"}
                </strong>
              </div>

              <div className="status-summary-item">
                <span>Promo</span>

                <strong>
                  {booking.promo_name || "None"}
                </strong>
              </div>

              <div className="status-summary-item">
                <span>Nail Inspiration</span>

                <strong>
                  {booking.inspiration_count || 0} file(s)
                </strong>
              </div>

              <div className="status-summary-item">
                <span>Terms</span>

                <strong>
                  ✓ Accepted
                </strong>
              </div>
            </div>

            {booking.notes && (
              <div
                style={{
                  marginTop: "14px",
                  paddingTop: "12px",
                  borderTop:
                    "1px solid rgba(0,0,0,0.07)",
                }}
              >
                <span
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontSize: "10px",
                    color: "#777",
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                  }}
                >
                  Additional Notes
                </span>

                <strong
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 400,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {booking.notes}
                </strong>
              </div>
            )}
          </section>

          {/* ESTIMATED TOTAL */}
          <section
            className="status-summary"
            style={{
              marginTop: "14px",
            }}
          >
            <div className="status-summary-title">
              Estimated Total
            </div>

            <div
              style={{
                padding: "14px",
                borderRadius: "8px",
                border:
                  "1px solid rgba(190, 120, 135, 0.28)",
                background:
                  "rgba(243, 214, 220, 0.35)",
              }}
            >
              {/* SUBTOTAL */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "15px",
                  fontSize: "12px",
                }}
              >
                <span>
                  Services subtotal
                </span>

                <strong
                  style={{
                    whiteSpace: "nowrap",
                  }}
                >
                  {peso(subtotal)}
                </strong>
              </div>

              {/* DISCOUNT */}
              {hasDiscount ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "15px",
                    marginTop: "9px",
                    fontSize: "12px",
                  }}
                >
                  <div>
                    <span
                      style={{
                        display: "block",
                      }}
                    >
                      Discount
                    </span>

                    <span
                      style={{
                        display: "block",
                        marginTop: "2px",
                        fontSize: "10px",
                        color: "#777",
                        lineHeight: 1.4,
                      }}
                    >
                      {booking.promo_name}
                    </span>
                  </div>

                  <strong
                    style={{
                      whiteSpace: "nowrap",
                    }}
                  >
                    −{peso(discountAmount)}
                  </strong>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "15px",
                    marginTop: "9px",
                    fontSize: "12px",
                  }}
                >
                  <span>Discount</span>

                  <strong
                    style={{
                      whiteSpace: "nowrap",
                    }}
                  >
                    {peso(0)}
                  </strong>
                </div>
              )}

              {/* TOTAL */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "15px",
                  marginTop: "12px",
                  paddingTop: "12px",
                  borderTop:
                    "1px solid rgba(0,0,0,0.1)",
                }}
              >
                <strong
                  style={{
                    fontSize: "13px",
                  }}
                >
                  Estimated total
                </strong>

                <strong
                  style={{
                    fontSize: "20px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {peso(estimatedTotal)}
                </strong>
              </div>

              {/* DISCLAIMER */}
              <div
                style={{
                  marginTop: "12px",
                  paddingTop: "10px",
                  borderTop:
                    "1px solid rgba(0,0,0,0.08)",
                  fontSize: "10px",
                  lineHeight: 1.5,
                  color: "#666",
                }}
              >
                <strong
                  style={{
                    color: "#333",
                  }}
                >
                  Please note:
                </strong>{" "}
                This is an estimated total and includes
                the discount shown above, if applicable.
                Your final total will be confirmed after
                your booking and discount are approved.
              </div>
            </div>
          </section>

          {/* SUBMISSION NOTICE */}
          <div
            style={{
              marginTop: "12px",
              padding: "12px 14px",
              borderRadius: "8px",
              border:
                "1px solid rgba(190, 120, 135, 0.28)",
              background:
                "rgba(243, 214, 220, 0.35)",
              color: "#000",
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
              Before you submit ♡
            </strong>

            <p
              style={{
                margin: 0,
                fontSize: "11px",
                lineHeight: 1.5,
              }}
            >
              Submitting creates a{" "}
              <strong>Pending</strong> booking request.
              Your appointment is{" "}
              <strong>not confirmed yet</strong>.
              We will review your request and contact
              you with the next steps.
            </p>
          </div>

          {/* ACTIONS */}
          <div
            className="status-action"
            style={{
              marginTop: "14px",
            }}
          >
            <Link
              href={`/book?token=${encodeURIComponent(token)}`}
              className="status-primary-button"
              style={{
                background: "#f3d6dc",
                color: "#000",
                borderColor: "#f3d6dc",
                marginBottom: "8px",
              }}
            >
              Edit Request
            </Link>

            <SubmitRequest token={token} />
          </div>

          {/* CONTACT */}
          <div className="status-contact">
            <p>Questions? Message us.</p>

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
            <Link href="/book">
              Back to Booking
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