export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatDate, peso } from "@/lib/utils";
import BookingEditor from "@/components/BookingEditor";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;

  const db = supabaseAdmin();

  const [
    bookingResult,
    servicesResult,
    paymentsResult,
  ] = await Promise.all([
    db
      .from("bookings")
      .select("*")
      .eq("id", id)
      .single(),

    db
      .from("booking_services")
      .select("*")
      .eq("booking_id", id),

    db
      .from("payments")
      .select("*")
      .eq("booking_id", id)
      .order("created_at", {
        ascending: false,
      }),
  ]);

  if (!bookingResult.data) {
    notFound();
  }

  const booking =
    bookingResult.data;

  const bookingServices =
    servicesResult.data || [];

  const payments =
    paymentsResult.data || [];

  const {
    data: services,
  } = await db
    .from("services")
    .select(
      "id,name,description,price,duration_minutes,active,sort_order,service_variations(id,service_id,name,price_delta,duration_delta_minutes,active,sort_order)"
    )
    .order("sort_order");

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
    <>
      <div className="section-head admin-booking-detail-head">
        <div>
          <Link
            href="/admin/bookings"
            className="muted admin-back-link"
          >
            ← Back to bookings
          </Link>

          <div className="kicker">
            {booking.reference_code}
          </div>

          <h1 className="serif">
            {booking.customer_name}
          </h1>

          <p className="muted">
            {formatDate(
              booking.preferred_date
            )}{" "}
            ·{" "}
            {booking.preferred_time}
          </p>
        </div>

        <span className="status-pill">
          {booking.status}
        </span>
      </div>

      <div className="booking-detail-summary">
        <div>
          <span>Total</span>

          <strong>
            {peso(total)}
          </strong>
        </div>

        <div>
          <span>Down payment</span>

          <strong>
            {peso(paid)}
          </strong>
        </div>

        <div>
          <span>Remaining</span>

          <strong>
            {peso(remaining)}
          </strong>
        </div>
      </div>

      <BookingEditor
        booking={booking}
        bookingServices={
          bookingServices
        }
        services={
          services || []
        }
        payments={
          payments
        }
      />
    </>
  );
}