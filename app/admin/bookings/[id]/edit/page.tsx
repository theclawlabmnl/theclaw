import Link from "next/link";
import { notFound } from "next/navigation";

import { supabaseAdmin } from "@/lib/supabase-admin";
import AdminBookingEditForm from "@/components/AdminBookingEditForm";

export const dynamic = "force-dynamic";

export default async function AdminBookingEditPage({
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
    settingsResult,
    paymentsResult,
  ] = await Promise.all([
    db
      .from("bookings")
      .select(`
        id,
        reference_code,
        status,
        customer_name,
        mobile_number,
        social_handle,
        preferred_date,
        preferred_time,
        removal,
        notes,
        estimated_total,
        down_payment,
        discount_verified,
        discount_amount,
        booking_services(
          id,
          service_id,
          variation_id,
          service_name,
          variation_name,
          price,
          duration_minutes
        )
      `)
      .eq("id", id)
      .single(),

    db
      .from("services")
      .select(`
        id,
        name,
        description,
        price,
        duration_minutes,
        active,
        service_variations(
          id,
          service_id,
          name,
          price_delta,
          duration_delta_minutes,
          active,
          sort_order
        )
      `)
      .eq("active", true)
      .order("sort_order", {
        ascending: true,
      }),

    db
      .from("site_settings")
      .select("key,value")
      .eq("key", "removal_options")
      .maybeSingle(),

    db
      .from("payments")
      .select(`
        id,
        booking_id,
        method,
        amount,
        status,
        verified_at,
        created_at,
        payment_type,
        gross_amount,
        processing_fee,
        net_amount,
        note,
        paid_at
      `)
      .eq("booking_id", id)
      .order("created_at", {
        ascending: false,
      }),
  ]);

  const booking = bookingResult.data;

  if (bookingResult.error || !booking) {
    notFound();
  }

  const services = servicesResult.data || [];
  const payments = paymentsResult.data || [];

  /*
   * Only verified payments count toward the booking.
   */
  const verifiedPayments = payments.filter(
    (payment) =>
      payment.status === "verified" ||
      Boolean(payment.verified_at)
  );

  /*
   * Down payment.
   *
   * Supports both:
   * - down_payment
   * - booking_payment (legacy records)
   *
   * Use net_amount when available so QR PH's
   * processing fee is never counted toward
   * the booking balance.
   */
  const verifiedDownPayment =
    verifiedPayments
      .filter(
        (payment) =>
          payment.payment_type === "down_payment" ||
          payment.payment_type === "booking_payment"
      )
      .reduce(
        (sum, payment) =>
          sum +
          Number(
            payment.net_amount ??
              payment.amount ??
              0
          ),
        0
      );

  /*
   * Additional verified balance payments.
   */
  const verifiedBalancePayments =
    verifiedPayments
      .filter(
        (payment) =>
          payment.payment_type === "balance"
      )
      .reduce(
        (sum, payment) =>
          sum +
          Number(
            payment.net_amount ??
              payment.amount ??
              0
          ),
        0
      );

  /*
   * ORIGINAL TOTAL
   */
  const originalTotal = Number(
    booking.estimated_total || 0
  );

  /*
   * DISCOUNT
   *
   * If discount is verified:
   * - use the stored discount amount if it exists
   * - otherwise calculate the 5% discount
   *
   * This fixes bookings where discount_verified=true
   * but discount_amount was never populated.
   */
  const storedDiscountAmount = Number(
    booking.discount_amount || 0
  );

  const discountAmount =
    booking.discount_verified
      ? storedDiscountAmount > 0
        ? storedDiscountAmount
        : Number(
            (originalTotal * 0.05).toFixed(2)
          )
      : 0;

  /*
   * FINAL TOTAL
   */
  const finalTotal = Math.max(
    0,
    originalTotal - discountAmount
  );

  /*
   * REMAINING
   *
   * Down payment + verified balance payments
   * are deducted from the discounted final total.
   */
  const remaining = Math.max(
    0,
    finalTotal -
      verifiedDownPayment -
      verifiedBalancePayments
  );

  const removalOptions = String(
    settingsResult.data?.value ||
      "None\nGel\nSoft Gel\nHard Gel\nOther"
  )
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <div className="admin-page">
      <div
        className="admin-page-head"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 18,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div className="kicker">
            {booking.reference_code}
          </div>

          <h1 className="serif">
            Edit Booking
          </h1>

          <p
            className="muted admin-lead"
            style={{
              maxWidth: 680,
            }}
          >
            Update the customer's details,
            appointment, services, removal,
            and notes.
          </p>
        </div>

        <Link
          className="btn secondary"
          href={`/admin/bookings/${booking.id}`}
        >
          ← Back to booking
        </Link>
      </div>

      <AdminBookingEditForm
        booking={{
          id: booking.id,
          reference_code:
            booking.reference_code,
          status: booking.status,

          customer_name:
            booking.customer_name || "",

          mobile_number:
            booking.mobile_number || "",

          social_handle:
            booking.social_handle || "",

          preferred_date:
            booking.preferred_date || "",

          preferred_time: String(
            booking.preferred_time || ""
          ).slice(0, 5),

          removal:
            booking.removal || "None",

          notes:
            booking.notes || "",

          estimated_total:
            originalTotal,

          down_payment:
            verifiedDownPayment,

          discount_verified:
            Boolean(
              booking.discount_verified
            ),

          discount_amount:
            discountAmount,

          final_total:
            finalTotal,

          remaining:
            remaining,

          booking_services:
            booking.booking_services || [],
        }}
        services={services}
        removalOptions={removalOptions}
      />
    </div>
  );
}
