export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatDate } from "@/lib/utils";
import CopyBookingId from "@/components/CopyBookingId";
import BookingCardActions from "@/components/BookingCardActions";

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
    // IMPORTANT:
    // Draft bookings are never shown in the normal admin booking list.
    .neq("status", "draft")
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
      <header className="bookings-header">
        <div className="bookings-header-content">
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

        <div className="bookings-header-actions">
          <a
            href={`/api/admin/bookings/export${
              filter
                ? `?status=${encodeURIComponent(filter)}`
                : ""
            }`}
            className="btn secondary bookings-export-btn"
          >
            Export CSV
          </a>

          <Link
            href="/admin/bookings/calendar"
            className="btn secondary bookings-calendar-btn"
          >
            View calendar
          </Link>
        </div>
      </header>

      <div className="bookings-toolbar">
        <div className="bookings-filter-wrap">
          <label
            htmlFor="booking-status"
            className="bookings-filter-label"
          >
            Show
          </label>

          <form
            method="get"
            className="bookings-filter-form"
          >
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

      {bookings.length > 0 ? (
        <div className="bookings-card-list">
          {bookings.map(
            (booking) => (
              <article
                key={booking.id}
                className="booking-client-card"
              >
                <div className="booking-card-content">
                  <div className="booking-field booking-field-id">
                    <span className="booking-field-label">
                      Booking ID
                    </span>

                    <div className="booking-id-row">
                      <strong className="booking-reference">
                        {booking.reference_code ||
                          "—"}
                      </strong>

                      <CopyBookingId
                        value={
                          booking.reference_code ||
                          booking.id
                        }
                      />
                    </div>
                  </div>

                  <div className="booking-field booking-field-client">
                    <span className="booking-field-label">
                      Client
                    </span>

                    <strong className="booking-client-name">
                      {booking.customer_name ||
                        "—"}
                    </strong>
                  </div>

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

                  <div className="booking-field booking-field-phone">
                    <span className="booking-field-label">
                      Phone
                    </span>

                    <strong className="booking-phone">
                      {booking.mobile_number ||
                        "—"}
                    </strong>
                  </div>

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

                  <div className="booking-card-action">
                    <Link
                      href={`/admin/bookings/${booking.id}`}
                      className="booking-view-button"
                    >
                      <span>
                        View Details
                      </span>

                      <span
                        aria-hidden="true"
                        className="booking-view-arrow"
                      >
                        →
                      </span>
                    </Link>

                    <div className="booking-card-actions-inner">
                      <BookingCardActions
                        id={booking.id}
                      />
                    </div>
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

      <style>{`
        .bookings-dashboard {
          width: 100%;
          min-width: 0;
        }

        .bookings-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          width: 100%;
          min-width: 0;
          margin-bottom: 24px;
        }

        .bookings-header-content {
          min-width: 0;
          flex: 1 1 auto;
        }

        .bookings-title {
          margin: 4px 0 0;
        }

        .bookings-subtitle {
          max-width: 650px;
          margin-top: 8px;
          line-height: 1.5;
        }

        .bookings-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 0 0 auto;
        }

        .bookings-calendar-btn,
        .bookings-export-btn {
          flex: 0 0 auto;
          white-space: nowrap;
        }

        .bookings-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          width: 100%;
          min-width: 0;
          margin-bottom: 18px;
        }

        .bookings-filter-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .bookings-filter-label {
          flex: 0 0 auto;
          font-size: 13px;
          font-weight: 600;
        }

        .bookings-filter-form {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .bookings-status-select {
          min-width: 190px;
          max-width: 100%;
          height: 38px;
          padding: 0 10px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #fff;
          color: #111;
          font-size: 13px;
        }

        .bookings-filter-button {
          flex: 0 0 auto;
          white-space: nowrap;
        }

        .bookings-count {
          flex: 0 0 auto;
          color: #666;
          font-size: 13px;
          white-space: nowrap;
        }

        .bookings-card-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          min-width: 0;
        }

        .booking-client-card {
          width: 100%;
          min-width: 0;
          border: 1px solid #e5e5e5;
          border-radius: 12px;
          background: #fff;
          overflow: hidden;
        }

        .booking-card-content {
          display: grid;
          grid-template-columns:
            minmax(150px, 1.1fr)
            minmax(140px, 1fr)
            minmax(150px, 1fr)
            minmax(120px, .8fr)
            minmax(120px, .8fr)
            minmax(150px, 1fr);
          gap: 18px;
          align-items: center;
          width: 100%;
          min-width: 0;
          padding: 18px;
        }

        .booking-field {
          min-width: 0;
          width: 100%;
        }

        .booking-field-label {
          display: block;
          margin-bottom: 5px;
          color: #777;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .05em;
          text-transform: uppercase;
        }

        .booking-field strong {
          display: block;
          min-width: 0;
          color: #111;
          font-size: 13px;
          line-height: 1.4;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .booking-reference {
          overflow-wrap: anywhere;
          word-break: break-all;
        }

        .booking-id-row {
          display: flex;
          align-items: center;
          gap: 7px;
          min-width: 0;
          max-width: 100%;
        }

        .booking-id-row .booking-reference {
          flex: 1 1 auto;
          min-width: 0;
        }

        .booking-client-name {
          overflow-wrap: anywhere;
        }

        .booking-time {
          display: block;
          margin-top: 3px;
          color: #777;
          font-size: 12px;
        }

        .booking-phone {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .booking-status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          max-width: 100%;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          line-height: 1.2;
          white-space: normal;
          text-align: center;
        }

        .booking-status-pending {
          background: #fff7df;
          color: #805d00;
        }

        .booking-status-approved {
          background: #eef5ff;
          color: #315c96;
        }

        .booking-status-payment {
          background: #fff2df;
          color: #875600;
        }

        .booking-status-confirmed {
          background: #edf8f0;
          color: #176b2c;
        }

        .booking-status-completed {
          background: #f0edf9;
          color: #5c438f;
        }

        .booking-status-cancelled {
          background: #fff0ef;
          color: #a61b13;
        }

        .booking-status-rejected {
          background: #f3f3f3;
          color: #555;
        }

        .booking-card-action {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          justify-content: center;
          gap: 8px;
          width: 100%;
          min-width: 0;
        }

        .booking-view-button {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          width: 100%;
          min-width: 0;
          min-height: 38px;
          padding: 9px 11px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #fff;
          color: #111;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          box-sizing: border-box;
        }

        .booking-view-button > span:first-child {
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .booking-view-arrow {
          flex: 0 0 auto;
        }

        .booking-card-actions-inner {
          width: 100%;
          min-width: 0;
        }

        .booking-card-actions-inner > * {
          max-width: 100%;
        }

        .bookings-empty {
          width: 100%;
          padding: 60px 20px;
          border: 1px solid #e5e5e5;
          border-radius: 12px;
          background: #fff;
          text-align: center;
        }

        .bookings-empty-icon {
          margin-bottom: 12px;
          color: #999;
          font-size: 30px;
        }

        .bookings-empty h2 {
          margin: 0 0 6px;
        }

        .bookings-empty p {
          margin: 0 0 18px;
        }

        @media (max-width: 1200px) {
          .booking-card-content {
            grid-template-columns:
              minmax(140px, 1fr)
              minmax(130px, 1fr)
              minmax(140px, 1fr)
              minmax(110px, .8fr)
              minmax(110px, .8fr);

            .booking-card-action {
              grid-column: 1 / -1;
              display: grid;
              grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
              align-items: center;
            }
          }
        }

        @media (max-width: 850px) {
          .bookings-header {
            flex-direction: column;
            align-items: stretch;
          }

          .bookings-header-actions {
            width: 100%;
            flex-direction: column;
            align-items: stretch;
          }

          .bookings-calendar-btn,
          .bookings-export-btn {
            width: 100%;
            text-align: center;
          }

          .bookings-toolbar {
            align-items: flex-start;
            flex-direction: column;
          }

          .booking-card-content {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .booking-card-action {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 560px) {
          .bookings-filter-wrap {
            align-items: flex-start;
            flex-direction: column;
            width: 100%;
          }

          .bookings-filter-form {
            width: 100%;
          }

          .bookings-status-select {
            flex: 1 1 auto;
            min-width: 0;
            width: 100%;
          }

          .bookings-filter-button {
            flex: 0 0 auto;
          }

          .booking-card-content {
            grid-template-columns:
              minmax(0, 1fr);
            gap: 14px;
            padding: 15px;
          }

          .booking-card-action {
            grid-column: auto;
            display: flex;
            width: 100%;
          }

          .booking-card-actions-inner {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}