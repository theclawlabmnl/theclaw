"use client";

import {
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { peso } from "@/lib/utils";

function money(
  value: number
) {
  return peso(
    Number(value || 0)
  );
}

function formatReadableDate(
  value: string
) {
  if (!value) {
    return "—";
  }

  return new Date(
    `${value}T12:00:00`
  ).toLocaleDateString(
    "en-US",
    {
      weekday:
        "long",
      month:
        "long",
      day:
        "numeric",
      year:
        "numeric",
    }
  );
}

type BookingService = {
  id: string;
  service_id: string | null;
  variation_id: string | null;
  service_name: string;
  variation_name: string | null;
  price: number;
  duration_minutes: number;
};

export default function BookingEditor({
  booking,
  bookingServices,
  services,
  payments,
}: {
  booking: any;
  bookingServices: BookingService[];
  services: any[];
  payments: any[];
}) {
  const router =
    useRouter();

  const [name, setName] =
    useState(
      booking.customer_name ||
        ""
    );

  const [mobile, setMobile] =
    useState(
      booking.mobile_number ||
        ""
    );

  const [social, setSocial] =
    useState(
      booking.social_handle ||
        ""
    );

  const [date, setDate] =
    useState(
      String(
        booking.preferred_date ||
          ""
      ).slice(0, 10)
    );

  const [time, setTime] =
    useState(
      String(
        booking.preferred_time ||
          ""
      ).slice(0, 5)
    );

  const [notes, setNotes] =
    useState(
      booking.notes || ""
    );

  const [selectedServices, setSelectedServices] =
    useState<
      Array<{
        service_id: string;
        variation_id: string;
      }>
    >(
      bookingServices.map(
        (item) => ({
          service_id:
            item.service_id ||
            "",
          variation_id:
            item.variation_id ||
            "",
        })
      )
    );

  const [durationInfo, setDurationInfo] =
    useState(
      bookingServices.reduce(
        (
          sum,
          item
        ) =>
          sum +
          Number(
            item.duration_minutes ||
              0
          ),
        0
      )
    );

  const [estimatedTotal, setEstimatedTotal] =
    useState(
      Number(
        booking.estimated_total ||
          0
      )
    );

  const [paymentAmount, setPaymentAmount] =
    useState("");

  const [paymentMethod, setPaymentMethod] =
    useState("gcash");

  const [paymentNote, setPaymentNote] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const selectableServices =
    useMemo(
      () =>
        services.filter(
          (service) =>
            service.active
        ),
      [services]
    );

  const updateService =
    (
      index: number,
      key:
        | "service_id"
        | "variation_id",
      value: string
    ) => {
      setSelectedServices(
        (
          current
        ) =>
          current.map(
            (
              item,
              itemIndex
            ) =>
              itemIndex ===
              index
                ? {
                    ...item,
                    [key]:
                      value,
                  }
                : item
          )
      );

      recalculate();
    };

  const addService =
    () => {
      if (
        !selectableServices.length
      ) {
        return;
      }

      setSelectedServices(
        (
          current
        ) => [
          ...current,
          {
            service_id:
              selectableServices[0]
                .id,
            variation_id:
              "",
          },
        ]
      );

      recalculate();
    };

  const removeService =
    (index: number) => {
      setSelectedServices(
        (
          current
        ) =>
          current.filter(
            (
              _,
              itemIndex
            ) =>
              itemIndex !==
              index
          )
      );

      recalculate();
    };

  const recalculate =
    () => {
      setTimeout(() => {
        setSelectedServices(
          (
            current
          ) => {
            let total = 0;
            let duration = 0;

            current.forEach(
              (item) => {
                const service =
                  services.find(
                    (
                      candidate
                    ) =>
                      candidate.id ===
                      item.service_id
                  );

                if (!service) {
                  return;
                }

                const variation =
                  service.service_variations?.find(
                    (
                      candidate: any
                    ) =>
                      candidate.id ===
                      item.variation_id
                  );

                total +=
                  Number(
                    service.price
                  ) +
                  Number(
                    variation?.price_delta ||
                      0
                  );

                duration +=
                  Number(
                    service.duration_minutes
                  ) +
                  Number(
                    variation?.duration_delta_minutes ||
                      0
                  );
              }
            );

            setEstimatedTotal(
              total
            );

            setDurationInfo(
              duration
            );

            return current;
          }
        );
      }, 0);
    };

  const saveBooking =
    async () => {
      setSaving(true);
      setMessage("");
      setError("");

      try {
        const response =
          await fetch(
            "/api/admin/bookings",
            {
              method: "PATCH",
              headers: {
                "content-type":
                  "application/json",
              },
              body: JSON.stringify({
                action:
                  "edit",

                id: booking.id,

                customer_name:
                  name,

                mobile_number:
                  mobile,

                social_handle:
                  social,

                preferred_date:
                  date,

                preferred_time:
                  time,

                notes,

                services:
                  selectedServices,
              }),
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Unable to save booking."
          );
        }

        setEstimatedTotal(
          Number(
            result.booking
              ?.estimated_total ??
              estimatedTotal
          )
        );

        setMessage(
          "Booking saved successfully."
        );

        router.refresh();
      } catch (
        error: any
      ) {
        setError(
          error?.message ||
            "Unable to save booking."
        );
      } finally {
        setSaving(false);
      }
    };

  const recordPayment =
    async () => {
      const amount =
        Number(
          paymentAmount
        );

      if (
        !Number.isFinite(
          amount
        ) ||
        amount <= 0
      ) {
        setError(
          "Enter a valid payment amount."
        );
        return;
      }

      setSaving(true);
      setError("");
      setMessage("");

      try {
        const response =
          await fetch(
            "/api/admin/bookings",
            {
              method: "PATCH",
              headers: {
                "content-type":
                  "application/json",
              },
              body: JSON.stringify({
                action:
                  "record_payment",

                id: booking.id,

                amount,

                method:
                  paymentMethod,

                note:
                  paymentNote,
              }),
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Unable to record payment."
          );
        }

        setPaymentAmount("");
        setPaymentNote("");

        setMessage(
          "Payment recorded successfully."
        );

        router.refresh();
      } catch (
        error: any
      ) {
        setError(
          error?.message ||
            "Unable to record payment."
        );
      } finally {
        setSaving(false);
      }
    };

  const cancelBooking =
    async () => {
      if (
        !window.confirm(
          "Cancel this appointment?"
        )
      ) {
        return;
      }

      setSaving(true);
      setError("");
      setMessage("");

      try {
        const response =
          await fetch(
            "/api/admin/bookings",
            {
              method: "PATCH",
              headers: {
                "content-type":
                  "application/json",
              },
              body: JSON.stringify({
                action:
                  "status",

                id: booking.id,

                status:
                  "cancelled",
              }),
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Unable to cancel booking."
          );
        }

        setMessage(
          "Booking cancelled."
        );

        router.refresh();
      } catch (
        error: any
      ) {
        setError(
          error?.message ||
            "Unable to cancel booking."
        );
      } finally {
        setSaving(false);
      }
    };

  const remaining = Math.max(
    0,
    estimatedTotal -
      Number(
        booking.down_payment ||
          0
      )
  );

  return (
    <div className="booking-editor">
      <div className="card">
        <div className="kicker">
          Customer
        </div>

        <h2 className="serif">
          Customer details
        </h2>

        <div className="inline-grid">
          <div className="field">
            <label>
              Name
            </label>

            <input
              value={name}
              onChange={(event) =>
                setName(
                  event.target
                    .value
                )
              }
            />
          </div>

          <div className="field">
            <label>
              Mobile
            </label>

            <input
              value={mobile}
              onChange={(event) =>
                setMobile(
                  event.target
                    .value
                )
              }
            />
          </div>
        </div>

        <div className="field">
          <label>
            IG / Messenger
          </label>

          <input
            value={social}
            onChange={(event) =>
              setSocial(
                event.target
                  .value
              )
            }
          />
        </div>
      </div>

      <div className="card">
        <div className="kicker">
          Appointment
        </div>

        <h2 className="serif">
          Edit / reschedule
        </h2>

        <div className="inline-grid">
          <div className="field">
            <label>
              Date
            </label>

            <input
              type="date"
              value={date}
              onChange={(event) =>
                setDate(
                  event.target
                    .value
                )
              }
            />
          </div>

          <div className="field">
            <label>
              Time
            </label>

            <input
              type="time"
              value={time}
              onChange={(event) =>
                setTime(
                  event.target
                    .value
                )
              }
            />
          </div>
        </div>

        <div className="appointment-preview">
          <strong>
            {formatReadableDate(
              date
            )}
          </strong>

          <span>
            {time || "—"}
          </span>

          <small className="muted">
            {durationInfo ||
              0}{" "}
            minutes
          </small>
        </div>
      </div>

      <div className="card">
        <div className="kicker">
          Services
        </div>

        <h2 className="serif">
          Booking services
        </h2>

        <div className="booking-service-editor">
          {selectedServices.map(
            (
              item,
              index
            ) => {
              const service =
                services.find(
                  (
                    candidate
                  ) =>
                    candidate.id ===
                    item.service_id
                );

              const variations =
                service?.service_variations?.filter(
                  (
                    variation: any
                  ) =>
                    variation.active
                ) || [];

              return (
                <div
                  className="booking-service-edit-row"
                  key={`${index}-${item.service_id}`}
                >
                  <div className="field">
                    <label>
                      Service
                    </label>

                    <select
                      value={
                        item.service_id
                      }
                      onChange={(
                        event
                      ) =>
                        updateService(
                          index,
                          "service_id",
                          event
                            .target
                            .value
                        )
                      }
                    >
                      <option value="">
                        Choose service
                      </option>

                      {selectableServices.map(
                        (
                          option
                        ) => (
                          <option
                            key={
                              option.id
                            }
                            value={
                              option.id
                            }
                          >
                            {
                              option.name
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="field">
                    <label>
                      Variation
                    </label>

                    <select
                      value={
                        item.variation_id
                      }
                      onChange={(
                        event
                      ) =>
                        updateService(
                          index,
                          "variation_id",
                          event
                            .target
                            .value
                        )
                      }
                    >
                      <option value="">
                        Standard
                      </option>

                      {variations.map(
                        (
                          variation: any
                        ) => (
                          <option
                            key={
                              variation.id
                            }
                            value={
                              variation.id
                            }
                          >
                            {
                              variation.name
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <button
                    type="button"
                    className="btn secondary small"
                    onClick={() =>
                      removeService(
                        index
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              );
            }
          )}
        </div>

        <button
          type="button"
          className="btn secondary small"
          onClick={
            addService
          }
        >
          + Add service
        </button>
      </div>

      <div className="card">
        <div className="kicker">
          Notes
        </div>

        <h2 className="serif">
          Booking notes
        </h2>

        <div className="field">
          <textarea
            value={notes}
            onChange={(event) =>
              setNotes(
                event.target
                  .value
              )
            }
          />
        </div>
      </div>

      <div className="card">
        <div className="kicker">
          Payment
        </div>

        <h2 className="serif">
          Payment & balance
        </h2>

        <div className="payment-admin-summary">
          <div>
            <span>
              Total
            </span>

            <strong>
              {money(
                estimatedTotal
              )}
            </strong>
          </div>

          <div>
            <span>
              Paid
            </span>

            <strong>
              {money(
                booking.down_payment
              )}
            </strong>
          </div>

          <div>
            <span>
              Remaining
            </span>

            <strong>
              {money(
                remaining
              )}
            </strong>
          </div>
        </div>

        <div className="payment-record-form">
          <h3>
            Record payment
          </h3>

          <div className="inline-grid">
            <div className="field">
              <label>
                Amount
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  paymentAmount
                }
                onChange={(
                  event
                ) =>
                  setPaymentAmount(
                    event
                      .target
                      .value
                  )
                }
              />
            </div>

            <div className="field">
              <label>
                Method
              </label>

              <select
                value={
                  paymentMethod
                }
                onChange={(
                  event
                ) =>
                  setPaymentMethod(
                    event
                      .target
                      .value
                  )
                }
              >
                <option value="gcash">
                  GCash
                </option>

                <option value="qrph">
                  QR PH
                </option>

                <option value="cash">
                  Cash
                </option>

                <option value="other">
                  Other
                </option>
              </select>
            </div>
          </div>

          <div className="field">
            <label>
              Payment note
            </label>

            <input
              value={
                paymentNote
              }
              onChange={(
                event
              ) =>
                setPaymentNote(
                  event
                    .target
                    .value
                )
              }
              placeholder="Optional"
            />
          </div>

          <button
            type="button"
            className="btn"
            disabled={
              saving
            }
            onClick={
              recordPayment
            }
          >
            Record payment
          </button>
        </div>

        {!!payments.length && (
          <div
            className="payment-history"
            style={{
              marginTop: 24,
            }}
          >
            <h3>
              Payment history
            </h3>

            {payments.map(
              (payment) => (
                <div
                  className="payment-history-row"
                  key={
                    payment.id
                  }
                >
                  <div>
                    <strong>
                      {money(
                        payment.amount
                      )}
                    </strong>

                    <span className="muted">
                      {" "}
                      ·{" "}
                      {
                        payment.method
                      }
                    </span>
                  </div>

                  <span className="status-pill">
                    {
                      payment.status
                    }
                  </span>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <div className="card">
        <div className="kicker">
          Save
        </div>

        {error && (
          <div className="notice">
            {error}
          </div>
        )}

        {message && (
          <div className="notice">
            {message}
          </div>
        )}

        <div className="booking-editor-actions">
          <button
            type="button"
            className="btn"
            disabled={
              saving
            }
            onClick={
              saveBooking
            }
          >
            {saving
              ? "Saving…"
              : "Save booking changes"}
          </button>

          {![
            "cancelled",
            "completed",
            "rejected",
          ].includes(
            booking.status
          ) && (
            <button
              type="button"
              className="btn danger"
              disabled={
                saving
              }
              onClick={
                cancelBooking
              }
            >
              Cancel appointment
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .booking-editor {
          display: grid;
          gap: 15px;
        }

        .booking-editor h2 {
          margin: 4px 0 18px;
          font-size: 27px;
        }

        .appointment-preview {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 14px;
          align-items: baseline;
          margin-top: 5px;
          padding: 12px 13px;
          border-radius: 12px;
          background: var(--soft);
        }

        .appointment-preview strong {
          font-size: 14px;
        }

        .appointment-preview span {
          font-size: 13px;
        }

        .booking-service-editor {
          display: grid;
          gap: 12px;
          margin-bottom: 14px;
        }

        .booking-service-edit-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
          gap: 10px;
          align-items: end;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--line);
        }

        .booking-service-edit-row .field {
          margin-bottom: 0;
        }

        .payment-admin-summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .payment-admin-summary > div {
          display: grid;
          gap: 4px;
          min-width: 0;
          padding: 14px;
          border: 1px solid var(--line);
          border-radius: 13px;
          background: var(--soft);
        }

        .payment-admin-summary span {
          color: var(--muted);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .payment-admin-summary strong {
          font: 22px/1 Georgia, "Times New Roman", serif;
        }

        .payment-record-form {
          margin-top: 20px;
          padding-top: 18px;
          border-top: 1px solid var(--line);
        }

        .payment-record-form h3,
        .payment-history h3 {
          margin: 0 0 12px;
          font-size: 15px;
        }

        .payment-history {
          display: grid;
          gap: 0;
        }

        .payment-history-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 11px 0;
          border-top: 1px solid var(--line);
        }

        .booking-editor-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
        }

        @media (max-width: 700px) {
          .booking-service-edit-row {
            grid-template-columns: minmax(0, 1fr);
            align-items: stretch;
          }

          .booking-service-edit-row .btn {
            width: 100%;
          }

          .payment-admin-summary {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 430px) {
          .booking-editor-actions {
            flex-direction: column;
          }

          .booking-editor-actions .btn {
            width: 100%;
          }

          .payment-history-row {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}