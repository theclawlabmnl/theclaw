"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type Variation = {
  id: string;
  service_id: string;
  name: string;
  price_delta: number | null;
  duration_delta_minutes: number | null;
  active: boolean;
  sort_order: number | null;
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  duration_minutes: number | null;
  active: boolean;
  service_variations?: Variation[] | null;
};

type BookingService = {
  id: string;
  service_id: string | null;
  variation_id: string | null;
  service_name: string | null;
  variation_name: string | null;
  price: number | null;
  duration_minutes: number | null;
};

type Payment = {
  id: string;
  method: string;
  amount: number | null;
  status: string;
  verified_at?: string | null;
  created_at?: string | null;
  payment_type?: string | null;
  note?: string | null;
};

type Booking = {
  id: string;
  reference_code: string | null;
  status: string;
  customer_name: string;
  mobile_number: string;
  social_handle: string;
  preferred_date: string;
  preferred_time: string;
  removal: string;
  notes: string;
  estimated_total: number;
  down_payment: number;
  discount_verified?: boolean;
  discount_amount?: number;
  final_total?: number;
  remaining?: number;
  booking_services: BookingService[];
  payments?: Payment[];
};

type SelectedServices = Record<string, string>;

type PaymentType =
  | "balance"
  | "tip"
  | "additional_charge"
  | "other";

type AvailabilityDay = {
  date: string;
  available: boolean;
  slots: string[];
};

type AvailabilityMonthResponse = {
  month: string;
  duration: number;
  days: AvailabilityDay[];
};

function peso(value: number) {
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatTime(value: string) {
  const parts = value.split(":");
  const hour = Number(parts[0]);
  const minute = Number(parts[1] || 0);

  if (!Number.isFinite(hour)) {
    return value;
  }

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour =
    hour % 12 === 0 ? 12 : hour % 12;

  return `${displayHour}:${String(minute).padStart(
    2,
    "0"
  )} ${suffix}`;
}

function normalizeTime(value: string) {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();

  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [hour, minute] = trimmed.split(":");

    return `${String(Number(hour)).padStart(
      2,
      "0"
    )}:${minute}`;
  }

  const match = trimmed.match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
  );

  if (!match) {
    return trimmed;
  }

  let hour = Number(match[1]);
  const minute = match[2];
  const period = match[3].toUpperCase();

  if (period === "PM" && hour !== 12) {
    hour += 12;
  }

  if (period === "AM" && hour === 12) {
    hour = 0;
  }

  return `${String(hour).padStart(
    2,
    "0"
  )}:${minute}`;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function parseDate(value: string) {
  const [year, month, day] =
    value.split("-").map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return new Date();
  }

  return new Date(
    year,
    month - 1,
    day
  );
}

function monthLabel(date: Date) {
  return date.toLocaleDateString(
    "en-PH",
    {
      month: "long",
      year: "numeric",
    }
  );
}

function buildCalendarDays(
  currentMonth: Date
) {
  const year =
    currentMonth.getFullYear();

  const month =
    currentMonth.getMonth();

  const firstDay = new Date(
    year,
    month,
    1
  );

  const lastDay = new Date(
    year,
    month + 1,
    0
  );

  const startOffset =
    firstDay.getDay();

  const totalDays =
    lastDay.getDate();

  const cells: Array<
    Date | null
  > = [];

  for (
    let index = 0;
    index < startOffset;
    index += 1
  ) {
    cells.push(null);
  }

  for (
    let day = 1;
    day <= totalDays;
    day += 1
  ) {
    cells.push(
      new Date(
        year,
        month,
        day
      )
    );
  }

  while (
    cells.length % 7 !== 0
  ) {
    cells.push(null);
  }

  return cells;
}

