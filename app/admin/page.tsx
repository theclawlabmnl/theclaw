export const dynamic = "force-dynamic";

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

const quickLinks = [
  {
    eyebrow: "Schedule",
    title: "Calendar",
    description:
      "Manage working hours, open slots, blocked time, and appointments.",
    href: "/admin/calendar",
  },
  {
    eyebrow: "Catalogue",
    title: "Services",
    description:
      "Update services, variations, prices, and durations.",
    href: "/admin/services",
  },
  {
    eyebrow: "Offers",
    title: "Promos",
    description:
      "Create or update your current promotional offers.",
    href: "/admin/promos",
  },
  {
    eyebrow: "Payments",
    title: "Payment settings",
    description:
      "Manage GCash, QR PH, processing fees, and QR images.",
    href: "/admin/settings",
  },
  {
    eyebrow: "Reviews",
    title: "Review queue",
    description:
      "Moderate client reviews before they appear publicly.",
    href: "/admin/reviews",
  },
] as const;

function formatMoney(value: number) {
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function Admin() {
  const db = supabaseAdmin();

  const countResults = await Promise.all(
    dashboardCards.map(async (item) => {
      const status = item.href.includes("status=")
        ? item.href.split("status=")[1]
        : null;

      if (!status) return 0;

      const { count, error } = await db
        .from("bookings")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("status", status);

      if (error) {
        console.error(
          "Dashboard count error:",
          error
        );

        return 0;
      }

      return count || 0;
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
    .select(
      "amount,net_amount,processing_fee,status"
    )
    .eq("status", "verified");

  if (verifiedPaymentsError) {
    console.error(
      "Net income query error:",
      verifiedPaymentsError
    );
  }

  const totalNetIncome = (
    verifiedPayments || []
  ).reduce(
    (total: number, payment: any) => {
      const net = Number(
        payment.net_amount ??
          payment.amount ??
          0
      );

      return total + Math.max(0, net);
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

  const cardCounts = dashboardCards.map(
    (item, index) => {
      if (
        item.label ===
        "Payments to verify"
      ) {
        return (
          paymentVerificationCount || 0
        );
      }

      return countResults[index] || 0;
    }
  );

  return (
    <div className="admin-page">
      {/* WELCOME */}
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

      {/* DASHBOARD */}
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
          {/* BOOKING STATUS CARDS */}
          {dashboardCards.map(
            (item, index) => (
              <Link
                key={item.label}
                href={item.href}
                style={{
                  display: "flex",
                  textDecoration:
                    "none",
                  minWidth: 0,
                }}
              >
                <article
                  className="card"
                  style={{
                    width: "100%",
                    minHeight: 145,
                    height: 145,
                    padding:
                      "18px 20px",
                    display: "flex",
                    flexDirection:
                      "column",
                    justifyContent:
                      "space-between",
                    boxSizing:
                      "border-box",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "space-between",
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
                      {
                        cardCounts[
                          index
                        ]
                      }
                    </div>

                    <p
                      className="muted"
                      style={{
                        margin: 0,
                        fontSize: 12,
                        lineHeight:
                          1.45,
                      }}
                    >
                      {item.note}
                    </p>
                  </div>
                </article>
              </Link>
            )
          )}

          {/* TOTAL NET INCOME */}
          <article
            className="card"
            style={{
              width: "100%",
              minHeight: 145,
              height: 145,
              padding: "18px 20px",
              display: "flex",
              flexDirection:
                "column",
              justifyContent:
                "space-between",
              boxSizing:
                "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
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
                {formatMoney(
                  totalNetIncome
                )}
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

          {/* REVIEWS WAITING */}
          <Link
            href="/admin/reviews"
            style={{
              display: "flex",
              textDecoration:
                "none",
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
                flexDirection:
                  "column",
                justifyContent:
                  "space-between",
                boxSizing:
                  "border-box",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "space-between",
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
                  {reviewCount || 0}
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

      {/* STUDIO TOOLS */}
      <section
        style={{
          marginTop: 38,
        }}
      >
        <div
          className="admin-section-title-row"
          style={{
            marginBottom: 16,
          }}
        >
          <div>
            <div className="kicker">
              Manage
            </div>

            <h2
              className="serif"
              style={{
                margin: "4px 0 0",
              }}
            >
              Studio tools
            </h2>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            gap: 16,
            alignItems: "stretch",
          }}
        >
          {quickLinks.map(
            (item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  textDecoration:
                    "none",
                  minWidth: 0,
                }}
              >
                <article
                  className="card"
                  style={{
                    width: "100%",
                    minHeight: 175,
                    height: 200,
                    padding:
                      "20px 22px",
                    display: "flex",
                    flexDirection:
                      "column",
                    boxSizing:
                      "border-box",
                  }}
                >
                  <div className="kicker">
                    {item.eyebrow}
                  </div>

                  <h3
                    className="serif"
                    style={{
                      margin:
                        "6px 0 9px",
                      fontSize: 22,
                      lineHeight: 1.15,
                    }}
                  >
                    {item.title}
                  </h3>

                  <p
                    className="muted"
                    style={{
                      margin: 0,
                      fontSize: 12,
                      lineHeight: 1.55,
                    }}
                  >
                    {item.description}
                  </p>

                  <span
                    style={{
                      marginTop:
                        "auto",
                      paddingTop: 12,
                      fontSize: 12,
                      fontWeight: 600,
                      lineHeight: 1.2,
                    }}
                  >
                    Open{" "}
                    {item.title} →
                  </span>
                </article>
              </Link>
            )
          )}
        </div>
      </section>
    </div>
  );
}