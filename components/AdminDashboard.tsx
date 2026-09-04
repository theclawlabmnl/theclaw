import Link from "next/link";

import { supabaseAdmin } from "@/lib/supabase-admin";

const dashboardCards = [
  {
    label: "Pending requests",
    note: "Review new booking requests",
    href: "/admin/bookings?status=pending",
  },
  {
    label: "Approved",
    note: "Bookings waiting for payment",
    href: "/admin/bookings?status=approved",
  },
  {
    label: "Payments to verify",
    note: "Review uploaded payment proof",
    href: "/admin/payments",
  },
  {
    label: "Confirmed",
    note: "Upcoming confirmed appointments",
    href: "/admin/bookings?status=confirmed",
  },
  {
    label: "Completed",
    note: "Finished appointments",
    href: "/admin/bookings?status=completed",
  },
  {
    label: "Cancelled",
    note: "Cancelled booking requests",
    href: "/admin/bookings?status=cancelled",
  },
] as const;


function formatMoney(value: number) {
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function AdminDashboard() {
  const db = supabaseAdmin();

  const bookingStatuses = [
    "pending",
    "approved",
    "confirmed",
    "completed",
    "cancelled",
  ] as const;

  const bookingCountResults = await Promise.all(
    bookingStatuses.map(async (status) => {
      const { count, error } = await db
        .from("bookings")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("status", status);

      if (error) {
        console.error(
          `Dashboard booking count error (${status}):`,
          error
        );

        return 0;
      }

      return count ?? 0;
    })
  );

  const {
    count: paymentVerificationCount,
    error: paymentVerificationError,
  } = await db
    .from("payments")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("status", "submitted");

  if (paymentVerificationError) {
    console.error(
      "Payment verification count error:",
      paymentVerificationError
    );
  }

  const {
    data: verifiedPayments,
    error: verifiedPaymentsError,
  } = await db
    .from("payments")
    .select("amount, net_amount, processing_fee")
    .eq("status", "verified");

  if (verifiedPaymentsError) {
    console.error(
      "Net income query error:",
      verifiedPaymentsError
    );
  }

  const totalNetIncome = (verifiedPayments ?? []).reduce(
    (total: number, payment) => {
      const netAmount = Number(
        payment.net_amount ??
          payment.amount ??
          0
      );

      return total + Math.max(0, netAmount);
    },
    0
  );

  const {
    count: reviewCount,
    error: reviewCountError,
  } = await db
    .from("reviews")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("status", "pending");

  if (reviewCountError) {
    console.error(
      "Review count error:",
      reviewCountError
    );
  }

  const cardCounts = [
    bookingCountResults[0] ?? 0,
    bookingCountResults[1] ?? 0,
    paymentVerificationCount ?? 0,
    bookingCountResults[2] ?? 0,
    bookingCountResults[3] ?? 0,
    bookingCountResults[4] ?? 0,
  ];

  return (
    <div className="admin-page">
      <section
        className="admin-welcome"
        style={{
          marginBottom: 34,
        }}
      >
        <div>
          <div className="kicker">
            The Claw Lab MNL · Nails by Arkie
          </div>

          <h1
            className="serif"
            style={{
              margin: "5px 0 7px",
            }}
          >
            Good day ♡
          </h1>

          <p
            className="admin-lead"
            style={{
              margin: 0,
              maxWidth: 620,
            }}
          >
            Here’s your quick overview.
            Choose a section below to
            manage the studio.
          </p>
        </div>
      </section>

      <section>
        <div
          className="admin-section-title-row"
          style={{
            marginBottom: 16,
          }}
        >
          <div>
            <div className="kicker">
              At a glance
            </div>

            <h2
              className="serif"
              style={{
                margin: "4px 0 0",
              }}
            >
              Today’s dashboard
            </h2>
          </div>
        </div>

        <div
          className="admin-stat-grid"
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            gap: 16,
            alignItems: "stretch",
          }}
        >
          {dashboardCards.map(
            (item, index) => (
              <Link
                key={item.label}
                href={item.href}
                style={{
                  display: "flex",
                  textDecoration: "none",
                  minWidth: 0,
                }}
              >
                <article
                  className="card"
                  style={{
                    width: "100%",
                    minHeight: 145,
                    height: 145,
                    padding: "18px 20px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <span
                      className="muted"
                      style={{
                        fontSize: 12,
                      }}
                    >
                      {item.label}
                    </span>

                    <span
                      style={{
                        fontSize: 16,
                        lineHeight: 1,
                      }}
                    >
                      →
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                    }}
                  >
                    <div
                      className="serif"
                      style={{
                        fontSize: 34,
                        lineHeight: 1,
                        marginBottom: 7,
                      }}
                    >
                      {cardCounts[index]}
                    </div>

                    <p
                      className="muted"
                      style={{
                        margin: 0,
                        fontSize: 12,
                        lineHeight: 1.45,
                      }}
                    >
                      {item.note}
                    </p>
                  </div>
                </article>
              </Link>
            )
          )}

          <article
            className="card"
            style={{
              width: "100%",
              minHeight: 145,
              height: 145,
              padding: "18px 20px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span
                className="muted"
                style={{
                  fontSize: 12,
                }}
              >
                Total net income
              </span>

              <span
                style={{
                  fontSize: 12,
                }}
              >
                Verified
              </span>
            </div>

            <div
              style={{
                marginTop: 10,
              }}
            >
              <div
                className="serif"
                style={{
                  fontSize: 30,
                  lineHeight: 1.1,
                  marginBottom: 7,
                }}
              >
                {formatMoney(totalNetIncome)}
              </div>

              <p
                className="muted"
                style={{
                  margin: 0,
                  fontSize: 12,
                  lineHeight: 1.45,
                }}
              >
                Verified payments after
                excluding separate QR PH
                processing fees.
              </p>
            </div>
          </article>

          <Link
            href="/admin/reviews"
            style={{
              display: "flex",
              textDecoration: "none",
              minWidth: 0,
            }}
          >
            <article
              className="card"
              style={{
                width: "100%",
                minHeight: 145,
                height: 145,
                padding: "18px 20px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <span
                  className="muted"
                  style={{
                    fontSize: 12,
                  }}
                >
                  Reviews waiting
                </span>

                <span
                  style={{
                    fontSize: 16,
                    lineHeight: 1,
                  }}
                >
                  →
                </span>
              </div>

              <div
                style={{
                  marginTop: 10,
                }}
              >
                <div
                  className="serif"
                  style={{
                    fontSize: 34,
                    lineHeight: 1,
                    marginBottom: 7,
                  }}
                >
                  {reviewCount ?? 0}
                </div>

                <p
                  className="muted"
                  style={{
                    margin: 0,
                    fontSize: 12,
                    lineHeight: 1.45,
                  }}
                >
                  Approve or hide new reviews
                  before they appear publicly.
                </p>
              </div>
            </article>
          </Link>
        </div>
      </section>

    </div>
  );
}