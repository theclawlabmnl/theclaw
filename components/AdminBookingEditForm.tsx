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

type Promo = {
  id: string;
  name: string;
  description?: string | null;
  discount_type?: string | null;
  discount_value?: number | null;
  active?: boolean | null;
};

type Booking = {
  id: string;
  reference_code: string | null;
  status: string;

  customer_name: string;
  email?: string;
  mobile_number: string;
  social_handle: string;

  preferred_date: string;
  preferred_time: string;

  removal: string;
  notes: string;

  promo_name?: string | null;
  promo_id?: string | null;
  discount_category?: string | null;
  referral_name?: string | null;
  discount_verified?: boolean;
  discount_amount?: number;

  estimated_total: number;
  down_payment: number;
  final_total?: number;
  remaining?: number;

  booking_services: BookingService[];
};

type SelectedServices = Record<string, string>;

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

type DiscountChoice =
  | "none"
  | "first_time"
  | "student_pwd_sc"
  | "referral"
  | "other_amount"
  | `promo:${string}`;

function peso(value: number) {
  return `₱${Number(value || 0).toLocaleString("en-PH", {
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
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function normalizeTime(value: string) {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();

  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [hour, minute] = trimmed.split(":");

    return `${String(Number(hour)).padStart(2, "0")}:${minute}`;
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

  return `${String(hour).padStart(2, "0")}:${minute}`;
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
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
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
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

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

  const startOffset = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const cells: Array<Date | null> = [];

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

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function getInitialDiscountChoice(
  booking: Booking
): DiscountChoice {
  if (booking.promo_id) {
    return `promo:${booking.promo_id}`;
  }

  const promo = String(
    booking.promo_name || ""
  ).toLowerCase();

  if (
    promo.includes("first-time") ||
    promo.includes("first time")
  ) {
    return "first_time";
  }

  if (
    promo.includes("student / pwd / sc")
  ) {
    return "student_pwd_sc";
  }

  if (
    promo.includes("referral program")
  ) {
    return "referral";
  }

  if (
    promo.includes("manual discount") ||
    promo.includes("other amount")
  ) {
    return "other_amount";
  }

  return "none";
}

function getDiscountLabel(
  choice: DiscountChoice,
  promos: Promo[]
) {
  if (choice === "none") {
    return "No Discount";
  }

  if (choice === "first_time") {
    return "First-time Booking Discount";
  }

  if (choice === "student_pwd_sc") {
    return "Student / PWD / SC Discount";
  }

  if (choice === "referral") {
    return "Referral Program";
  }

  if (choice === "other_amount") {
    return "Other Amount";
  }

  if (choice.startsWith("promo:")) {
    const promoId = choice.slice(6);

    return (
      promos.find(
        (promo) =>
          promo.id === promoId
      )?.name ||
      "Current Promo"
    );
  }

  return "No Discount";
}

function calculatePromoDiscount(
  promo: Promo | undefined,
  total: number
) {
  if (!promo) {
    return 0;
  }

  const type = String(
    promo.discount_type || ""
  ).toLowerCase();

  const value = Number(
    promo.discount_value || 0
  );

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return 0;
  }

  if (
    type === "percentage" ||
    type === "percent" ||
    type === "percent_off"
  ) {
    return Math.min(
      total,
      total * (value / 100)
    );
  }

  return Math.min(
    total,
    value
  );
}

export default function AdminBookingEditForm({
  booking,
  services,
  removalOptions,
  promos = [],
}: {
  booking: Booking;
  services: Service[];
  removalOptions: string[];
  promos?: Promo[];
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

  const [
    selected,
    setSelected,
  ] = useState<SelectedServices>(
    initialSelected
  );

  const [
    customerName,
    setCustomerName,
  ] = useState(
    booking.customer_name
  );

  const [
    email,
    setEmail,
  ] = useState(
    booking.email || ""
  );

  const [
    mobileNumber,
    setMobileNumber,
  ] = useState(
    booking.mobile_number
  );

  const [
    socialHandle,
    setSocialHandle,
  ] = useState(
    booking.social_handle || ""
  );

  const [
    preferredDate,
    setPreferredDate,
  ] = useState(
    booking.preferred_date
  );

  const [
    preferredTime,
    setPreferredTime,
  ] = useState(
    normalizeTime(
      booking.preferred_time?.slice(
        0,
        5
      ) || ""
    )
  );

  const [
    removal,
    setRemoval,
  ] = useState(
    booking.removal || "None"
  );

  const [
    notes,
    setNotes,
  ] = useState(
    booking.notes || ""
  );

  const [
    discountChoice,
    setDiscountChoice,
  ] = useState<DiscountChoice>(
    getInitialDiscountChoice(
      booking
    )
  );

  const [
    discountCategory,
    setDiscountCategory,
  ] = useState(
    booking.discount_category || ""
  );

  const [
    referralName,
    setReferralName,
  ] = useState(
    booking.referral_name || ""
  );

  const [
    manualDiscountAmount,
    setManualDiscountAmount,
  ] = useState(
    getInitialDiscountChoice(
      booking
    ) === "other_amount"
      ? String(
          Number(
            booking.discount_amount || 0
          )
        )
      : ""
  );

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    saved,
    setSaved,
  ] = useState(false);

  const initialDate = useMemo(
    () =>
      preferredDate
        ? parseDate(preferredDate)
        : new Date(),
    []
  );

  const [
    calendarMonth,
    setCalendarMonth,
  ] = useState(
    new Date(
      initialDate.getFullYear(),
      initialDate.getMonth(),
      1
    )
  );

  const [
    availabilityDays,
    setAvailabilityDays,
  ] = useState<
    Record<
      string,
      AvailabilityDay
    >
  >({});

  const [
    availabilityLoading,
    setAvailabilityLoading,
  ] = useState(false);

  const [
    availabilityError,
    setAvailabilityError,
  ] = useState("");

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
          service_id:
            service.id,

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
  }, [
    services,
    selected,
  ]);

  const total =
    selectedItems.reduce(
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

  const discountPreview = useMemo(() => {
    if (discountChoice === "none") {
      return 0;
    }

    if (
      discountChoice ===
        "first_time" ||
      discountChoice ===
        "student_pwd_sc"
    ) {
      return Number(
        (
          total * 0.05
        ).toFixed(2)
      );
    }

    /*
     * Referral Program is a referral condition,
     * not an automatic 5% discount.
     */
    if (
      discountChoice === "referral"
    ) {
      return 0;
    }

    if (
      discountChoice ===
        "other_amount"
    ) {
      const amount = Number(
        manualDiscountAmount || 0
      );

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        return 0;
      }

      return Number(
        Math.min(
          total,
          amount
        ).toFixed(2)
      );
    }

    if (
      discountChoice.startsWith(
        "promo:"
      )
    ) {
      const promoId =
        discountChoice.slice(6);

      const promo =
        promos.find(
          (item) =>
            item.id ===
            promoId
        );

      return Number(
        calculatePromoDiscount(
          promo,
          total
        ).toFixed(2)
      );
    }

    return 0;
  }, [
    discountChoice,
    manualDiscountAmount,
    total,
    promos,
  ]);

  const finalTotal =
    Math.max(
      0,
      Number(
        (
          total -
          discountPreview
        ).toFixed(2)
      )
    );

  const calendarDays =
    useMemo(
      () =>
        buildCalendarDays(
          calendarMonth
        ),
      [calendarMonth]
    );

  const selectedDay =
    availabilityDays[
      preferredDate
    ];

  const availableSlots =
    selectedDay?.slots || [];

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

        params.set(
          "exclude_booking_id",
          booking.id
        );

        const response =
          await fetch(
            `/api/availability?${params.toString()}`,
            {
              cache:
                "no-store",
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

  function previousMonth() {
    setCalendarMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() - 1,
          1
        )
    );
  }

  function nextMonth() {
    setCalendarMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() + 1,
          1
        )
    );
  }

  function selectDate(
    value: string
  ) {
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
  }

  function selectTime(
    value: string
  ) {
    setPreferredTime(
      normalizeTime(value)
    );
  }

  function toggleService(
    service: Service
  ) {
    setSelected((current) => {
      const next = {
        ...current,
      };

      if (
        next[service.id] !==
        undefined
      ) {
        delete next[service.id];
      } else {
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
                  a.sort_order || 0
                ) -
                Number(
                  b.sort_order || 0
                )
            );

        next[service.id] =
          variations[0]?.id || "";
      }

      return next;
    });

    setPreferredTime("");
  }

  function updateVariation(
    serviceId: string,
    variationId: string
  ) {
    setSelected((current) => ({
      ...current,
      [serviceId]:
        variationId,
    }));

    setPreferredTime("");
  }

  function handleDiscountChange(
    value: string
  ) {
    const next =
      value as DiscountChoice;

    setDiscountChoice(next);

    if (
      next !==
      "student_pwd_sc"
    ) {
      setDiscountCategory("");
    }

    if (
      next !== "referral"
    ) {
      setReferralName("");
    }
  }

  async function save() {
    setError("");
    setSaved(false);

    if (
      !customerName.trim()
    ) {
      setError(
        "Customer name is required."
      );

      return;
    }

    if (!email.trim()) {
      setError(
        "Email is required."
      );

      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email.trim()
      )
    ) {
      setError(
        "Enter a valid email address."
      );

      return;
    }

    if (
      !mobileNumber.trim()
    ) {
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

    if (
      !selectedItems.length
    ) {
      setError(
        "Please select at least one service."
      );

      return;
    }

    if (
      discountChoice ===
        "student_pwd_sc" &&
      ![
        "student",
        "pwd",
        "senior_citizen",
      ].includes(
        discountCategory
      )
    ) {
      setError(
        "Select whether the discount is for a Student, PWD, or Senior Citizen."
      );

      return;
    }

    if (
      discountChoice ===
        "referral" &&
      !referralName.trim()
    ) {
      setError(
        "Enter the name of the person who referred the client."
      );

      return;
    }

    if (
      discountChoice ===
        "other_amount"
    ) {
      const manualAmount = Number(
        manualDiscountAmount
      );

      if (
        !Number.isFinite(
          manualAmount
        ) ||
        manualAmount <= 0
      ) {
        setError(
          "Enter a valid manual discount amount."
        );

        return;
      }

      if (
        manualAmount > total
      ) {
        setError(
          "The discount amount cannot be greater than the booking total."
        );

        return;
      }
    }

    const day =
      availabilityDays[
        preferredDate
      ];

    if (
      day &&
      !day.slots.includes(
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
            method:
              "PATCH",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "edit",

                id:
                  booking.id,

                customer_name:
                  customerName.trim(),

                email:
                  email
                    .trim()
                    .toLowerCase(),

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

                promo_choice:
                  discountChoice,

                discount_category:
                  discountChoice ===
                  "student_pwd_sc"
                    ? discountCategory
                    : null,

                referral_name:
                  discountChoice ===
                  "referral"
                    ? referralName.trim()
                    : null,

                manual_discount_amount:
                  discountChoice ===
                  "other_amount"
                    ? Number(
                        manualDiscountAmount
                      )
                    : null,

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

      window.setTimeout(
        () => {
          window.location.href =
            `/admin/bookings/${booking.id}`;
        },
        700
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to save booking."
      );
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    window.location.href =
      `/admin/bookings/${booking.id}`;
  }

  return (
    <div className="abe-page">
      <section className="abe-card">
        <div className="abe-kicker">
          Customer
        </div>

        <h2>
          Customer Details
        </h2>

        <div className="abe-fields">
          <div className="field">
            <label>
              Name *
            </label>

            <input
              value={
                customerName
              }
              disabled={busy}
              onChange={(
                event
              ) =>
                setCustomerName(
                  event.target
                    .value
                )
              }
            />
          </div>

          <div className="field">
            <label>
              Email *
            </label>

            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              disabled={busy}
              onChange={(
                event
              ) =>
                setEmail(
                  event.target
                    .value
                )
              }
            />
          </div>

          <div className="field">
            <label>
              Mobile Number *
            </label>

            <input
              inputMode="tel"
              value={
                mobileNumber
              }
              disabled={busy}
              onChange={(
                event
              ) =>
                setMobileNumber(
                  event.target
                    .value
                )
              }
            />
          </div>

          <div className="field">
            <label>
              IG or Messenger
              Handle
            </label>

            <input
              value={
                socialHandle
              }
              disabled={busy}
              onChange={(
                event
              ) =>
                setSocialHandle(
                  event.target
                    .value
                )
              }
            />
          </div>
        </div>
      </section>

      <section className="abe-card">
        <div className="abe-kicker">
          Appointment
        </div>

        <h2>
          Appointment Details
        </h2>

        <div className="abe-calendar">
          <div className="abe-calendar-head">
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
            >
              ←
            </button>

            <strong>
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
              onClick={
                nextMonth
              }
            >
              →
            </button>
          </div>

          <div className="abe-week">
            {[
              "Sun",
              "Mon",
              "Tue",
              "Wed",
              "Thu",
              "Fri",
              "Sat",
            ].map(
              (day) => (
                <div
                  key={day}
                >
                  {day}
                </div>
              )
            )}
          </div>

          <div className="abe-days">
            {calendarDays.map(
              (
                date,
                index
              ) => {
                if (!date) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="abe-day-empty"
                    />
                  );
                }

                const key =
                  dateKey(
                    date
                  );

                const availability =
                  availabilityDays[
                    key
                  ];

                const isSelected =
                  key ===
                  preferredDate;

                const isCurrent =
                  key ===
                  booking.preferred_date;

                const isAvailable =
                  Boolean(
                    availability?.available
                  ) ||
                  isCurrent;

                return (
                  <button
                    key={key}
                    type="button"
                    className={`abe-day ${
                      isAvailable
                        ? "available"
                        : "unavailable"
                    } ${
                      isCurrent
                        ? "current"
                        : ""
                    } ${
                      isSelected
                        ? "selected"
                        : ""
                    }`}
                    disabled={
                      busy ||
                      availabilityLoading ||
                      !isAvailable
                    }
                    onClick={() =>
                      selectDate(
                        key
                      )
                    }
                  >
                    {date.getDate()}

                    {isAvailable && (
                      <span className="abe-dot" />
                    )}
                  </button>
                );
              }
            )}
          </div>
        </div>

        {availabilityLoading && (
          <div className="notice abe-notice">
            Checking
            availability…
          </div>
        )}

        {availabilityError && (
          <div className="notice abe-notice">
            {availabilityError}
          </div>
        )}

        {preferredDate && (
          <div className="abe-times">
            <label>
              Available Times *
            </label>

            {availableSlots.length >
            0 ? (
              <div className="abe-time-grid">
                {availableSlots.map(
                  (slot) => {
                    const normalized =
                      normalizeTime(
                        slot
                      );

                    const active =
                      normalized ===
                      normalizeTime(
                        preferredTime
                      );

                    return (
                      <button
                        key={
                          normalized
                        }
                        type="button"
                        className={`abe-time ${
                          active
                            ? "selected"
                            : ""
                        }`}
                        disabled={
                          busy ||
                          availabilityLoading
                        }
                        onClick={() =>
                          selectTime(
                            normalized
                          )
                        }
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
              <div className="notice">
                No available
                times for this
                date.
              </div>
            )}
          </div>
        )}

        {preferredDate &&
          preferredTime && (
            <div className="abe-selection">
              <span>
                Selected
                Appointment
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
                    day:
                      "numeric",
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

              <span>
                Estimated
                duration:{" "}
                {duration} minutes
              </span>
            </div>
          )}
      </section>

      <section className="abe-card">
        <div className="abe-kicker">
          Services
        </div>

        <h2>
          Services & Variations
        </h2>

        <div className="abe-services">
          {services.map(
            (service) => {
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
                    (
                      variation
                    ) =>
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
                  key={
                    service.id
                  }
                  className="abe-service"
                >
                  <label className="abe-service-main">
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
                          service
                        )
                      }
                    />

                    <span>
                      <strong>
                        {
                          service.name
                        }
                      </strong>

                      {service.description && (
                        <small>
                          {
                            service.description
                          }
                        </small>
                      )}

                      <small>
                        {peso(
                          Number(
                            service.price ||
                              0
                          )
                        )}
                      </small>
                    </span>
                  </label>

                  {checked &&
                    variations.length >
                      0 && (
                      <div className="field abe-variation">
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
            }
          )}
        </div>

        <div className="abe-summary">
          <div>
            <span>
              Services Total
            </span>

            <strong>
              {peso(total)}
            </strong>
          </div>

          <div>
            <span>
              Estimated
              Duration
            </span>

            <strong>
              {duration} min
            </strong>
          </div>
        </div>
      </section>

      <section className="abe-card">
        <div className="abe-kicker">
          Discount
        </div>

        <h2>
          Discount & Conditions
        </h2>

        <p className="abe-muted">
          Admin override. Any
          discount selected here
          is applied immediately
          when the booking is
          saved. No separate
          approval is required.
        </p>

        <div className="abe-fields">
          <div className="field">
            <label>
              Promo / Discount
            </label>

            <select
              value={
                discountChoice
              }
              disabled={busy}
              onChange={(
                event
              ) =>
                handleDiscountChange(
                  event.target
                    .value
                )
              }
            >
              <option value="none">
                Not Applicable
              </option>

              <option value="first_time">
                First-time
                Booking Discount
                — 5%
              </option>

              <option value="student_pwd_sc">
                Student / PWD /
                SC Discount — 5%
              </option>

              <option value="referral">
                Referral Program
              </option>

              <option value="other_amount">
                Other Amount
              </option>

              {promos
                .filter(
                  (promo) =>
                    promo.active !==
                    false
                )
                .map(
                  (promo) => (
                    <option
                      key={
                        promo.id
                      }
                      value={`promo:${promo.id}`}
                    >
                      {promo.name}
                    </option>
                  )
                )}
            </select>
          </div>

          {discountChoice ===
            "student_pwd_sc" && (
            <div className="field">
              <label>
                Discount Type *
              </label>

              <select
                value={
                  discountCategory
                }
                disabled={busy}
                onChange={(
                  event
                ) =>
                  setDiscountCategory(
                    event.target
                      .value
                  )
                }
              >
                <option value="">
                  Select Type
                </option>

                <option value="student">
                  Student
                </option>

                <option value="pwd">
                  PWD
                </option>

                <option value="senior_citizen">
                  Senior Citizen
                </option>
              </select>

              <small className="abe-help">
                Verification
                documents remain
                attached to the
                booking and are
                reviewed from
                Booking Details.
              </small>
            </div>
          )}

          {discountChoice ===
            "referral" && (
            <div className="field">
              <label>
                Referred By *
              </label>

              <input
                value={
                  referralName
                }
                disabled={busy}
                onChange={(
                  event
                ) =>
                  setReferralName(
                    event.target
                      .value
                  )
                }
                placeholder="Name of the person who referred the client"
              />

              <small className="abe-help">
                Referral Program
                records who
                referred the
                client. It does
                not automatically
                apply a 5%
                discount.
              </small>
            </div>
          )}

          {discountChoice ===
            "other_amount" && (
            <div className="field">
              <label>
                Discount Amount *
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={
                  manualDiscountAmount
                }
                disabled={busy}
                onChange={(
                  event
                ) =>
                  setManualDiscountAmount(
                    event.target
                      .value
                  )
                }
                placeholder="Enter amount"
              />

              <small className="abe-help">
                Enter the exact
                peso amount to
                deduct from the
                booking total.
              </small>
            </div>
          )}
        </div>

        <div className="abe-discount-preview">
          <div>
            <span>
              Selected Option
            </span>

            <strong>
              {getDiscountLabel(
                discountChoice,
                promos
              )}
            </strong>
          </div>

          <div>
            <span>
              Discount Amount
            </span>

            <strong>
              −
              {peso(
                discountPreview
              )}
            </strong>
          </div>

          <div className="abe-total-row">
            <span>
              Estimated Total
              After Discount
            </span>

            <strong>
              {peso(
                finalTotal
              )}
            </strong>
          </div>

          <div>
            <span>
              Admin Override
            </span>

            <strong>
              {discountPreview <= 0
                ? "Not Applicable"
                : "Applied on Save"}
            </strong>
          </div>
        </div>
      </section>

      <section className="abe-card">
        <div className="abe-kicker">
          Removal
        </div>

        <h2>
          Removal
        </h2>

        <div className="field">
          <label>
            Removal Option
          </label>

          <select
            value={removal}
            disabled={busy}
            onChange={(
              event
            ) =>
              setRemoval(
                event.target
                  .value
              )
            }
          >
            {removalOptions.map(
              (option) => (
                <option
                  key={
                    option
                  }
                  value={
                    option
                  }
                >
                  {option}
                </option>
              )
            )}
          </select>
        </div>
      </section>

      <section className="abe-card">
        <div className="abe-kicker">
          Notes
        </div>

        <h2>
          Additional Requests
        </h2>

        <div className="field">
          <label>
            Notes
          </label>

          <textarea
            value={notes}
            disabled={busy}
            onChange={(
              event
            ) =>
              setNotes(
                event.target
                  .value
              )
            }
            placeholder="Additional notes..."
          />
        </div>
      </section>

      {error && (
        <div className="notice abe-error">
          {error}
        </div>
      )}

      {saved && (
        <div className="notice">
          Booking updated
          successfully.
          Returning to booking
          details…
        </div>
      )}

      <section className="abe-actions">
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
      </section>

      <style jsx>{`
        .abe-page {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
          display: grid;
          gap: 18px;
        }

        .abe-card,
        .abe-actions {
          background: var(
            --card,
            #fff
          );
          border: 1px solid
            var(
              --line,
              #e8e3dc
            );
          border-radius: 18px;
          padding: 24px;
        }

        .abe-kicker {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(
            --muted,
            #777
          );
        }

        h2 {
          margin: 6px 0 20px;
          font-family: inherit;
          font-size: 24px;
          line-height: 1.15;
        }

        .abe-muted,
        .abe-help {
          color: var(
            --muted,
            #777
          );
        }

        .abe-muted {
          margin: -8px 0 20px;
          line-height: 1.55;
          font-size: 14px;
        }

        .abe-help {
          display: block;
          margin-top: 7px;
          font-size: 12px;
          line-height: 1.45;
        }

        .abe-fields {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
          gap: 16px;
        }

        .field {
          min-width: 0;
        }

        .field label,
        .abe-times > label {
          display: block;
          margin-bottom: 7px;
          font-size: 13px;
          font-weight: 600;
        }

        .field input,
        .field select,
        .field textarea {
          width: 100%;
          box-sizing:
            border-box;
        }

        .field textarea {
          min-height: 140px;
          resize: vertical;
        }

        .abe-calendar {
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 12px;
          background: #fff;
        }

        .abe-calendar-head {
          display: flex;
          justify-content:
            space-between;
          align-items: center;
          gap: 12px;
        }

        .abe-calendar-head strong {
          color: #111;
          font-size: 14px;
          font-weight: 700;
        }

        .abe-calendar-head button {
          min-width: 42px;
          min-height: 38px;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #fff;
          color: #111;
        }

        .abe-calendar-head button:hover:not(:disabled) {
          background: #f7f7f7;
        }

        .abe-week,
        .abe-days {
          display: grid;
          grid-template-columns:
            repeat(
              7,
              minmax(0, 1fr)
            );
          gap: 5px;
        }

        .abe-week {
          margin-top: 14px;
        }

        .abe-week div {
          text-align: center;
          font-size: 11px;
          font-weight: 600;
          color: #777;
          padding: 5px 0;
        }

        .abe-day,
        .abe-day-empty {
          min-height: 48px;
        }

        .abe-day {
          position: relative;
          border-radius: 8px;
          border: 1px solid #ddd;
          background: #fff;
          color: #111;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }

        .abe-day.available {
          background: #fff7f9;
          border-color: #eadde1;
        }

        .abe-day.available:hover:not(:disabled) {
          background: #fceff3;
        }

        .abe-day.selected {
          border-color: #111;
          background: #111;
          color: #fff;
          font-weight: 700;
        }

        .abe-day.selected:hover:not(:disabled) {
          background: #111;
        }

        .abe-day:disabled,
        .abe-day.unavailable {
          cursor: not-allowed;
          border-color: #eee;
          background: #f7f7f7;
          color: #aaa;
          opacity: 1;
        }

        .abe-dot {
          display: block;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: currentColor;
          margin: 4px auto 0;
          opacity: 0.65;
        }

        .abe-notice,
        .abe-times {
          margin-top: 14px;
        }

        .abe-time-grid {
          display: grid;
          grid-template-columns:
            repeat(
              auto-fill,
              minmax(
                110px,
                1fr
              )
            );
          gap: 8px;
        }

        .abe-time {
          border: 1px solid #ddd;
          background: #fff;
          color: #111;
          border-radius: 8px;
          padding: 10px 8px;
          cursor: pointer;
          font-weight: 500;
        }

        .abe-time:hover:not(:disabled) {
          background: #f7f7f7;
        }

        .abe-time.selected {
          border-color: #111;
          background: #111;
          color: #fff;
          font-weight: 700;
        }

        .abe-selection {
          margin-top: 16px;
          padding: 14px;
          border: 1px solid
            var(
              --line,
              #e8e3dc
            );
          border-radius: 12px;
          display: grid;
          gap: 5px;
        }

        .abe-selection span {
          color: var(
            --muted,
            #777
          );
          font-size: 13px;
        }

        .abe-services {
          display: grid;
          gap: 10px;
        }

        .abe-service {
          border: 1px solid
            var(
              --line,
              #e8e3dc
            );
          border-radius: 14px;
          padding: 15px;
        }

        .abe-service-main {
          display: flex;
          align-items:
            flex-start;
          gap: 11px;
          cursor: pointer;
        }

        .abe-service-main input {
          margin-top: 4px;
          flex: 0 0 auto;
        }

        .abe-service-main span {
          min-width: 0;
          flex: 1;
          display: grid;
          gap: 4px;
        }

        .abe-service-main small {
          color: var(
            --muted,
            #777
          );
          line-height: 1.45;
        }

        .abe-variation {
          margin-top: 12px;
          margin-left: 29px;
        }

        .abe-summary,
        .abe-discount-preview {
          margin-top: 20px;
          padding-top: 18px;
          border-top: 1px solid
            var(
              --line,
              #e8e3dc
            );
          display: grid;
          gap: 9px;
        }

        .abe-summary > div,
        .abe-discount-preview > div {
          display: flex;
          justify-content:
            space-between;
          align-items:
            flex-start;
          gap: 16px;
        }

        .abe-summary span,
        .abe-discount-preview span {
          color: var(
            --muted,
            #777
          );
        }

        .abe-discount-preview strong {
          text-align: right;
        }

        .abe-total-row {
          padding-top: 10px;
          border-top: 1px solid
            var(
              --line,
              #e8e3dc
            );
        }

        .abe-error {
          border-color: rgba(
            160,
            70,
            70,
            0.35
          );
        }

        .abe-actions {
          display: flex;
          justify-content:
            flex-end;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        @media (
          max-width: 680px
        ) {
          .abe-card,
          .abe-actions {
            padding: 18px;
            border-radius: 15px;
          }

          .abe-fields {
            grid-template-columns:
              1fr;
          }

          .abe-day,
          .abe-day-empty {
            min-height: 42px;
          }

          .abe-calendar {
            padding: 10px;
          }

          .abe-variation {
            margin-left: 0;
          }

          .abe-actions {
            display: grid;
            grid-template-columns:
              1fr 1fr;
          }

          .abe-actions button {
            width: 100%;
          }

          .field input,
          .field select,
          .field textarea {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
}
