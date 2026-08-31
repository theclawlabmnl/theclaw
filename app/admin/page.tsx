export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";

const dashboardCards = [
  {
    label: "Pending requests",
    note: "Review new booking requests",
    status: "pending",
    href: "/admin/bookings?status=pending",
  },
  {
    label: "Approved",
    note: "Bookings waiting for payment",
    status: "approved",
    href: "/admin/bookings?status=approved",
  },
  {
    label: "Payments to verify",
    note: "Review uploaded payment proof",
    status: "payment_submitted",
    href: "/admin/payments",
  },
  {
    label: "Confirmed",
    note: "Upcoming confirmed appointments",
    status: "confirmed",
    href: "/admin/bookings?status=confirmed",
  },
  {
    label: "Completed",
    note: "Finished appointments",
    status: "completed",
    href: "/admin/bookings?status=completed",
  },
] as const;

const quickLinks = [
  {
    eyebrow: "Schedule",
    title: "Calendar",
    description: "Manage working hours, open slots, blocked time, and appointments.",
    href: "/admin/calendar",
  },
  {
    eyebrow: "Catalogue",
    title: "Services",
    description: "Update services, variations, prices, and durations.",
    href: "/admin/services",
  },
  {
    eyebrow: "Offers",
    title: "Promos",
    description: "Create or update your current promotional offers.",
    href: "/admin/promos",
  },
  {
    eyebrow: "Payments",
    title: "Payment settings",
    description: "Manage GCash, QR PH, processing fees, and QR images.",
    href: "/admin/settings",
  },
  {
    eyebrow: "Reviews",
    title: "Review queue",
    description: "Moderate client reviews before they appear publicly.",
    href: "/admin/reviews",
  },
] as const;

export default async function Admin() {
  const db = supabaseAdmin();

  const counts = await Promise.all(
    dashboardCards.map((item) =>
      db
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("status", item.status)
    )
  );

  const { count: reviewCount } = await db
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <div className="admin-page">
      <section className="admin-welcome">
        <div>
          <div className="kicker">The Claw Lab MNL · Nailtech</div>
          <h1 className="serif">Good day ♡</h1>
          <p className="admin-lead">
            Here’s your quick overview. Choose a section below to manage the studio.
          </p>
        </div>
      </section>

      <section>
        <div className="admin-section-title-row">
          <div>
            <div className="kicker">At a glance</div>
            <h2 className="serif">Today’s dashboard</h2>
          </div>
        </div>

        <div className="admin-stat-grid admin-stat-grid-clean">
          {dashboardCards.map((item, index) => (
            <Link href={item.href} className="admin-stat-link" key={item.label}>
              <article className="card admin-stat-card admin-stat-card-clean">
                <div className="admin-stat-topline">
                  <span>{item.label}</span>
                  <span className="admin-card-chevron">→</span>
                </div>
                <div className="admin-stat-number">{counts[index]?.count ?? 0}</div>
                <p>{item.note}</p>
              </article>
            </Link>
          ))}
        </div>
      </section>

      <section className="admin-quick-section">
        <div className="admin-section-title-row">
          <div>
            <div className="kicker">Manage</div>
            <h2 className="serif">Studio tools</h2>
          </div>
        </div>

        <div className="admin-quick-grid">
          {quickLinks.map((item) => (
            <Link key={item.href} href={item.href} className="admin-quick-link">
              <article className="card admin-quick-card">
                <div className="kicker">{item.eyebrow}</div>
                <h3 className="serif">{item.title}</h3>
                <p>{item.description}</p>
                <span className="admin-text-action">Open {item.title} →</span>
              </article>
            </Link>
          ))}
        </div>
      </section>

      <section className="admin-bottom-note">
        <div className="card admin-help-card">
          <div>
            <div className="kicker">Reviews</div>
            <h3 className="serif">{reviewCount ?? 0} review{(reviewCount ?? 0) === 1 ? "" : "s"} waiting</h3>
            <p>Keep your public review section tidy by approving or hiding reviews here.</p>
          </div>
          <Link className="btn secondary small" href="/admin/reviews">Review queue →</Link>
        </div>
      </section>
    </div>
  );
}