export default function AdminBookingEditForm({
  booking,
  services,
  removalOptions,
}: {
  booking: Booking;
  services: Service[];
  removalOptions: string[];
}) {
  const initialSelected = useMemo(() => {
    const result: SelectedServices = {};

    booking.booking_services.forEach(
      (item) => {
        if (item.service_id) {
          result[item.service_id] =
            item.variation_id || "";
        }
      }
    );

    return result;
  }, [booking.booking_services]);

  const [selected, setSelected] =
    useState<SelectedServices>(
      initialSelected
    );

  const [customerName, setCustomerName] =
    useState(booking.customer_name);

  const [mobileNumber, setMobileNumber] =
    useState(booking.mobile_number);

  const [socialHandle, setSocialHandle] =
    useState(
      booking.social_handle || ""
    );

  const [preferredDate, setPreferredDate] =
    useState(
      booking.preferred_date
    );

  const [preferredTime, setPreferredTime] =
    useState(
      normalizeTime(
        booking.preferred_time?.slice(
          0,
          5
        ) || ""
      )
    );

  const [removal, setRemoval] =
    useState(
      booking.removal || ""
    );

  const [notes, setNotes] =
    useState(
      booking.notes || ""
    );

  const [paymentType, setPaymentType] =
    useState<PaymentType>(
      "additional_charge"
    );

  const [paymentMethod, setPaymentMethod] =
    useState("Cash");

  const [paymentAmount, setPaymentAmount] =
    useState("");

  const [paymentNote, setPaymentNote] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const [paymentBusy, setPaymentBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  const [paymentError, setPaymentError] =
    useState("");

  const [saved, setSaved] =
    useState(false);

  const [paymentSaved, setPaymentSaved] =
    useState(false);

  /*
   * AVAILABILITY STATE
   */
  const initialDate = useMemo(
    () =>
      preferredDate
        ? parseDate(preferredDate)
        : new Date(),
    []
  );

  const [calendarMonth, setCalendarMonth] =
    useState(
      new Date(
        initialDate.getFullYear(),
        initialDate.getMonth(),
        1
      )
    );

  const [availabilityDays, setAvailabilityDays] =
    useState<
      Record<
        string,
        AvailabilityDay
      >
    >({});

  const [availabilityLoading, setAvailabilityLoading] =
    useState(false);

  const [availabilityError, setAvailabilityError] =
    useState("");

  /*
   * CURRENT SERVICES
   */
  const selectedItems = useMemo(() => {
    return services
      .filter(
        (service) =>
          selected[service.id] !==
          undefined
      )
      .map((service) => {
        const variation =
          service.service_variations?.find(
            (item) =>
              item.id ===
              selected[service.id]
          );

        return {
          service_id: service.id,
          service_name:
            service.name,
          variation_id:
            variation?.id || null,
          variation_name:
            variation?.name || null,
          price:
            Number(
              service.price || 0
            ) +
            Number(
              variation?.price_delta ||
                0
            ),
          duration_minutes:
            Number(
              service.duration_minutes ||
                0
            ) +
            Number(
              variation?.duration_delta_minutes ||
                0
            ),
        };
      });
  }, [services, selected]);

  const total = selectedItems.reduce(
    (sum, item) =>
      sum +
      Number(item.price || 0),
    0
  );

  const duration = Math.max(
    30,
    selectedItems.reduce(
      (sum, item) =>
        sum +
        Number(
          item.duration_minutes ||
            0
        ),
      0
    )
  );

  /*
   * PAYMENT ACCOUNTING
   */
  const payments =
    booking.payments || [];

  const verifiedPayments =
    payments.filter(
      (payment) =>
        payment.status ===
          "verified" ||
        Boolean(
          payment.verified_at
        )
    );

  const verifiedDownPayment =
    verifiedPayments
      .filter(
        (payment) =>
          payment.payment_type ===
            "down_payment" ||
          payment.payment_type ===
            "booking_payment"
      )
      .reduce(
        (sum, payment) =>
          sum +
          Number(
            payment.amount || 0
          ),
        0
      );

  const verifiedBalancePayments =
    verifiedPayments
      .filter(
        (payment) =>
          payment.payment_type ===
          "balance"
      )
      .reduce(
        (sum, payment) =>
          sum +
          Number(
            payment.amount || 0
          ),
        0
      );

  /*
   * DISCOUNT
   */
  const storedDiscountAmount =
    Number(
      booking.discount_amount ||
        0
    );

  const discountAmount =
    booking.discount_verified
      ? storedDiscountAmount > 0
        ? storedDiscountAmount
        : Number(
            (
              total * 0.05
            ).toFixed(2)
          )
      : 0;

  const currentFinalTotal =
    Math.max(
      0,
      total -
        discountAmount
    );

  const currentRemaining =
    Math.max(
      0,
      currentFinalTotal -
        verifiedDownPayment -
        verifiedBalancePayments
    );

  /*
   * LOAD MONTHLY AVAILABILITY
   */
  useEffect(() => {
    let cancelled = false;

    async function loadAvailability() {
      setAvailabilityLoading(
        true
      );
      setAvailabilityError("");

      try {
        const params =
          new URLSearchParams();

        params.set(
          "month",
          monthKey(calendarMonth)
        );

        params.set(
          "duration",
          String(duration)
        );

        /*
         * Tell the availability endpoint which
         * booking is currently being edited.
         *
         * The backend can exclude this booking
         * from overlap calculations.
         */
        params.set(
          "exclude_booking_id",
          booking.id
        );

        const response =
          await fetch(
            `/api/availability?${params.toString()}`,
            {
              cache: "no-store",
            }
          );

        const result =
          (await response.json()) as
            | AvailabilityMonthResponse
            | {
                error?: string;
              };

        if (!response.ok) {
          throw new Error(
            "error" in result &&
              result.error
              ? result.error
              : "Unable to load availability."
          );
        }

        const days =
          "days" in result
            ? result.days || []
            : [];

        const mapped: Record<
          string,
          AvailabilityDay
        > = {};

        days.forEach((day) => {
          mapped[day.date] = {
            date: day.date,
            available:
              Boolean(
                day.available
              ),
            slots:
              Array.isArray(
                day.slots
              )
                ? day.slots.map(
                    normalizeTime
                  )
                : [],
          };
        });

        /*
         * Make sure the current booking remains
         * selectable even if an older backend
         * does not yet support exclude_booking_id.
         */
        if (
          booking.preferred_date &&
          booking.preferred_time
        ) {
          const currentDate =
            booking.preferred_date;

          const currentTime =
            normalizeTime(
              booking.preferred_time.slice(
                0,
                5
              )
            );

          const existing =
            mapped[currentDate];

          if (existing) {
            if (
              !existing.slots.includes(
                currentTime
              )
            ) {
              existing.slots = [
                ...existing.slots,
                currentTime,
              ].sort();
            }

            existing.available =
              true;
          }
        }

        if (!cancelled) {
          setAvailabilityDays(
            mapped
          );
        }
      } catch (err: any) {
        if (!cancelled) {
          setAvailabilityError(
            err?.message ||
              "Unable to load availability."
          );

          setAvailabilityDays({});
        }
      } finally {
        if (!cancelled) {
          setAvailabilityLoading(
            false
          );
        }
      }
    }

    loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [
    calendarMonth,
    duration,
    booking.id,
    booking.preferred_date,
    booking.preferred_time,
  ]);

  /*
   * SELECTED DATE AVAILABILITY
   */
  const selectedDay =
    availabilityDays[
      preferredDate
    ];

  const availableSlots =
    selectedDay?.slots || [];

  /*
   * If services change and the current time
   * becomes unavailable, clear it.
   *
   * Do not clear the current booking's original
   * time while it is still valid for this edit.
   */
  useEffect(() => {
    if (
      !preferredDate ||
      !preferredTime ||
      availabilityLoading
    ) {
      return;
    }

    const day =
      availabilityDays[
        preferredDate
      ];

    if (!day) {
      return;
    }

    if (
      !day.slots.includes(
        normalizeTime(
          preferredTime
        )
      )
    ) {
      setPreferredTime("");
    }
  }, [
    availabilityDays,
    preferredDate,
    preferredTime,
    availabilityLoading,
  ]);

  const calendarDays =
    useMemo(
      () =>
        buildCalendarDays(
          calendarMonth
        ),
      [calendarMonth]
    );

  const previousMonth = () => {
    setCalendarMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() -
            1,
          1
        )
    );
  };

  const nextMonth = () => {
    setCalendarMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() +
            1,
          1
        )
    );
  };

  const selectDate = (
    value: string
  ) => {
    const day =
      availabilityDays[value];

    if (
      !day ||
      (!day.available &&
        value !==
          booking.preferred_date)
    ) {
      return;
    }

    setPreferredDate(value);

    const currentTime =
      normalizeTime(
        preferredTime
      );

    if (
      day.slots.includes(
        currentTime
      )
    ) {
      setPreferredTime(
        currentTime
      );
    } else {
      setPreferredTime("");
    }
  };

  const selectTime = (
    value: string
  ) => {
    setPreferredTime(
      normalizeTime(value)
    );
  };

  const toggleService = (
    serviceId: string
  ) => {
    setSelected((current) => {
      const next = {
        ...current,
      };

      if (
        next[serviceId] !==
        undefined
      ) {
        delete next[serviceId];
      } else {
        next[serviceId] = "";
      }

      return next;
    });
  };

  const updateVariation = (
    serviceId: string,
    variationId: string
  ) => {
    setSelected((current) => ({
      ...current,
      [serviceId]:
        variationId,
    }));
  };

  const save = async () => {
    setError("");
    setSaved(false);

    if (!customerName.trim()) {
      setError(
        "Customer name is required."
      );
      return;
    }

    if (!mobileNumber.trim()) {
      setError(
        "Mobile number is required."
      );
      return;
    }

    if (!preferredDate) {
      setError(
        "Appointment date is required."
      );
      return;
    }

    if (!preferredTime) {
      setError(
        "Appointment time is required."
      );
      return;
    }

    if (!selectedItems.length) {
      setError(
        "Please select at least one service."
      );
      return;
    }

    const selectedDay =
      availabilityDays[
        preferredDate
      ];

    if (
      selectedDay &&
      !selectedDay.slots.includes(
        normalizeTime(
          preferredTime
        )
      )
    ) {
      setError(
        "That appointment time is no longer available. Please choose another time."
      );
      return;
    }

    setBusy(true);

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
              action: "edit",
              id: booking.id,

              customer_name:
                customerName.trim(),

              mobile_number:
                mobileNumber.trim(),

              social_handle:
                socialHandle.trim(),

              preferred_date:
                preferredDate,

              preferred_time:
                normalizeTime(
                  preferredTime
                ),

              removal:
                removal.trim(),

              notes:
                notes.trim(),

              services:
                selectedItems,
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

      setSaved(true);

      window.setTimeout(() => {
        window.location.href =
          `/admin/bookings/${booking.id}`;
      }, 700);
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to save booking."
      );
    } finally {
      setBusy(false);
    }
  };

  const recordPayment = async () => {
    setPaymentError("");
    setPaymentSaved(false);

    let amount =
      Number(paymentAmount);

    if (
      paymentType === "balance" &&
      (!Number.isFinite(amount) ||
        amount <= 0)
    ) {
      amount =
        currentRemaining;
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setPaymentError(
        "Enter a valid payment amount."
      );
      return;
    }

    if (
      paymentType === "balance" &&
      amount >
        currentRemaining
    ) {
      setPaymentError(
        `Balance payment cannot exceed the current remaining balance of ${peso(
          currentRemaining
        )}.`
      );
      return;
    }

    setPaymentBusy(true);

    try {
      const response =
        await fetch(
          "/api/admin/payments",
          {
            method: "PATCH",
            headers: {
              "content-type":
                "application/json",
            },
            body: JSON.stringify({
              action: "record",
              booking_id:
                booking.id,
              payment_type:
                paymentType,
              method:
                paymentMethod,
              amount,
              note:
                paymentNote.trim(),
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
      setPaymentSaved(true);

      window.setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (err: any) {
      setPaymentError(
        err?.message ||
          "Unable to record payment."
      );
    } finally {
      setPaymentBusy(false);
    }
  };

  const cancel = () => {
    window.location.href =
      `/admin/bookings/${booking.id}`;
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 860,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "grid",
          gap: 18,
        }}
      >
        {/* CUSTOMER DETAILS */}
        <section
          className="card"
          style={{
            padding: 24,
          }}
        >
          <div className="kicker">
            Customer
          </div>

          <h2
            className="serif"
            style={{
              marginTop: 6,
              marginBottom: 0,
            }}
          >
            Customer details
          </h2>

          <div
            style={{
              display: "grid",
              gap: 14,
              marginTop: 20,
            }}
          >
            <div className="field">
              <label>Name *</label>

              <input
                value={customerName}
                disabled={busy}
                onChange={(event) =>
                  setCustomerName(
                    event.target.value
                  )
                }
              />
            </div>

            <div className="field">
              <label>
                Mobile number *
              </label>

              <input
                inputMode="tel"
                value={mobileNumber}
                disabled={busy}
                onChange={(event) =>
                  setMobileNumber(
                    event.target.value
                  )
                }
              />
            </div>

            <div className="field">
              <label>
                IG or Messenger handle
              </label>

              <input
                value={socialHandle}
                disabled={busy}
                onChange={(event) =>
                  setSocialHandle(
                    event.target.value
                  )
                }
              />
            </div>
          </div>
        </section>

        {/* APPOINTMENT */}
        <section
          className="card"
          style={{
            padding: 24,
          }}
        >
          <div className="kicker">
            Appointment
          </div>

          <h2
            className="serif"
            style={{
              marginTop: 6,
              marginBottom: 0,
            }}
          >
            Choose appointment
          </h2>

          <div
            style={{
              marginTop: 18,
              padding: 14,
              border:
                "1px solid var(--line)",
              borderRadius: 14,
              background:
                "rgba(0,0,0,0.015)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                gap: 12,
              }}
            >
              <button
                type="button"
                className="btn secondary"
                disabled={
                  busy ||
                  availabilityLoading
                }
                onClick={
                  previousMonth
                }
                style={{
                  minWidth: 42,
                  padding:
                    "8px 12px",
                }}
              >
                ←
              </button>

              <strong
                style={{
                  fontSize: 16,
                }}
              >
                {monthLabel(
                  calendarMonth
                )}
              </strong>

              <button
                type="button"
                className="btn secondary"
                disabled={
                  busy ||
                  availabilityLoading
                }
                onClick={nextMonth}
                style={{
                  minWidth: 42,
                  padding:
                    "8px 12px",
                }}
              >
                →
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(7, minmax(0, 1fr))",
                gap: 5,
                marginTop: 14,
              }}
            >
              {[
                "Sun",
                "Mon",
                "Tue",
                "Wed",
                "Thu",
                "Fri",
                "Sat",
              ].map((day) => (
                <div
                  key={day}
                  className="muted"
                  style={{
                    textAlign:
                      "center",
                    fontSize: 11,
                    fontWeight: 600,
                    padding:
                      "5px 0",
                  }}
                >
                  {day}
                </div>
              ))}

              {calendarDays.map(
                (date, index) => {
                  if (!date) {
                    return (
                      <div
                        key={`empty-${index}`}
                        style={{
                          minHeight: 48,
                        }}
                      />
                    );
                  }

                  const key =
                    dateKey(date);

                  const availability =
                    availabilityDays[
                      key
                    ];

                  const isSelected =
                    key ===
                    preferredDate;

                  const isCurrentBooking =
                    key ===
                    booking.preferred_date;

                  const isAvailable =
                    Boolean(
                      availability?.available
                    ) ||
                    isCurrentBooking;

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={
                        busy ||
                        availabilityLoading ||
                        !isAvailable
                      }
                      onClick={() =>
                        selectDate(key)
                      }
                      style={{
                        minHeight: 48,
                        borderRadius: 10,
                        border:
                          isSelected
                            ? "2px solid currentColor"
                            : "1px solid var(--line)",
                        background:
                          isSelected
                            ? "rgba(0,0,0,0.08)"
                            : isAvailable
                            ? "white"
                            : "rgba(0,0,0,0.025)",
                        color:
                          isAvailable
                            ? "inherit"
                            : "var(--muted)",
                        cursor:
                          isAvailable
                            ? "pointer"
                            : "not-allowed",
                        opacity:
                          isAvailable
                            ? 1
                            : 0.48,
                        padding:
                          "6px 3px",
                        position:
                          "relative",
                      }}
                    >
                      <div
                        style={{
                          fontWeight:
                            isSelected
                              ? 700
                              : 500,
                          fontSize: 14,
                        }}
                      >
                        {date.getDate()}
                      </div>

                      {isAvailable && (
                        <div
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius:
                              "50%",
                            background:
                              "currentColor",
                            margin:
                              "4px auto 0",
                            opacity: 0.65,
                          }}
                        />
                      )}
                    </button>
                  );
                }
              )}
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 14,
                marginTop: 14,
                fontSize: 12,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems:
                    "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius:
                      "50%",
                    background:
                      "currentColor",
                  }}
                />
                Available
              </span>

              <span
                className="muted"
              >
                Unavailable dates are
                disabled.
              </span>
            </div>
          </div>

          {availabilityLoading && (
            <div
              className="notice"
              style={{
                marginTop: 14,
              }}
            >
              Checking availability…
            </div>
          )}

          {availabilityError && (
            <div
              className="notice"
              style={{
                marginTop: 14,
                borderColor:
                  "rgba(160, 70, 70, 0.35)",
              }}
            >
              {availabilityError}
            </div>
          )}

          {preferredDate && (
            <div
              style={{
                marginTop: 18,
              }}
            >
              <div
                className="field"
              >
                <label>
                  Available times *
                </label>

                {availableSlots.length >
                0 ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(110px, 1fr))",
                      gap: 8,
                      marginTop: 8,
                    }}
                  >
                    {availableSlots.map(
                      (slot) => {
                        const normalized =
                          normalizeTime(
                            slot
                          );

                        const selectedTime =
                          normalizeTime(
                            preferredTime
                          );

                        const active =
                          normalized ===
                          selectedTime;

                        return (
                          <button
                            key={
                              normalized
                            }
                            type="button"
                            disabled={
                              busy ||
                              availabilityLoading
                            }
                            onClick={() =>
                              selectTime(
                                normalized
                              )
                            }
                            style={{
                              border:
                                active
                                  ? "2px solid currentColor"
                                  : "1px solid var(--line)",
                              background:
                                active
                                  ? "rgba(0,0,0,0.08)"
                                  : "white",
                              borderRadius: 10,
                              padding:
                                "10px 8px",
                              fontWeight:
                                active
                                  ? 700
                                  : 500,
                              cursor:
                                "pointer",
                            }}
                          >
                            {formatTime(
                              normalized
                            )}
                          </button>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <div
                    className="notice"
                    style={{
                      marginTop: 8,
                    }}
                  >
                    No available times
                    for this date.
                    Please choose another
                    date.
                  </div>
                )}
              </div>
            </div>
          )}

          {preferredDate &&
            preferredTime && (
              <div
                style={{
                  marginTop: 16,
                  padding: 14,
                  border:
                    "1px solid var(--line)",
                  borderRadius: 12,
                  display: "grid",
                  gap: 5,
                }}
              >
                <span className="muted">
                  Selected appointment
                </span>

                <strong>
                  {parseDate(
                    preferredDate
                  ).toLocaleDateString(
                    "en-PH",
                    {
                      weekday:
                        "long",
                      month:
                        "long",
                      day: "numeric",
                      year:
                        "numeric",
                    }
                  )}
                </strong>

                <strong>
                  {formatTime(
                    preferredTime
                  )}
                </strong>

                <span
                  className="muted"
                  style={{
                    fontSize: 13,
                  }}
                >
                  Estimated duration:{" "}
                  {duration} minutes
                </span>
              </div>
            )}
        </section>

        {/* SERVICES */}
        <section
          className="card"
          style={{
            padding: 24,
          }}
        >
          <div className="kicker">
            Services
          </div>

          <h2
            className="serif"
            style={{
              marginTop: 6,
              marginBottom: 0,
            }}
          >
            Services and variations
          </h2>

          <div
            style={{
              display: "grid",
              gap: 10,
              marginTop: 20,
            }}
          >
            {services.map((service) => {
              const checked =
                selected[
                  service.id
                ] !== undefined;

              const variations =
                (
                  service.service_variations ||
                  []
                )
                  .filter(
                    (variation) =>
                      variation.active
                  )
                  .sort(
                    (a, b) =>
                      Number(
                        a.sort_order ||
                          0
                      ) -
                      Number(
                        b.sort_order ||
                          0
                      )
                  );

              return (
                <div
                  key={service.id}
                  style={{
                    border:
                      "1px solid var(--line)",
                    borderRadius: 14,
                    padding: 15,
                  }}
                >
                  <label
                    style={{
                      display:
                        "flex",
                      gap: 11,
                      alignItems:
                        "flex-start",
                      margin: 0,
                      cursor:
                        busy
                          ? "default"
                          : "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        checked
                      }
                      disabled={
                        busy
                      }
                      onChange={() =>
                        toggleService(
                          service.id
                        )
                      }
                      style={{
                        marginTop: 3,
                        flex:
                          "0 0 auto",
                      }}
                    />

                    <span
                      style={{
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <strong>
                        {
                          service.name
                        }
                      </strong>

                      {service.description && (
                        <div
                          className="muted"
                          style={{
                            marginTop: 4,
                            lineHeight:
                              1.5,
                          }}
                        >
                          {
                            service.description
                          }
                        </div>
                      )}

                      <div
                        className="muted"
                        style={{
                          marginTop: 5,
                          fontSize: 13,
                        }}
                      >
                        {peso(
                          Number(
                            service.price ||
                              0
                          )
                        )}
                      </div>
                    </span>
                  </label>

                  {checked &&
                    variations.length >
                      0 && (
                      <div
                        className="field"
                        style={{
                          marginTop: 12,
                          marginBottom: 0,
                          marginLeft: 29,
                        }}
                      >
                        <label>
                          Variation
                        </label>

                        <select
                          value={
                            selected[
                              service.id
                            ]
                          }
                          disabled={
                            busy
                          }
                          onChange={(
                            event
                          ) =>
                            updateVariation(
                              service.id,
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
                              variation
                            ) => {
                              const delta =
                                Number(
                                  variation.price_delta ||
                                    0
                                );

                              return (
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
                                  }{" "}
                                  {delta >=
                                  0
                                    ? `(+${peso(
                                        delta
                                      )})`
                                    : `(${peso(
                                        delta
                                      )})`}
                                </option>
                              );
                            }
                          )}
                        </select>
                      </div>
                    )}
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 20,
              paddingTop: 18,
              borderTop:
                "1px solid var(--line)",
              display: "grid",
              gap: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                gap: 15,
              }}
            >
              <span className="muted">
                Services total
              </span>

              <strong>
                {peso(total)}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                gap: 15,
              }}
            >
              <span className="muted">
                Estimated duration
              </span>

              <strong>
                {duration} min
              </strong>
            </div>
          </div>
        </section>

        {/* REMOVAL */}
        <section
          className="card"
          style={{
            padding: 24,
          }}
        >
          <div className="kicker">
            Removal
          </div>

          <h2
            className="serif"
            style={{
              marginTop: 6,
              marginBottom: 0,
            }}
          >
            Removal
          </h2>

          <div
            className="field"
            style={{
              marginTop: 20,
            }}
          >
            <select
              value={removal}
              disabled={busy}
              onChange={(event) =>
                setRemoval(
                  event.target.value
                )
              }
            >
              {removalOptions.map(
                (option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option}
                  </option>
                )
              )}
            </select>
          </div>
        </section>

        {/* NOTES */}
        <section
          className="card"
          style={{
            padding: 24,
          }}
        >
          <div className="kicker">
            Notes
          </div>

          <h2
            className="serif"
            style={{
              marginTop: 6,
              marginBottom: 0,
            }}
          >
            Additional requests
          </h2>

          <div
            className="field"
            style={{
              marginTop: 20,
            }}
          >
            <textarea
              value={notes}
              disabled={busy}
              onChange={(event) =>
                setNotes(
                  event.target.value
                )
              }
              placeholder="Additional notes..."
              style={{
                minHeight: 150,
                resize: "vertical",
              }}
            />
          </div>
        </section>

        {/* PAYMENTS */}
        <section
          className="card"
          style={{
            padding: 24,
          }}
        >
          <div className="kicker">
            Payments
          </div>

          <h2
            className="serif"
            style={{
              marginTop: 6,
              marginBottom: 0,
            }}
          >
            Record payment
          </h2>

          <p
            className="muted"
            style={{
              marginTop: 8,
              lineHeight: 1.5,
            }}
          >
            Record balance payments,
            additional charges, tips,
            or other payments.
          </p>

          <div
            style={{
              marginTop: 18,
              padding: 16,
              border:
                "1px solid var(--line)",
              borderRadius: 14,
              display: "grid",
              gap: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                gap: 15,
              }}
            >
              <span className="muted">
                Current total
              </span>

              <strong>
                {peso(total)}
              </strong>
            </div>

            {discountAmount > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  gap: 15,
                }}
              >
                <span className="muted">
                  Discount
                </span>

                <strong>
                  −{peso(
                    discountAmount
                  )}
                </strong>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                gap: 15,
                paddingTop: 8,
                borderTop:
                  "1px solid var(--line)",
              }}
            >
              <strong>
                Final total
              </strong>

              <strong>
                {peso(
                  currentFinalTotal
                )}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                gap: 15,
              }}
            >
              <span className="muted">
                Down payment
                (verified)
              </span>

              <strong>
                {peso(
                  verifiedDownPayment
                )}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                gap: 15,
              }}
            >
              <span className="muted">
                Balance paid
              </span>

              <strong>
                {peso(
                  verifiedBalancePayments
                )}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                gap: 15,
                paddingTop: 10,
                marginTop: 2,
                borderTop:
                  "1px solid var(--line)",
              }}
            >
              <strong>
                Remaining
              </strong>

              <strong>
                {peso(
                  currentRemaining
                )}
              </strong>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 14,
              marginTop: 20,
            }}
          >
            <div className="field">
              <label>
                Payment type
              </label>

              <select
                value={paymentType}
                disabled={
                  paymentBusy
                }
                onChange={(event) => {
                  const value =
                    event.target
                      .value as PaymentType;

                  setPaymentType(
                    value
                  );

                  if (
                    value ===
                    "balance"
                  ) {
                    setPaymentAmount(
                      currentRemaining >
                        0
                        ? currentRemaining.toFixed(
                            2
                          )
                        : ""
                    );
                  }
                }}
              >
                <option value="additional_charge">
                  Additional Charge
                </option>

                <option value="balance">
                  Balance Payment
                </option>

                <option value="tip">
                  Tip
                </option>

                <option value="other">
                  Other
                </option>
              </select>
            </div>

            <div className="inline-grid">
              <div className="field">
                <label>
                  Amount
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={
                    paymentAmount
                  }
                  disabled={
                    paymentBusy
                  }
                  onChange={(event) =>
                    setPaymentAmount(
                      event.target
                        .value
                    )
                  }
                  placeholder={
                    paymentType ===
                    "balance"
                      ? currentRemaining.toFixed(
                          2
                        )
                      : "0.00"
                  }
                />

                {paymentType ===
                  "balance" && (
                  <div
                    className="muted"
                    style={{
                      marginTop: 5,
                      fontSize: 13,
                    }}
                  >
                    Maximum:{" "}
                    {peso(
                      currentRemaining
                    )}
                  </div>
                )}
              </div>

              <div className="field">
                <label>
                  Payment method
                </label>

                <select
                  value={
                    paymentMethod
                  }
                  disabled={
                    paymentBusy
                  }
                  onChange={(event) =>
                    setPaymentMethod(
                      event.target
                        .value
                    )
                  }
                >
                  <option>
                    Cash
                  </option>

                  <option>
                    GCash
                  </option>

                  <option>
                    Bank Transfer
                  </option>

                  <option>
                    Maya
                  </option>

                  <option>
                    Card
                  </option>

                  <option>
                    Other
                  </option>
                </select>
              </div>
            </div>

            <div className="field">
              <label>
                Note
              </label>

              <input
                value={paymentNote}
                disabled={
                  paymentBusy
                }
                onChange={(event) =>
                  setPaymentNote(
                    event.target
                      .value
                  )
                }
                placeholder="Optional note"
              />
            </div>

            {paymentError && (
              <div
                className="notice"
                style={{
                  borderColor:
                    "rgba(160, 70, 70, 0.35)",
                }}
              >
                {paymentError}
              </div>
            )}

            {paymentSaved && (
              <div className="notice">
                Payment recorded
                successfully.
              </div>
            )}

            <button
              type="button"
              className="btn"
              disabled={
                paymentBusy
              }
              onClick={
                recordPayment
              }
            >
              {paymentBusy
                ? "Recording…"
                : "Record Payment"}
            </button>
          </div>
        </section>

        {error && (
          <div
            className="notice"
            style={{
              borderColor:
                "rgba(160, 70, 70, 0.35)",
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        {saved && (
          <div
            className="notice"
            style={{
              lineHeight: 1.5,
            }}
          >
            Booking updated
            successfully. Returning
            to booking details…
          </div>
        )}

        {/* ACTIONS */}
        <div
          className="card"
          style={{
            padding: 18,
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "flex-end",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="btn secondary"
            disabled={busy}
            onClick={cancel}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn"
            disabled={
              busy ||
              availabilityLoading
            }
            onClick={save}
          >
            {busy
              ? "Saving…"
              : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
