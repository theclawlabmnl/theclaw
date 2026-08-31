export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatDate, peso } from "@/lib/utils";
import CopyStatusLink from "@/components/CopyStatusLink";

export default async function Status({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const db = supabaseAdmin();

  const { data: booking } = await db
    .from("bookings")
    .select("*,booking_services(*)")
    .eq("access_token", token)
    .single();

  if (!booking) {
    return (
      <main className="form-page">
        <div className="container card">
          <div className="kicker">Booking status</div>
          <h1 className="serif">Booking not found</h1>
          <p className="muted">
            We couldn't find this booking link. Please check the link and try again.
          </p>
        </div>
      </main>
    );
  }

  const status = String(booking.status || "");
  const remaining = Math.max(
    0,
    Number(booking.estimated_total || 0) - Number(booking.down_payment || 0)
  );

  return (
    <main className="form-page">
      <div className="container" style={{ maxWidth: 780 }}>
        <div className="kicker">The Claw Lab MNL</div>
        <h1 className="serif" style={{ fontSize: 48, margin: "8px 0 18px" }}>
          Booking Status
        </h1>

        <div className="card">
          <span className="status-pill">
            {status === "pending"
              ? "Pending"
              : status === "approved"
                ? "Approved · Payment Required"
                : status === "payment_submitted"
                  ? "Payment Submitted"
                  : status === "confirmed"
                    ? "Confirmed"
                    : status === "completed"
                      ? "Completed"
                      : status}
          </span>

          <h2 className="serif" style={{ marginBottom: 6 }}>
            {booking.reference_code}
          </h2>

          <p>
            <strong>{formatDate(booking.preferred_date)}</strong>
            <br />
            {booking.preferred_time}
          </p>

          <div
            className="notice"
            style={{
              marginTop: 20,
              lineHeight: 1.7,
            }}
          >
            {status === "pending" && (
              <>
                <strong>Your booking request has been submitted.</strong>
                <br /><br />
                Please message us through one of our social media accounts for faster transactions and communication regarding your request.
                <br /><br />
                <strong>Please do not close this page.</strong> You may copy or bookmark this link and return to it anytime to check the status of your request.
                <br /><br />
                Once your request is approved by our <strong>Nailtech</strong>, you will be able to proceed to the payment step from this page.
                <br /><br />
                Your appointment is <strong>not yet confirmed</strong> at this stage.
              </>
            )}

            {status === "approved" && (
              <>
                <strong>Your booking request has been approved by our Nailtech.</strong>
                <br /><br />
                Your appointment is now ready for the payment step. Please proceed with your down payment when ready.
                <br /><br />
                Your appointment will only be confirmed after your payment proof is reviewed and verified by our Nailtech.
              </>
            )}

            {status === "payment_submitted" && (
              <>
                <strong>Your payment proof has been submitted.</strong>
                <br /><br />
                Thank you. Our Nailtech is currently reviewing your payment proof. Please keep this page and your booking link so you can return and check your status.
              </>
            )}

            {status === "confirmed" && (
              <>
                <strong>Your appointment is confirmed ✨</strong>
                <br /><br />
                Your payment has been verified by our Nailtech and your appointment is now officially confirmed.
              </>
            )}

            {status === "completed" && (
              <>
                <strong>Your appointment has been completed. ♡</strong>
                <br /><br />
                We hope you loved your Claw Lab experience.
              </>
            )}

            {status === "rejected" && (
              <>
                <strong>Your booking request was not approved.</strong>
                <br /><br />
                Please message us through Instagram or Messenger if you'd like assistance with another date or time.
              </>
            )}

            {status === "cancelled" && (
              <>
                <strong>This booking has been cancelled.</strong>
                <br /><br />
                Please contact The Claw Lab MNL through Instagram or Messenger for assistance.
              </>
            )}
          </div>

          <div
            className="actions"
            style={{ marginTop: 20 }}
          >
            {status === "approved" && (
              <Link className="btn" href={`/payment/${token}`}>
                Proceed to payment →
              </Link>
            )}

            {status === "confirmed" && (
              <Link className="btn" href={`/confirmed/${token}`}>
                View confirmation →
              </Link>
            )}

            {status === "completed" && (
              <Link className="btn" href={`/review/${token}`}>
                Leave a review →
              </Link>
            )}

            {(status === "pending" || status === "payment_submitted") && (
              <CopyStatusLink />
            )}
          </div>

          {(status === "pending" || status === "rejected" || status === "cancelled") && (
            <div
              style={{
                marginTop: 28,
                paddingTop: 20,
                borderTop: "1px solid var(--line)",
              }}
            >
              <div className="kicker">Faster communication</div>
              <p className="muted">
                Message us through Instagram or Messenger for faster assistance.
              </p>
              <div className="actions">
                <a
                  className="btn secondary small"
                  href="https://instagram.com/theclawlabmnl"
                  target="_blank"
                  rel="noreferrer"
                >
                  Instagram
                </a>
                <a
                  className="btn secondary small"
                  href="https://m.me/theclawlabmnl"
                  target="_blank"
                  rel="noreferrer"
                >
                  Messenger
                </a>
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: 28,
              paddingTop: 20,
              borderTop: "1px solid var(--line)",
            }}
          >
            <div className="kicker">Appointment summary</div>

            {booking.booking_services?.map((item: any) => (
              <div
                key={item.id}
                style={{
                  padding: "10px 0",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <strong>
                  {item.service_name}
                </strong>
                {item.variation_name && (
                  <div className="muted">
                    {item.variation_name}
                  </div>
                )}
                <div>{peso(item.price)}</div>
              </div>
            ))}

            <div
              style={{
                display: "grid",
                gap: 5,
                marginTop: 16,
              }}
            >
              <div>
                Estimated total: <strong>{peso(booking.estimated_total)}</strong>
              </div>
              <div>
                Down payment: <strong>{peso(booking.down_payment)}</strong>
              </div>
              <div>
                Remaining balance: <strong>{peso(remaining)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
