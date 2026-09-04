"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Booking = {
  id: string;
  reference_code: string;
  customer_name: string;
  mobile_number: string | null;
  preferred_date: string;
  preferred_time: string | null;
  status: string;
};

const WEEKDAYS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

function formatTime12(time: string | null) {
  if (!time) return "—";

  const parts = time.split(":");

  if (parts.length < 2) return time;

  const hour = Number(parts[0]);
  const minute = parts[1];

  if (Number.isNaN(hour)) return time;

  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;

  return `${hour12}:${minute} ${suffix}`;
}

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
      return "booking-calendar-status booking-calendar-status-pending";
    case "approved":
      return "booking-calendar-status booking-calendar-status-approved";
    case "payment_submitted":
      return "booking-calendar-status booking-calendar-status-payment";
    case "confirmed":
      return "booking-calendar-status booking-calendar-status-confirmed";
    case "completed":
      return "booking-calendar-status booking-calendar-status-completed";
    case "cancelled":
      return "booking-calendar-status booking-calendar-status-cancelled";
    case "rejected":
      return "booking-calendar-status booking-calendar-status-rejected";
    default:
      return "booking-calendar-status";
  }
}

function dateKey(year: number, month: number, day: number) {
  const monthText = String(month + 1).padStart(2, "0");
  const dayText = String(day).padStart(2, "0");

  return `${year}-${monthText}-${dayText}`;
}

function formatSelectedDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`);

  return parsed.toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function BookingCalendar({
  bookings,
}: {
  bookings: Booking[];
}) {
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(
    new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    )
  );

  const [selectedDate, setSelectedDate] = useState(
    dateKey(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    )
  );

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const bookingsByDate = useMemo(() => {
    const grouped: Record<string, Booking[]> = {};

    for (const booking of bookings) {
      if (!booking.preferred_date) continue;

      if (!grouped[booking.preferred_date]) {
        grouped[booking.preferred_date] = [];
      }

      grouped[booking.preferred_date].push(
        booking
      );
    }

    return grouped;
  }, [bookings]);

  const firstDay = new Date(
    year,
    month,
    1
  ).getDay();

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

  const calendarDays = [];

  for (let index = 0; index < firstDay; index++) {
    calendarDays.push(null);
  }

  for (
    let day = 1;
    day <= daysInMonth;
    day++
  ) {
    calendarDays.push(day);
  }

  const selectedBookings =
    bookingsByDate[selectedDate] || [];

  const monthLabel = currentMonth.toLocaleDateString(
    "en-PH",
    {
      month: "long",
      year: "numeric",
    }
  );

  const goPreviousMonth = () => {
    setCurrentMonth(
      new Date(year, month - 1, 1)
    );
  };

  const goNextMonth = () => {
    setCurrentMonth(
      new Date(year, month + 1, 1)
    );
  };

  const goToday = () => {
    const now = new Date();

    setCurrentMonth(
      new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      )
    );

    setSelectedDate(
      dateKey(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      )
    );
  };

  return (
    <div className="booking-calendar-layout">
      <section className="card booking-calendar-card">
        <div className="booking-calendar-toolbar">
          <div className="booking-calendar-month">
            <button
              type="button"
              className="btn secondary small"
              onClick={goPreviousMonth}
              aria-label="Previous month"
            >
              ←
            </button>

            <h2 className="serif">
              {monthLabel}
            </h2>

            <button
              type="button"
              className="btn secondary small"
              onClick={goNextMonth}
              aria-label="Next month"
            >
              →
            </button>
          </div>

          <button
            type="button"
            className="btn secondary small"
            onClick={goToday}
          >
            Today
          </button>
        </div>

        <div className="booking-calendar-weekdays">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="booking-calendar-weekday"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="booking-calendar-grid">
          {calendarDays.map((day, index) => {
            if (day === null) {
              return (
                <div
                  key={`empty-${index}`}
                  className="booking-calendar-day empty"
                />
              );
            }

            const currentDate = dateKey(
              year,
              month,
              day
            );

            const dayBookings =
              bookingsByDate[currentDate] || [];

            const hasBookings =
              dayBookings.length > 0;

            const isSelected =
              selectedDate === currentDate;

            const isToday =
              currentDate ===
              dateKey(
                today.getFullYear(),
                today.getMonth(),
                today.getDate()
              );

            return (
              <button
                key={currentDate}
                type="button"
                className={`booking-calendar-day ${
                  isSelected ? "selected" : ""
                } ${isToday ? "today" : ""} ${
                  hasBookings ? "has-bookings" : ""
                }`}
                onClick={() =>
                  setSelectedDate(currentDate)
                }
              >
                <span className="booking-calendar-day-number">
                  {day}
                </span>

                {hasBookings && (
                  <span className="booking-calendar-day-info">
                    <span className="booking-calendar-dot" />

                    <span>
                      {dayBookings.length}{" "}
                      {dayBookings.length === 1
                        ? "booking"
                        : "bookings"}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card booking-calendar-details">
        <div className="kicker">
          SELECTED DATE
        </div>

        <h2 className="serif">
          {formatSelectedDate(selectedDate)}
        </h2>

        {selectedBookings.length === 0 ? (
          <div className="booking-calendar-empty">
            <p className="muted">
              No bookings scheduled for this date.
            </p>
          </div>
        ) : (
          <div className="booking-calendar-bookings">
            {selectedBookings.map((booking) => (
              <article
                key={booking.id}
                className="booking-calendar-booking"
              >
                <div className="booking-calendar-booking-main">
                  <div>
                    <strong className="booking-calendar-customer">
                      {booking.customer_name}
                    </strong>

                    <div className="booking-calendar-time">
                      {formatTime12(
                        booking.preferred_time
                      )}
                    </div>
                  </div>

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

                <div className="booking-calendar-meta">
                  <span>
                    Ref:{" "}
                    <strong>
                      {booking.reference_code}
                    </strong>
                  </span>

                  {booking.mobile_number && (
                    <span>
                      {booking.mobile_number}
                    </span>
                  )}
                </div>

                <Link
                  href={`/admin/bookings/${booking.id}`}
                  className="booking-calendar-view"
                >
                  View booking →
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <style jsx global>{`
        .booking-calendar-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.65fr) minmax(300px, 0.85fr);
          gap: 18px;
          align-items: start;
        }

        .booking-calendar-card,
        .booking-calendar-details {
          min-width: 0;
        }

        .booking-calendar-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 18px;
        }

        .booking-calendar-month {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .booking-calendar-month h2 {
          margin: 0;
          min-width: 190px;
          text-align: center;
          font-size: 24px;
        }

        .booking-calendar-weekdays {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 6px;
          margin-bottom: 6px;
        }

        .booking-calendar-weekday {
          padding: 7px 4px;
          text-align: center;
          color: #8a7f81;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .booking-calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 6px;
        }

        .booking-calendar-day {
          min-width: 0;
          min-height: 82px;
          padding: 9px;
          border: 1px solid #eee8e4;
          border-radius: 10px;
          background: #fff;
          color: var(--admin-text);
          text-align: left;
          cursor: pointer;
          transition:
            border-color 0.15s ease,
            background 0.15s ease,
            transform 0.15s ease;
        }

        .booking-calendar-day:hover {
          border-color: #dcc8cc;
          background: #fcfaf9;
        }

        .booking-calendar-day.selected {
          border-color: #cdaeb5;
          background: var(--admin-rose-soft);
        }

        .booking-calendar-day.today
          .booking-calendar-day-number {
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .booking-calendar-day.empty {
          border-color: transparent;
          background: transparent;
          cursor: default;
        }

        .booking-calendar-day-number {
          display: block;
          font-size: 14px;
          font-weight: 800;
        }

        .booking-calendar-day-info {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 12px;
          color: #716568;
          font-size: 9px;
          font-weight: 700;
          line-height: 1.2;
        }

        .booking-calendar-dot {
          width: 6px;
          height: 6px;
          flex: 0 0 6px;
          border-radius: 50%;
          background: #8d6870;
        }

        .booking-calendar-details h2 {
          margin: 4px 0 20px;
          font-size: 22px;
          line-height: 1.15;
        }

        .booking-calendar-empty {
          padding: 18px 0;
        }

        .booking-calendar-bookings {
          display: grid;
          gap: 10px;
        }

        .booking-calendar-booking {
          padding: 13px;
          border: 1px solid #eee8e4;
          border-radius: 10px;
          background: #fff;
        }

        .booking-calendar-booking-main {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .booking-calendar-customer {
          display: block;
          font-size: 14px;
        }

        .booking-calendar-time {
          margin-top: 3px;
          color: #716568;
          font-size: 12px;
          font-weight: 700;
        }

        .booking-calendar-meta {
          display: flex;
          flex-direction: column;
          gap: 3px;
          margin-top: 11px;
          color: #83787a;
          font-size: 10px;
        }

        .booking-calendar-view {
          display: inline-block;
          margin-top: 12px;
          color: var(--admin-text);
          font-size: 11px;
          font-weight: 800;
          text-decoration: none;
        }

        .booking-calendar-view:hover {
          text-decoration: underline;
        }

        .booking-calendar-status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px 7px;
          border-radius: 999px;
          background: #f2eeee;
          color: #62595b;
          font-size: 8px;
          font-weight: 800;
          line-height: 1;
          white-space: nowrap;
        }

        @media (max-width: 900px) {
          .booking-calendar-layout {
            grid-template-columns: 1fr;
          }

          .booking-calendar-details {
            order: 2;
          }
        }

        @media (max-width: 600px) {
          .booking-calendar-toolbar {
            align-items: stretch;
          }

          .booking-calendar-month {
            flex: 1;
          }

          .booking-calendar-month h2 {
            min-width: 0;
            flex: 1;
            font-size: 19px;
          }

          .booking-calendar-weekdays,
          .booking-calendar-grid {
            gap: 3px;
          }

          .booking-calendar-day {
            min-height: 64px;
            padding: 6px;
            border-radius: 7px;
          }

          .booking-calendar-day-number {
            font-size: 12px;
          }

          .booking-calendar-day-info {
            margin-top: 8px;
            font-size: 7px;
          }

          .booking-calendar-dot {
            width: 5px;
            height: 5px;
            flex-basis: 5px;
          }

          .booking-calendar-weekday {
            font-size: 8px;
          }
        }
      `}</style>
    </div>
  );
}