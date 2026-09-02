export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import PaymentForm from "@/components/PaymentForm";

const BOOKING_PAYMENT = 200;
const QRPH_FEE = 5;

type PaymentPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function Payment({
  params,
}: PaymentPageProps) {
  const { token } = await params;

  const db = supabaseAdmin();

  const [{ data: booking }, { data: settingsRows }] =
    await Promise.all([
      db
        .from("bookings")
        .select(
          `
          id,
          status,
          reference_code,
          customer_name,
          mobile_number,
          social_handle,
          preferred_date,
          preferred_time,
          estimated_total,
          down_payment
        `
        )
        .eq("access_token", token)
        .single(),

      db
        .from("site_settings")
        .select("key,value")
        .in("key", [
          "gcash_name",
          "gcash_number",
          "gcash_qr",
          "qrph_qr",
          "qrph_fee",
        ]),
    ]);

  const settings: Record<string, string> =
    Object.fromEntries(
      (settingsRows ?? []).map((item) => [
        item.key,
        String(item.value ?? ""),
      ])
    );

  if (!booking || booking.status !== "approved") {
    return (
      <main className="payment-page">
        <div className="payment-page-inner">
          <section className="payment-section-clean">
            <div className="payment-section-label-clean">
              Payment
            </div>

            <h1 className="payment-heading-clean">
              Payment unavailable
            </h1>

            <p className="payment-description-clean">
              Payment is not currently available for
              this booking. Please check your booking
              status or contact TheClawLab MNL.
            </p>

            <Link
              href={`/status/${token}`}
              className="payment-submit-clean"
              style={{
                display: "block",
                boxSizing: "border-box",
                textAlign: "center",
                textDecoration: "none",
              }}
            >
              View booking status
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const bookingPayment =
    Number(booking.down_payment ?? 0) > 0
      ? Number(booking.down_payment)
      : BOOKING_PAYMENT;

  const bookingTotal =
    Number(booking.estimated_total ?? 0);

  const remainingBalance = Math.max(
    bookingTotal - bookingPayment,
    0
  );

  const qrphFee =
    Number(settings.qrph_fee ?? 0) > 0
      ? Number(settings.qrph_fee)
      : QRPH_FEE;

  return (
    <main className="payment-page">
      <div className="payment-page-inner">

        {/* HEADER */}
        <header className="payment-page-header">
          <div className="payment-section-label-clean">
            The Claw Lab MNL
          </div>

          <h1>
            Payment Required
          </h1>

          <p>
            Your appointment has been approved.
            Please pay the required down payment
            and upload your payment proof below.
          </p>
        </header>

        <PaymentForm
          token={token}

          customerName={
            booking.customer_name || ""
          }

          mobileNumber={
            booking.mobile_number
          }

          socialHandle={
            booking.social_handle
          }

          referenceCode={
            booking.reference_code
          }

          preferredDate={
            booking.preferred_date
          }

          preferredTime={
            booking.preferred_time
          }

          bookingTotal={bookingTotal}

          remainingBalance={
            remainingBalance
          }

          gcash={{
            gcash_name:
              settings.gcash_name,

            gcash_number:
              settings.gcash_number,

            gcash_qr:
              settings.gcash_qr,

            amount:
              bookingPayment,
          }}

          qrph={{
            qrph_qr:
              settings.qrph_qr,

            amount:
              bookingPayment,

            processingFee:
              qrphFee,

            totalPayable:
              bookingPayment +
              qrphFee,
          }}
        />

        <div className="payment-back">
          <Link href={`/status/${token}`}>
            ← Back to booking status
          </Link>
        </div>

      </div>
    </main>
  );
}