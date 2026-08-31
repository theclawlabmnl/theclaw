export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatDate, peso } from "@/lib/utils";
import BookingActions from "@/components/BookingActions";
import PaymentLinkActions from "@/components/PaymentLinkActions";

function isImage(path: string) {
  return /\.(jpg|jpeg|png|webp|gif|heic|heif)$/i.test(path);
}

function statusLabel(status: string) {
  switch (status) {
    case "pending": return "Pending";
    case "approved": return "Approved · Payment Required";
    case "payment_submitted": return "Payment Submitted";
    case "confirmed": return "Confirmed";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
    case "rejected": return "Rejected";
    default: return status;
  }
}

export default async function BookingDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = supabaseAdmin();

  const { data: booking, error } = await db
    .from("bookings")
    .select("*,booking_services(*)")
    .eq("id", id)
    .single();

  if (error || !booking) notFound();

  const { data: files } = await db
    .from("booking_files")
    .select("id,bucket,path,kind,created_at")
    .eq("booking_id", id)
    .order("created_at", { ascending: true });

  const signedFiles = await Promise.all(
    (files || []).map(async (file) => {
      const { data } = await db.storage
        .from(file.bucket)
        .createSignedUrl(file.path, 60 * 60 * 6);
      return { ...file, signedUrl: data?.signedUrl || null };
    })
  );

  const { data: payments } = await db
    .from("payments")
    .select("id,method,amount,status,verified_at,created_at")
    .eq("booking_id", id)
    .order("created_at", { ascending: false });

  const remaining = Math.max(
    0,
    Number(booking.estimated_total || 0) - Number(booking.down_payment || 0)
  );

  const inspiration = signedFiles.filter((file) => file.kind === "inspiration");
  const verification = signedFiles.filter((file) =>
    ["student_valid_id", "student_registration"].includes(file.kind)
  );

  return (
    <div className="admin-page">
      <div className="admin-page-head admin-page-head-row">
        <div>
          <div className="kicker">{booking.reference_code}</div>
          <h1 className="serif">Booking Details</h1>
          <p className="muted admin-lead">
            Complete customer request, appointment information, uploads, and payment details.
          </p>
        </div>
        <Link className="btn secondary" href="/admin/bookings">← Back to bookings</Link>
      </div>

      <div className="admin-detail-grid">
        <div className="admin-detail-main">
          <section className="card admin-detail-card">
            <div className="admin-detail-heading">
              <div>
                <div className="kicker">Customer</div>
                <h2 className="serif">{booking.customer_name}</h2>
                <div>{booking.mobile_number}</div>
                <div className="muted">{booking.social_handle || "No IG/Messenger handle provided"}</div>
              </div>
              <span className="status-pill">{statusLabel(booking.status)}</span>
            </div>
          </section>

          <section className="card admin-detail-card">
            <div className="kicker">Appointment</div>
            <h2 className="serif admin-detail-title">
              {formatDate(booking.preferred_date)} · {booking.preferred_time}
            </h2>

            <div className="admin-service-list">
              {booking.booking_services?.map((item: any) => (
                <div className="admin-service-item" key={item.id}>
                  <div>
                    <strong>{item.service_name}</strong>
                    {item.variation_name && <div className="muted">{item.variation_name}</div>}
                  </div>
                  <div className="admin-service-price">
                    {peso(item.price)}
                    <span className="muted"> · {item.duration_minutes} min</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card admin-detail-card">
            <div className="kicker">Request details</div>
            <div className="admin-detail-list">
              <div><span>Removal</span><strong>{booking.removal || "None"}</strong></div>
              <div><span>Promo / Discount</span><strong>{booking.promo_name || "Not Applicable"}</strong></div>
              <div><span>Referral</span><strong>{booking.referral_name || "—"}</strong></div>
              <div><span>Notes</span><strong>{booking.notes || "—"}</strong></div>
              <div><span>Policies accepted</span><strong>{booking.terms_accepted ? "Yes" : "No"}</strong></div>
            </div>
          </section>

          <section className="card admin-detail-card">
            <div className="kicker">Nail inspiration</div>
            <p className="muted admin-section-help">
              These are the design references the customer uploaded with this booking request.
            </p>

            {inspiration.length ? (
              <div className="admin-file-grid">
                {inspiration.map((file) => (
                  <a
                    key={file.id}
                    href={file.signedUrl || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="admin-file-card"
                  >
                    {file.signedUrl && isImage(file.path) ? (
                      <img src={file.signedUrl} alt="Customer nail inspiration" className="admin-file-image" />
                    ) : (
                      <div className="admin-file-placeholder">Open file →</div>
                    )}
                    <span>{file.path.split("/").pop()}</span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="notice">No nail inspiration was uploaded.</div>
            )}
          </section>

          <section className="card admin-detail-card">
            <div className="kicker">Discount verification</div>
            <p className="muted admin-section-help">
              Student / PWD / SC verification documents are kept private and can be opened here.
            </p>

            {verification.length ? (
              <div className="admin-verification-grid">
                {verification.map((file) => (
                  <a
                    key={file.id}
                    href={file.signedUrl || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="upload admin-verification-card"
                  >
                    <strong>
                      {file.kind === "student_valid_id" ? "Valid ID" : "Registration Card / Form"}
                    </strong>
                    <span className="muted">{file.path.split("/").pop()}</span>
                    <span>{file.signedUrl ? "Open uploaded file →" : "File unavailable"}</span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="notice">No discount verification documents attached.</div>
            )}
          </section>

          <section className="card admin-detail-card">
            <div className="kicker">Payments</div>
            {payments?.length ? (
              <div className="admin-service-list">
                {payments.map((payment: any) => (
                  <div className="admin-service-item" key={payment.id}>
                    <div>
                      <strong>{payment.method}</strong>
                      <div className="muted">{statusLabel(payment.status)}</div>
                    </div>
                    <strong>{peso(payment.amount)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="notice">No payments submitted yet.</div>
            )}
          </section>
        </div>

        <aside className="admin-detail-side">
          <section className="card admin-detail-card admin-sticky-card">
            <div className="kicker">Booking controls</div>
            <span className="status-pill admin-side-status">{statusLabel(booking.status)}</span>

            <div className="admin-money-block">
              <span className="muted">Total</span>
              <strong>{peso(booking.estimated_total)}</strong>
            </div>
            <div className="admin-money-row">
              <span>Down payment</span>
              <strong>{peso(booking.down_payment)}</strong>
            </div>
            <div className="admin-money-row">
              <span>Remaining balance</span>
              <strong>{peso(remaining)}</strong>
            </div>

            <div className="admin-control-actions">
              <BookingActions id={booking.id} status={booking.status} />
            </div>

            <PaymentLinkActions token={booking.access_token} status={booking.status} />
          </section>
        </aside>
      </div>
    </div>
  );
}
