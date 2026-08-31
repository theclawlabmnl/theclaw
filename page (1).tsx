export const dynamic = "force-dynamic";

import { supabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";

export default async function Admin() {
  const db = supabaseAdmin();

  const counts = await Promise.all(
    ["pending", "approved", "payment_submitted", "confirmed", "completed"].map(
      (status) =>
        db
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("status", status)
    )
  );

  const { count: reviewCount } = await db
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <>
      <div className="section-head">
        <div>
          <div className="kicker">Admin</div>
          <h1 className="serif">Dashboard</h1>
        </div>
      </div>

      <div className="stat-grid">
        {["Pending requests", "Approved", "Payments waiting", "Confirmed", "Completed"].map(
          (label, i) => (
            <div className="card stat" key={label}>
              <div className="muted">{label}</div>
              <strong>{counts[i].count ?? 0}</strong>
            </div>
          )
        )}
      </div>

      <div className="grid" style={{ marginTop: 20 }}>
        <div className="card">
          <h3>New reviews</h3>
          <strong>{reviewCount ?? 0}</strong>
          <p className="muted">Pending moderation</p>
          <Link className="btn small secondary" href="/admin/reviews">
            Review queue
          </Link>
        </div>

        <div className="card">
          <h3>Owner approval rule</h3>
          <p className="muted">
            A submitted request remains pending until you explicitly approve or reject it.
          </p>
          <Link className="btn small" href="/admin/bookings">
            Open bookings
          </Link>
        </div>
      </div>
    </>
  );
}
