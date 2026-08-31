export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatDate, peso } from "@/lib/utils";
import BookingActions from "@/components/BookingActions";

export default async function BookingsPage() {
  const db = supabaseAdmin();

  const { data, error } = await db
    .from("bookings")
    .select(
      "id,reference_code,customer_name,mobile_number,preferred_date,preferred_time,status,estimated_total,down_payment,created_at"
    )
    .order("preferred_date", {
      ascending: true,
    })
    .order("preferred_time", {
      ascending: true,
    })
    .limit(200);

  if (error) {
    console.error(
      "Bookings page error:",
      error
    );
  }

  const bookings = data || [];

  return (
    <>
      <div className="section-head">
        <div>
          <div className="kicker">
            Operations
          </div>

          <h1 className="serif">
            Bookings
          </h1>

          <p className="muted">
            Review requests, manage appointments,
            reschedule clients, and track payments.
          </p>
        </div>
      </div>

      <div className="admin-booking-list">
        {bookings.map((booking) => {
          const total =
            Number(
              booking.estimated_total || 0
            );

          const paid =
            Number(
              booking.down_payment || 0
            );

          const remaining =
            Math.max(
              0,
              total - paid
            );

          return (
            <article
              className="admin-booking-card"
              key={booking.id}
            >
              <div className="admin-booking-main">
                <div>
                  <div className="kicker">
                    {booking.reference_code}
                  </div>

                  <h2 className="serif">
                    {booking.customer_name}
                  </h2>

                  <p className="muted">
                    {booking.mobile_number}
                  </p>
                </div>

                <span className="status-pill">
                  {booking.status}
                </span>
              </div>

              <div className="admin-booking-grid">
                <div>
                  <span className="admin-label">
                    Appointment
                  </span>

                  <strong>
                    {formatDate(
                      booking.preferred_date
                    )}
                  </strong>

                  <span className="muted">
                    {booking.preferred_time}
                  </span>
                </div>

                <div>
                  <span className="admin-label">
                    Total
                  </span>

                  <strong>
                    {peso(total)}
                  </strong>
                </div>

                <div>
                  <span className="admin-label">
                    Down payment
                  </span>

                  <strong>
                    {peso(paid)}
                  </strong>
                </div>

                <div>
                  <span className="admin-label">
                    Remaining
                  </span>

                  <strong>
                    {peso(remaining)}
                  </strong>
                </div>
              </div>

              <div className="admin-booking-actions">
                <Link
                  href={`/admin/bookings/${booking.id}`}
                  className="btn secondary small"
                >
                  Manage booking
                </Link>

                <BookingActions
                  id={booking.id}
                  status={booking.status}
                />
              </div>
            </article>
          );
        })}

        {!bookings.length && (
          <div className="card empty">
            No bookings yet.
          </div>
        )}
      </div>
    </>
  );
}