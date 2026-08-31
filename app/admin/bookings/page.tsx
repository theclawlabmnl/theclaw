export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatDate, peso } from "@/lib/utils";
import BookingActions from "@/components/BookingActions";
import PaymentLinkActions from "@/components/PaymentLinkActions";

const STATUS_OPTIONS = [
  ["", "All"],
  ["pending", "Pending"],
  ["approved", "Approved"],
  ["payment_submitted", "Payment submitted"],
  ["confirmed", "Confirmed"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
  ["rejected", "Rejected"],
] as const;

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

function isImage(path: string) {
  return /\.(jpg|jpeg|png|webp|gif|heic|heif)$/i.test(path);
}

export default async function Bookings({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const filter = STATUS_OPTIONS.some(([value]) => value === (params.status || ""))
    ? (params.status || "")
    : "";

  const db = supabaseAdmin();
  let query = db
    .from("bookings")
    .select(
      "id,reference_code,access_token,customer_name,mobile_number,preferred_date,preferred_time,status,estimated_total,down_payment,created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (filter) query = query.eq("status", filter);

  const { data, error } = await query;
  if (error) console.error("Admin bookings error:", error);

  const bookings = data || [];
  const bookingIds = bookings.map((item) => item.id);
  const inspirationByBooking = new Map<string, Array<{ id: string; path: string; kind: string; signedUrl: string | null }>>();

  if (bookingIds.length) {
    const { data: files } = await db
      .from("booking_files")
      .select("id,booking_id,bucket,path,kind,created_at")
      .in("booking_id", bookingIds)
      .order("created_at", { ascending: true });

    const imageFiles = (files || []).filter((file) => file.kind === "inspiration");
    const paths = imageFiles.map((file) => file.path);
    const signedByPath = new Map<string, string>();

    if (paths.length) {
      const { data: signed } = await db.storage
        .from("nail-inspiration")
        .createSignedUrls(paths, 60 * 60 * 6);

      for (let i = 0; i < paths.length; i += 1) {
        const url = signed?.[i]?.signedUrl;
        if (url) signedByPath.set(paths[i], url);
      }
    }

    for (const file of imageFiles) {
      const entry = {
        id: file.id,
        path: file.path,
        kind: file.kind,
        signedUrl: signedByPath.get(file.path) || null,
      };
      const existing = inspirationByBooking.get(file.booking_id) || [];
      existing.push(entry);
      inspirationByBooking.set(file.booking_id, existing.slice(0, 3));
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-head admin-page-head-row">
        <div>
          <div className="kicker">Operations</div>
          <h1 className="serif">Bookings</h1>
          <p className="muted admin-lead">
            Review requests, view uploads, manage appointments, and recover customer links.
          </p>
        </div>
        <Link className="btn secondary" href="/admin/calendar">
          Open calendar
        </Link>
      </div>

      <div className="admin-filter-bar" aria-label="Booking status filters">
        {STATUS_OPTIONS.map(([value, label]) => (
          <Link
            key={label}
            href={value ? `/admin/bookings?status=${value}` : "/admin/bookings"}
            className={`admin-filter ${filter === value ? "active" : ""}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {bookings.length ? (
        <div className="admin-booking-list">
          {bookings.map((booking) => {
            const remaining = Math.max(
              0,
              Number(booking.estimated_total || 0) - Number(booking.down_payment || 0)
            );
            const inspiration = inspirationByBooking.get(booking.id) || [];

            return (
              <article className="card admin-booking-card" key={booking.id}>
                <div className="admin-booking-top">
                  <div className="admin-booking-main">
                    <div className="kicker">{booking.reference_code}</div>
                    <h2 className="serif">{booking.customer_name}</h2>
                    <div className="muted admin-booking-contact">
                      {booking.mobile_number}
                    </div>
                  </div>
                  <span className="status-pill">{statusLabel(booking.status)}</span>
                </div>

                <div className="admin-booking-info-grid">
                  <div>
                    <div className="kicker">Appointment</div>
                    <strong>{formatDate(booking.preferred_date)}</strong>
                    <div>{booking.preferred_time}</div>
                  </div>
                  <div>
                    <div className="kicker">Balance</div>
                    <div>Total: <strong>{peso(booking.estimated_total || 0)}</strong></div>
                    <div className="muted">
                      Paid: {peso(booking.down_payment || 0)} · Remaining: {peso(remaining)}
                    </div>
                  </div>
                  <div>
                    <div className="kicker">Nail inspiration</div>
                    {inspiration.length ? (
                      <div className="admin-thumb-row">
                        {inspiration.map((file) => (
                          <a
                            key={file.id}
                            href={file.signedUrl || undefined}
                            target="_blank"
                            rel="noreferrer"
                            className="admin-thumb-link"
                            title="Open nail inspiration"
                          >
                            {file.signedUrl && isImage(file.path) ? (
                              <img src={file.signedUrl} alt="Nail inspiration" className="admin-thumb" />
                            ) : (
                              <span className="admin-thumb-file">Open</span>
                            )}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span className="muted">None uploaded</span>
                    )}
                  </div>
                </div>

                <div className="admin-booking-actions">
                  <Link className="btn small secondary" href={`/admin/bookings/${booking.id}`}>
                    View details
                  </Link>
                  <BookingActions id={booking.id} status={booking.status} />
                </div>

                <PaymentLinkActions token={booking.access_token} status={booking.status} />
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card empty">
          No bookings found for this status.
        </div>
      )}
    </div>
  );
}
