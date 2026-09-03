export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import BookingCalendar from "@/components/BookingCalendar";

export default async function BookingCalendarPage() {
  const db = supabaseAdmin();

  const { data, error } = await db
    .from("bookings")
    .select(
      `
        id,
        reference_code,
        customer_name,
        mobile_number,
        preferred_date,
        preferred_time,
        status
      `
    )
    .neq("status", "draft")
    .order("preferred_date", {
      ascending: true,
    })
    .order("preferred_time", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Admin booking calendar error:",
      error
    );
  }

  const bookings = data || [];

  return (
    <div className="admin-page booking-calendar-page">
      <header className="booking-calendar-header">
        <div>
          <div className="kicker">OPERATIONS</div>

          <h1 className="serif">
            Booking Calendar
          </h1>

          <p className="muted">
            Select a date to view the bookings scheduled for that day.
          </p>
        </div>

        <Link
          href="/admin/bookings"
          className="btn secondary"
        >
          ← Back to bookings
        </Link>
      </header>

      <BookingCalendar bookings={bookings} />
    </div>
  );
}
