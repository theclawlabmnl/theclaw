export const dynamic = "force-dynamic";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { peso } from "@/lib/utils";
import PaymentForm from "@/components/PaymentForm";

export default async function Payment({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const db = supabaseAdmin();

  const [{ data: booking }, { data: settingsRows }] =
    await Promise.all([
      db
        .from("bookings")
        .select("*")
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

  const settings = Object.fromEntries(
    (settingsRows || []).map((item) => [
      item.key,
      item.value,
    ])
  );

  if (
    !booking ||
    booking.status !== "approved"
  ) {
    return (
      <main className="form-page">
        <div className="container">
          <div className="card">
            <div className="kicker">
              Payment
            </div>

            <h1 className="serif">
              Payment unavailable
            </h1>

            <p className="muted">
              Payment is not currently available
              for this booking.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const qrphFee = Number(
    settings.qrph_fee || 5
  );

  const gcashAmount = 200;
  const qrphAmount = 200 + qrphFee;

  return (
    <main className="form-page">
      <div
        className="container"
        style={{ maxWidth: 760 }}
      >
        <div className="kicker">
          The Claw Lab MNL
        </div>

        <h1 className="serif">
          Payment Required
        </h1>

        <p className="muted">
          Your appointment has been approved.
          Please choose your preferred payment
          method and submit your payment proof.
        </p>

        <div className="card">
          <div
            style={{
              marginBottom: 24,
              paddingBottom: 18,
              borderBottom:
                "1px solid var(--line)",
            }}
          >
            <div className="kicker">
              Down payment
            </div>

            <h2
              className="serif"
              style={{
                margin:
                  "4px 0 8px",
                fontSize: 30,
              }}
            >
              Choose your payment method
            </h2>

            <p className="muted">
              Scan the QR code using your
              preferred banking or e-wallet app.
            </p>
          </div>

          <PaymentForm
            token={token}
            gcash={{
              ...settings,
              amount: gcashAmount,
            }}
            qrph={{
              ...settings,
              amount: qrphAmount,
            }}
          />

          <div
            className="notice"
            style={{
              marginTop: 24,
            }}
          >
            <strong>
              GCash:
            </strong>{" "}
            {peso(gcashAmount)}
            {" · "}
            <strong>
              QR PH:
            </strong>{" "}
            {peso(qrphAmount)}
          </div>
        </div>
      </div>
    </main>
  );
}