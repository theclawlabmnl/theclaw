export const dynamic = "force-dynamic";

import Link from "next/link";

import { supabaseAdmin } from "@/lib/supabase-admin";

import {
  formatDate,
  peso,
} from "@/lib/utils";

const INSTRUCTIONS_URL =
  "https://drive.google.com/drive/folders/1rC9dDjIRK_eQGOiGQFVQAXopEtvo3zIp?usp=drive_link";

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

  if (
    !booking ||
    booking.status !== "confirmed"
  ) {
    return (
      <main className="form-page">
        <div
          className="container card"
          style={{
            maxWidth: 780,
          }}
        >
          <div className="kicker">
            Appointment
          </div>

          <h1 className="serif">
            Confirmation is not available yet
          </h1>

          <p
            className="muted"
            style={{
              lineHeight: 1.6,
            }}
          >
            Your appointment confirmation
            will appear here once your
            payment has been verified by
            The Claw Lab.
          </p>

          <div
            style={{
              marginTop: 20,
              textAlign: "center",
            }}
          >
            <Link
              href={`/status/${token}`}
              className="muted"
              style={{
                fontSize: 13,
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              ← Back to booking status
            </Link>
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

  return (
    <main className="form-page">
      <div
        className="container"
        style={{
          maxWidth: 780,
        }}
      >
        <div
          className="card"
          style={{
            padding: 30,
          }}
        >
          <div
            style={{
              textAlign: "center",
            }}
          >
            <div className="kicker">
              You're booked
            </div>

            <h1
              className="serif"
              style={{
                fontSize: 46,
                margin: "7px 0 10px",
              }}
            >
              Appointment Confirmed ✨
            </h1>

            <p
              className="muted"
              style={{
                lineHeight: 1.6,
                margin: "0 auto",
                maxWidth: 580,
              }}
            >
              Your payment has been verified
              by TheClawLab MNL and your
              appointment is officially
              confirmed.
            </p>
          </div>

          <div
            style={{
              marginTop: 26,
              padding: "18px 16px",
              border: "1px solid var(--line)",
              borderRadius: 14,
              background: "var(--soft)",
              textAlign: "center",
            }}
          >
            <div className="muted">
              Booking reference
            </div>

            <strong
              style={{
                display: "block",
                marginTop: 4,
                fontSize: 20,
                letterSpacing: "0.03em",
              }}
            >
              {booking.reference_code}
            </strong>
          </div>

          <div
            style={{
              marginTop: 28,
            }}
          >
            <div className="kicker">
              Appointment
            </div>

            <h2
              className="serif"
              style={{
                margin: "6px 0 12px",
                fontSize: 28,
              }}
            >
              {booking.customer_name}
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <div
                style={{
                  padding: "13px 14px",
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                }}
              >
                <div className="muted">
                  Date
                </div>

                <strong>
                  {formatDate(
                    booking.preferred_date
                  )}
                </strong>
              </div>

              <div
                style={{
                  padding: "13px 14px",
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                }}
              >
                <div className="muted">
                  Time
                </div>

                <strong>
                  {booking.preferred_time}
                </strong>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 28,
              paddingTop: 22,
              borderTop: "1px solid var(--line)",
            }}
          >
            <div className="kicker">
              Appointment summary
            </div>

            <h2
              className="serif"
              style={{
                margin: "6px 0 10px",
                fontSize: 29,
              }}
            >
              Services
            </h2>

            {(booking.booking_services || []).map(
              (item: any) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 18,
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
                          marginTop: 2,
                        }}
                      >
                        {item.variation_name}
                      </div>
                    )}
                  </div>

                  <strong
                    style={{
                      whiteSpace: "nowrap",
                    }}
                  >
                    {peso(item.price)}
                  </strong>
                </div>
              )
            )}

            <div
              style={{
                display: "grid",
                gap: 8,
                marginTop: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
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
                  justifyContent: "space-between",
                  gap: 12,
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
                  justifyContent: "space-between",
                  gap: 12,
                  marginTop: 4,
                  paddingTop: 12,
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
          </div>

          <div
            style={{
              marginTop: 28,
              paddingTop: 22,
              borderTop: "1px solid var(--line)",
            }}
          >
            <div className="kicker">
              Before your appointment
            </div>

            <h2
              className="serif"
              style={{
                margin: "6px 0 8px",
                fontSize: 29,
              }}
            >
              Appointment instructions
            </h2>

            <p
              className="muted"
              style={{
                lineHeight: 1.65,
              }}
            >
              Please review the appointment
              instructions, studio reminders,
              policies, and other important
              information before your visit.
            </p>

            <a
              className="btn secondary"
              href={INSTRUCTIONS_URL}
              target="_blank"
              rel="noreferrer"
              style={{
                marginTop: 6,
              }}
            >
              View Appointment Instructions →
            </a>
          </div>

          <div
            style={{
              marginTop: 28,
              paddingTop: 22,
              borderTop: "1px solid var(--line)",
            }}
          >
            <div className="kicker">
              Need help?
            </div>

            <h2
              className="serif"
              style={{
                margin: "6px 0 8px",
                fontSize: 29,
              }}
            >
              Questions? Message us.
            </h2>

            <p
              className="muted"
              style={{
                lineHeight: 1.65,
                marginBottom: 14,
              }}
            >
              If you have any questions about
              your appointment, just message us
              and we'll be happy to help.
            </p>

            <div
              className="actions"
              style={{
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <a
                className="btn secondary"
                href="https://instagram.com/theclawlabmnl"
                target="_blank"
                rel="noreferrer"
              >
                Instagram
              </a>

              <a
                className="btn secondary"
                href="https://m.me/theclawlabmnl"
                target="_blank"
                rel="noreferrer"
              >
                Messenger
              </a>
            </div>
          </div>

          <div
            style={{
              marginTop: 28,
              textAlign: "center",
            }}
          >
            <Link
              href={`/status/${token}`}
              className="muted"
              style={{
                fontSize: 13,
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              ← Back to booking status
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}