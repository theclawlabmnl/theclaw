export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatDate } from "@/lib/utils";
import CopyBookingId from "@/components/CopyBookingId";

const STATUS_OPTIONS = [
  ["", "All bookings"],
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
    case "pending":
      return "Pending";

    case "approved":
      return "Approved";

    case "payment_submitted":
      return "Payment Submitted";

    case "confirmed":
      return "Confirmed";

    case "completed":
      return "Completed";

    case "cancelled":
      return "Cancelled";

    case "rejected":
      return "Rejected";

    default:
      return status;
  }
}

function statusClass(status: string) {
  switch (status) {
    case "pending":
      return "booking-status booking-status-pending";

    case "approved":
      return "booking-status booking-status-approved";

    case "payment_submitted":
      return "booking-status booking-status-payment";

    case "confirmed":
      return "booking-status booking-status-confirmed";

    case "completed":
      return "booking-status booking-status-completed";

    case "cancelled":
      return "booking-status booking-status-cancelled";

    case "rejected":
      return "booking-status booking-status-rejected";

    default:
      return "booking-status";
  }
}

function formatTime12(time: string | null) {
  if (!time) {
    return "—";
  }

  const parts = time.split(":");

  if (parts.length < 2) {
    return time;
  }

  const hour = Number(parts[0]);
  const minute = parts[1];

  if (Number.isNaN(hour)) {
    return time;
  }

  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;

  return `${hour12}:${minute} ${suffix}`;
}

export default async function Bookings({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
  }>;
}) {
  const params = await searchParams;

  const requestedStatus = params.status || "";

  const validStatus = STATUS_OPTIONS.some(
    ([value]) => value === requestedStatus
  );

  const filter = validStatus
    ? requestedStatus
    : "";

  const db = supabaseAdmin();

  let query = db
    .from("bookings")
    .select(
      `
        id,
        reference_code,
        customer_name,
        mobile_number,
        preferred_date,
        preferred_time,
        status,
        created_at
      `
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(100);

  if (filter) {
    query = query.eq(
      "status",
      filter
    );
  }

  const {
    data,
    error,
  } = await query;

  if (error) {
    console.error(
      "Admin bookings error:",
      error
    );
  }

  const bookings = data ?? [];

  return (
    <div className="admin-page bookings-dashboard">
      {/* HEADER */}
      <header className="bookings-header">
        <div>
          <div className="kicker">
            OPERATIONS
          </div>

          <h1 className="serif bookings-title">
            Bookings
          </h1>

          <p className="muted bookings-subtitle">
            Manage customer appointments
            and booking requests.
          </p>
        </div>

        <Link
          href="/admin/bookings/calendar"
          className="btn secondary bookings-calendar-btn"
        >
          View calendar
        </Link>
      </header>

      {/* FILTER */}
      <div className="bookings-toolbar">
        <div className="bookings-filter-wrap">
          <label
            htmlFor="booking-status"
            className="bookings-filter-label"
          >
            Show
          </label>

          <form method="get">
            <select
              id="booking-status"
              name="status"
              defaultValue={filter}
              className="bookings-status-select"
            >
              {STATUS_OPTIONS.map(
                ([value, label]) => (
                  <option
                    key={
                      value || "all"
                    }
                    value={value}
                  >
                    {label}
                  </option>
                )
              )}
            </select>

            <button
              type="submit"
              className="btn small secondary bookings-filter-button"
            >
              Apply
            </button>
          </form>
        </div>

        <div className="bookings-count">
          {bookings.length}{" "}
          {bookings.length === 1
            ? "booking"
            : "bookings"}
        </div>
      </div>

      {/* BOOKINGS */}
      {bookings.length > 0 ? (
        <div className="bookings-card-list">
          {bookings.map(
            (booking) => (
              <article
                key={booking.id}
                className="booking-client-card"
              >
                <div className="booking-card-content">
                  {/* BOOKING ID */}
                  <div className="booking-field booking-field-id">
                    <span className="booking-field-label">
                      Booking ID
                    </span>

                    <div className="booking-id-row">
                      <strong className="booking-reference">
                        {booking.reference_code}
                      </strong>

                      <CopyBookingId
                        value={
                          booking.reference_code
                        }
                      />
                    </div>
                  </div>

                  {/* CLIENT */}
                  <div className="booking-field booking-field-client">
                    <span className="booking-field-label">
                      Client
                    </span>

                    <strong className="booking-client-name">
                      {booking.customer_name}
                    </strong>
                  </div>

                  {/* APPOINTMENT */}
                  <div className="booking-field booking-field-appointment">
                    <span className="booking-field-label">
                      Appointment
                    </span>

                    <strong>
                      {formatDate(
                        booking.preferred_date
                      )}
                    </strong>

                    <span className="booking-time">
                      {formatTime12(
                        booking.preferred_time
                      )}
                    </span>
                  </div>

                  {/* PHONE */}
                  <div className="booking-field booking-field-phone">
                    <span className="booking-field-label">
                      Phone
                    </span>

                    <strong>
                      {booking.mobile_number ||
                        "—"}
                    </strong>
                  </div>

                  {/* STATUS */}
                  <div className="booking-field booking-field-status">
                    <span className="booking-field-label">
                      Status
                    </span>

                    <span
                      className={statusClass(
                        booking.status
                      )}
                    >
                      {statusLabel(
                        booking.status
                      )}
                    </span>
                  </div>

                  {/* ACTION */}
                  <div className="booking-card-action">
                    <Link
                      href={`/admin/bookings/${booking.id}`}
                      className="booking-view-button"
                    >
                      View Details

                      <span
                        aria-hidden="true"
                      >
                        →
                      </span>
                    </Link>
                  </div>
                </div>
              </article>
            )
          )}
        </div>
      ) : (
        <div className="bookings-empty">
          <div className="bookings-empty-icon">
            ♡
          </div>

          <h2 className="serif">
            No bookings found
          </h2>

          <p className="muted">
            There are no bookings under
            this status.
          </p>

          {filter && (
            <Link
              href="/admin/bookings"
              className="btn secondary"
            >
              View all bookings
            </Link>
          )}
        </div>
      )}
    </div>
  );
}