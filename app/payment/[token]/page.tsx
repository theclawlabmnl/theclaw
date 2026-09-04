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

type PaymentMethod = {
  id: string;
  name: string;
  account_name?: string;
  account_details?: string;
  instructions?: string;
  processing_fee?: number;
  qr_url?: string;
  active?: boolean;
};

function getPaymentMethods(
  settings: Record<string, string>
): PaymentMethod[] {
  try {
    const parsed = JSON.parse(settings.payment_methods || "[]");

    if (Array.isArray(parsed) && parsed.length) {
      return parsed
        .map((item: any) => ({
          id: String(item.id || ""),
          name: String(item.name || ""),
          account_name: String(item.account_name || ""),
          account_details: String(item.account_details || ""),
          instructions: String(item.instructions || ""),
          processing_fee: Math.max(
            0,
            Number(item.processing_fee || 0)
          ),
          qr_url: String(item.qr_url || ""),
          active: item.active !== false,
        }))
        .filter(
          (item: PaymentMethod) =>
            item.id && item.name && item.active
        );
    }
  } catch {}

  const qrphFee =
    Number(settings.qrph_fee ?? 0) >= 0
      ? Number(settings.qrph_fee ?? QRPH_FEE)
      : QRPH_FEE;

  return [
    {
      id: "gcash",
      name: "GCash",
      account_name: settings.gcash_name || "",
      account_details: settings.gcash_number || "",
      instructions:
        "Scan the QR code or send the exact down payment amount to the GCash account above.",
      processing_fee: 0,
      qr_url: settings.gcash_qr || "",
      active: true,
    },
    {
      id: "qrph",
      name: "QR PH",
      account_name: "",
      account_details: "",
      instructions:
        "Scan the QR code using your preferred banking or e-wallet app.",
      processing_fee: qrphFee,
      qr_url: settings.qrph_qr || "",
      active: true,
    },
  ];
}

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
          "payment_methods",
          "gcash_name",
          "gcash_number",
          "gcash_qr",
          "qrph_qr",
          "qrph_fee",
        ]),
    ]);

  const settings: Record<string, string> = Object.fromEntries(
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
            <div className="payment-section-label-clean">Payment</div>
            <h1 className="payment-heading-clean">Payment unavailable</h1>
            <p className="payment-description-clean">
              Payment is not currently available for this booking. Please
              check your booking status or contact TheClawLab MNL.
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

  const bookingTotal = Number(booking.estimated_total ?? 0);
  const remainingBalance = Math.max(
    bookingTotal - bookingPayment,
    0
  );

  const paymentMethods = getPaymentMethods(settings);

  return (
    <main className="payment-page">
      <div className="payment-page-inner">
        <header className="payment-page-header">
          <div className="payment-section-label-clean">
            The Claw Lab MNL
          </div>

          <h1>Payment Required</h1>

          <p>
            Your appointment has been approved. Please pay the required down
            payment and upload your payment proof below.
          </p>
        </header>

        <section
          style={{
            marginTop: "14px",
            marginBottom: "16px",
            padding: "9px 12px",
            borderRadius: "7px",
            border: "1px solid rgba(190, 50, 50, 0.35)",
            background: "rgba(190, 50, 50, 0.07)",
            color: "#000",
          }}
        >
          <strong
            style={{
              display: "block",
              marginBottom: "2px",
              fontSize: "12px",
              lineHeight: 1.3,
            }}
          >
            ⏰ 3-Hour Payment Deadline
          </strong>

          <p
            style={{
              margin: 0,
              lineHeight: 1.4,
              fontSize: "11px",
            }}
          >
            Your appointment is reserved for{" "}
            <strong>3 hours after approval</strong>. Please submit your payment
            and payment proof within this time. If payment is not submitted
            within 3 hours, your booking will be{" "}
            <strong>automatically cancelled</strong>.
          </p>
        </section>

        <PaymentForm
          token={token}
          customerName={booking.customer_name || ""}
          mobileNumber={booking.mobile_number}
          socialHandle={booking.social_handle}
          referenceCode={booking.reference_code}
          preferredDate={booking.preferred_date}
          preferredTime={booking.preferred_time}
          bookingTotal={bookingTotal}
          remainingBalance={remainingBalance}
          downPayment={bookingPayment}
          paymentMethods={paymentMethods}
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
