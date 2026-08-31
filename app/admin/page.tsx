export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";

export default async function AdminDashboard() {
  const db = supabaseAdmin();

  const [
    pending,
    approved,
    paymentSubmitted,
    confirmed,
    completed,
    pendingReviews,
  ] = await Promise.all([
    db
      .from("bookings")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "pending"),

    db
      .from("bookings")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "approved"),

    db
      .from("bookings")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "payment_submitted"),

    db
      .from("bookings")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "confirmed"),

    db
      .from("bookings")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "completed"),

    db
      .from("reviews")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "pending"),
  ]);

  const stats = [
    {
      label: "Pending requests",
      value: pending.count || 0,
      href: "/admin/bookings",
    },
    {
      label: "Approved",
      value: approved.count || 0,
      href: "/admin/bookings",
    },
    {
      label: "Payments to verify",
      value: paymentSubmitted.count || 0,
      href: "/admin/payments",
    },
    {
      label: "Confirmed",
      value: confirmed.count || 0,
      href: "/admin/bookings",
    },
    {
      label: "Completed",
      value: completed.count || 0,
      href: "/admin/bookings",
    },
  ];

  return (
    <div className="dashboard-page">
      <header className="admin-page-header">
        <div>
          <div className="kicker">
            Owner dashboard
          </div>

          <h1 className="serif">
            Good day ♡
          </h1>

          <p className="muted">
            Keep an eye on bookings, payments, and
            your studio schedule.
          </p>
        </div>
      </header>

      <section className="admin-stats">
        {stats.map((stat) => (
          <Link
            href={stat.href}
            className="admin-stat-card"
            key={stat.label}
          >
            <span>{stat.label}</span>

            <strong>{stat.value}</strong>

            <small>
              View details →
            </small>
          </Link>
        ))}
      </section>

      <section className="admin-dashboard-grid">
        <div className="card admin-dashboard-card">
          <div className="kicker">
            Reviews
          </div>

          <h2 className="serif">
            Review queue
          </h2>

          <p className="dashboard-number">
            {pendingReviews.count || 0}
          </p>

          <p className="muted">
            Reviews waiting for your approval.
          </p>

          <Link
            href="/admin/reviews"
            className="btn small"
          >
            Open reviews
          </Link>
        </div>

        <div className="card admin-dashboard-card">
          <div className="kicker">
            Schedule
          </div>

          <h2 className="serif">
            Availability
          </h2>

          <p className="muted">
            Manage your normal working hours,
            semester schedule, extra openings, and
            blocked time.
          </p>

          <Link
            href="/admin/calendar"
            className="btn small"
          >
            Manage calendar
          </Link>
        </div>

        <div className="card admin-dashboard-card">
          <div className="kicker">
            Services
          </div>

          <h2 className="serif">
            Your menu
          </h2>

          <p className="muted">
            Update service names, prices, duration,
            and variations.
          </p>

          <Link
            href="/admin/services"
            className="btn small"
          >
            Manage services
          </Link>
        </div>

        <div className="card admin-dashboard-card">
          <div className="kicker">
            Promotions
          </div>

          <h2 className="serif">
            Promo offers
          </h2>

          <p className="muted">
            Create, edit, activate, or remove your
            promotions.
          </p>

          <Link
            href="/admin/promos"
            className="btn small"
          >
            Manage promos
          </Link>
        </div>

        <div className="card admin-dashboard-card">
          <div className="kicker">
            Payments
          </div>

          <h2 className="serif">
            Payment verification
          </h2>

          <p className="muted">
            Review payment submissions and verify
            customer payment proof.
          </p>

          <Link
            href="/admin/payments"
            className="btn small"
          >
            Open payments
          </Link>
        </div>

        <div className="card admin-dashboard-card">
          <div className="kicker">
            Settings
          </div>

          <h2 className="serif">
            Studio settings
          </h2>

          <p className="muted">
            Update payment details, QR codes, contact
            information, and studio policies.
          </p>

          <Link
            href="/admin/settings"
            className="btn small"
          >
            Open settings
          </Link>
        </div>
      </section>
    </div>
  );
}