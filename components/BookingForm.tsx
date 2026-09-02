"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

const FULL_POLICY_URL =
  "https://docs.google.com/document/d/1aIrWBfOvahFIs1j4nsryNNydulxCCd9-D4ehWWyjsRg/edit?usp=sharing";

const DESIGN_GUIDE_URL =
  "https://drive.google.com/file/d/1dlP8kP9WLrA71hYyTfm8sJ0l0ddrPnFd/view?usp=drive_link";

const WEEKDAYS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

type ServiceVariation = {
  id: string;
  service_id: string;
  name: string;
  price_delta: number;
  duration_delta_minutes: number;
  active: boolean;
  sort_order: number;
};

type ServiceItem = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  duration_minutes: number;
  active: boolean;
  sort_order: number;
  service_variations?: ServiceVariation[];
};

type AvailabilityDay = {
  date: string;
  available: boolean;
  slots: string[];
};

type AvailabilityMap = Record<
  string,
  AvailabilityDay
>;

function peso(value: number) {
  return `₱${Number(value || 0).toLocaleString(
    "en-PH",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function formatMonth(date: Date) {
  return date.toLocaleDateString(
    "en-PH",
    {
      month: "long",
      year: "numeric",
    }
  );
}

function formatDate(value: string) {
  if (!value) {
    return "";
  }

  const parts = value
    .split("-")
    .map(Number);

  if (parts.length !== 3) {
    return value;
  }

  const date = new Date(
    parts[0],
    parts[1] - 1,
    parts[2]
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "en-PH",
    {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  );
}

export default function BookingForm({
  services,
  promos,
  settings,
}: {
  services: ServiceItem[];
  promos: any[];
  settings: Record<string, string>;
}) {
  const router = useRouter();

  const [
    selectedServices,
    setSelectedServices,
  ] = useState<Record<string, string>>(
    {}
  );

  const [
    customerName,
    setCustomerName,
  ] = useState("");

  const [
  email,
  setEmail,
] = useState("");

  const [
    mobileNumber,
    setMobileNumber,
  ] = useState("");


  const [
    socialHandle,
    setSocialHandle,
  ] = useState("");

  const [
    preferredDate,
    setPreferredDate,
  ] = useState("");

  const [
    preferredTime,
    setPreferredTime,
  ] = useState("");

  const [
    removal,
    setRemoval,
  ] = useState("None");

  const [
    promoChoice,
    setPromoChoice,
  ] = useState("");

  const [
    discountCategory,
    setDiscountCategory,
  ] = useState("");

  const [
    referralName,
    setReferralName,
  ] = useState("");

  const [
    notes,
    setNotes,
  ] = useState("");

  const [
    termsAccepted,
    setTermsAccepted,
  ] = useState(false);

  const [
    inspirationFiles,
    setInspirationFiles,
  ] = useState<File[]>([]);

  const [
    studentValidId,
    setStudentValidId,
  ] = useState<File | null>(null);

  const [
    studentRegistration,
    setStudentRegistration,
  ] = useState<File | null>(null);

  const [
    calendarMonth,
    setCalendarMonth,
  ] = useState(
    new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    )
  );

  const [
    availability,
    setAvailability,
  ] = useState<AvailabilityMap>({});

  const [
    availabilityLoading,
    setAvailabilityLoading,
  ] = useState(false);

  const [
    availabilityError,
    setAvailabilityError,
  ] = useState("");

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const selectedItems = useMemo(() => {
    return services
      .filter(
        (service) =>
          selectedServices[
            service.id
          ] !== undefined
      )
      .map((service) => {
        const variationId =
          selectedServices[
            service.id
          ];

        const variation =
          service.service_variations?.find(
            (item) =>
              item.id === variationId
          );

        return {
          service_id: service.id,
          service_name: service.name,
          variation_id:
            variation?.id || null,
          variation_name:
            variation?.name || null,
          price:
            Number(service.price || 0) +
            Number(
              variation?.price_delta || 0
            ),
          duration_minutes:
            Number(
              service.duration_minutes || 0
            ) +
            Number(
              variation?.duration_delta_minutes ||
                0
            ),
        };
      });
  }, [
    services,
    selectedServices,
  ]);

  const subtotal = selectedItems.reduce(
    (sum, item) =>
      sum + Number(item.price || 0),
    0
  );

  const durationMinutes =
    selectedItems.reduce(
      (sum, item) =>
        sum +
        Number(
          item.duration_minutes || 0
        ),
      0
    ) || 60;

  const selectedPromo =
    promoChoice.startsWith("promo:")
      ? promos.find(
          (promo) =>
            `promo:${promo.id}` ===
            promoChoice
        )
      : null;

  let discountAmount = 0;

  if (promoChoice === "first_time") {
    discountAmount =
      subtotal * 0.05;
  }

  if (
    promoChoice ===
    "student_pwd_sc"
  ) {
    discountAmount =
      subtotal * 0.05;
  }

  if (selectedPromo) {
    if (
      selectedPromo.discount_type ===
      "percentage"
    ) {
      discountAmount =
        subtotal *
        (Number(
          selectedPromo.discount_value
        ) /
          100);
    } else {
      discountAmount = Number(
        selectedPromo.discount_value || 0
      );
    }
  }

  discountAmount = Math.min(
    discountAmount,
    subtotal
  );

  const estimatedTotal =
    Math.max(
      0,
      subtotal - discountAmount
    );

  useEffect(() => {
    let cancelled = false;

    async function loadAvailability() {
      setAvailabilityLoading(true);
      setAvailabilityError("");

      try {
        const response =
          await fetch(
            `/api/availability?month=${monthKey(
              calendarMonth
            )}&duration=${durationMinutes}`,
            {
              cache: "no-store",
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Unable to load availability."
          );
        }

        if (cancelled) {
          return;
        }

        const map: AvailabilityMap =
          {};

        for (
          const day of result.days ||
          []
        ) {
          map[day.date] = day;
        }

        setAvailability(map);
      } catch (err: any) {
        if (cancelled) {
          return;
        }

        setAvailabilityError(
          err?.message ||
            "Unable to load availability."
        );

        setAvailability({});
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
    durationMinutes,
  ]);

  const today = new Date();
  const todayKey = dateKey(today);

  const currentMonthKey = monthKey(
    new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    )
  );

  const previousMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() - 1,
    1
  );

  const canGoPrevious =
    monthKey(previousMonth) >=
    currentMonthKey;

  const firstDay = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth(),
    1
  );

  const daysInMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    0
  ).getDate();

  const calendarCells: Array<
    Date | null
  > = [];

  for (
    let i = 0;
    i < firstDay.getDay();
    i++
  ) {
    calendarCells.push(null);
  }

  for (
    let day = 1;
    day <= daysInMonth;
    day++
  ) {
    calendarCells.push(
      new Date(
        calendarMonth.getFullYear(),
        calendarMonth.getMonth(),
        day
      )
    );
  }

  const toggleService = (
    service: ServiceItem
  ) => {
    setSelectedServices(
      (current) => {
        const next = {
          ...current,
        };

        if (
          next[service.id] !==
          undefined
        ) {
          delete next[service.id];
        } else {
          next[service.id] = "";
        }

        return next;
      }
    );

    setPreferredDate("");
    setPreferredTime("");
  };

  const chooseDate = (
    value: string
  ) => {
    const day =
      availability[value];

    if (!day?.available) {
      return;
    }

    setPreferredDate(value);

    if (
      !day.slots.includes(
        preferredTime
      )
    ) {
      setPreferredTime("");
    }
  };

  const submit = async () => {
    setError("");

    if (!selectedItems.length) {
      setError(
        "Please select at least one service."
      );
      return;
    }

    if (!customerName.trim()) {
      setError(
        "Please enter your name."
      );
      return;
    }

    if (!mobileNumber.trim()) {
      setError(
        "Please enter your mobile number."
      );
      return;
    }

    if (!preferredDate) {
      setError(
        "Please choose an appointment date."
      );
      return;
    }

    if (!preferredTime) {
      setError(
        "Please choose an appointment time."
      );
      return;
    }

    if (!promoChoice) {
      setError(
        "Please choose a promo or discount option."
      );
      return;
    }

    if (
      promoChoice ===
        "referral" &&
      !referralName.trim()
    ) {
      setError(
        "Please enter the name of the person who referred you."
      );
      return;
    }

    if (
      promoChoice ===
        "student_pwd_sc" &&
      !discountCategory
    ) {
      setError(
        "Please select whether the discount is for a Student, PWD, or Senior Citizen."
      );
      return;
    }

    if (
      promoChoice ===
        "student_pwd_sc" &&
      !studentValidId
    ) {
      setError(
        "Please upload a valid ID for the Student / PWD / SC discount."
      );
      return;
    }

    if (!termsAccepted) {
      setError(
        "Please read and agree to the studio policies before continuing."
      );
      return;
    }

    setBusy(true);

    try {
      const formData =
        new FormData();

      formData.append(
        "payload",
        JSON.stringify({
          customer_name:
            customerName.trim(),

          mobile_number:
            mobileNumber.trim(),

          social_handle:
            socialHandle.trim(),

            email:
  email.trim(),

          preferred_date:
            preferredDate,

          preferred_time:
            preferredTime,
      

          removal,

          promo_choice:
            promoChoice,

          discount_category:
            discountCategory,

          referral_name:
            referralName.trim(),

          notes,

          terms_accepted:
            termsAccepted,

          services:
            selectedItems,

          inspiration_files:
            inspirationFiles.map(
              (file) =>
                file.name
            ),
        })
      );

      for (
        const file of inspirationFiles
      ) {
        formData.append(
          "inspiration",
          file
        );
      }

      if (studentValidId) {
        formData.append(
          "student_valid_id",
          studentValidId
        );
      }

      if (studentRegistration) {
        formData.append(
          "student_registration",
          studentRegistration
        );
      }

      const response =
        await fetch(
          "/api/bookings",
          {
            method: "POST",
            body: formData,
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to submit your booking request."
        );
      }

      router.push(
        `/book/review?token=${result.token}`
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to submit your booking request."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="status-page booking-customer-page">
      <div className="status-page-inner">
        <div className="status-card">

          <div className="status-brand">
            The Claw Lab MNL
          </div>

          <div className="status-header">
            <h1>
              Book an Appointment
            </h1>
          </div>

          <div className="status-message">
            <h2>
              Let's plan your pamper time. ♡
            </h2>

            <p>
              Choose your services, preferred
              date and time, then tell us a
              little about yourself.
            </p>
          </div>

          {/* 01 SERVICES */}
          <section className="booking-section">
            <div className="booking-section-heading">
              <span>01</span>
              <div>
                <strong>
                  Services
                </strong>
                <small>
                  Select everything you need
                  for your appointment.
                </small>
              </div>
            </div>

            <div className="booking-services">
              {services.map(
                (service) => {
                  const checked =
                    selectedServices[
                      service.id
                    ] !== undefined;

                  return (
                    <div
                      className={`booking-service ${
                        checked
                          ? "selected"
                          : ""
                      }`}
                      key={service.id}
                    >
                      <button
                        type="button"
                        className="booking-service-main"
                        onClick={() =>
                          toggleService(
                            service
                          )
                        }
                      >
                        <span
                          className={`booking-check ${
                            checked
                              ? "checked"
                              : ""
                          }`}
                        >
                          {checked
                            ? "✓"
                            : ""}
                        </span>

                        <span className="booking-service-copy">
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
                        </span>

                        <span className="booking-service-price">
                          {peso(
                            service.price
                          )}
                        </span>
                      </button>

                      {checked && (
                        <div className="booking-variation">
                          <label>
                            Variation
                          </label>

                          <select
                            value={
                              selectedServices[
                                service.id
                              ]
                            }
                            onChange={(
                              event
                            ) => {
                              setSelectedServices(
                                (
                                  current
                                ) => ({
                                  ...current,
                                  [service.id]:
                                    event
                                      .target
                                      .value,
                                })
                              );

                              setPreferredDate(
                                ""
                              );

                              setPreferredTime(
                                ""
                              );
                            }}
                          >
                            <option value="">
                              Standard
                            </option>

                            {service.service_variations
                              ?.filter(
                                (
                                  variation
                                ) =>
                                  variation.active
                              )
                              .sort(
                                (
                                  a,
                                  b
                                ) =>
                                  a.sort_order -
                                  b.sort_order
                              )
                              .map(
                                (
                                  variation
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
                                    }{" "}
                                    {Number(
                                      variation.price_delta
                                    ) >=
                                    0
                                      ? `(+${peso(
                                          variation.price_delta
                                        )})`
                                      : `(${peso(
                                          variation.price_delta
                                        )})`}
                                  </option>
                                )
                              )}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>

            <div className="booking-helper">
              Not sure which design tier to
              choose?{" "}
              <a
                href={
                  DESIGN_GUIDE_URL
                }
                target="_blank"
                rel="noreferrer"
              >
                View our Design Tier Guide →
              </a>
            </div>
          </section>

          {/* 02 DETAILS */}
          <section className="booking-section">
            <div className="booking-section-heading">
              <span>02</span>
              <div>
                <strong>
                  Your Details
                </strong>
                <small>
                  So we know who we're preparing
                  the appointment for.
                </small>
              </div>
            </div>

            <div className="booking-fields">
              <div className="field">
                <label>
                  Name *
                </label>

                <input
                  value={
                    customerName
                  }
                  onChange={(
                    event
                  ) =>
                    setCustomerName(
                      event.target
                        .value
                    )
                  }
                  autoComplete="name"
                  placeholder="Your name"
                />
              </div>

              <div className="field">
                <label>
                  Mobile Number *
                </label>

                <input
                  value={
                    mobileNumber
                  }
                  onChange={(
                    event
                  ) =>
                    setMobileNumber(
                      event.target
                        .value
                    )
                  }
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="09XXXXXXXXX"
                />
              </div>

              <div className="field">
  <label>
    Email Address *
  </label>

  <input
    type="email"
    value={email}
    onChange={(event) =>
      setEmail(
        event.target.value
      )
    }
    autoComplete="email"
    placeholder="you@example.com"
  />
</div>

              <div className="field">
                <label>
                  IG / Messenger Handle
                </label>

                <input
                  value={
                    socialHandle
                  }
                  onChange={(
                    event
                  ) =>
                    setSocialHandle(
                      event.target
                        .value
                    )
                  }
                  placeholder="@username"
                />
              </div>
            </div>
          </section>

          {/* 03 APPOINTMENT */}
          <section className="booking-section">
            <div className="booking-section-heading">
              <span>03</span>
              <div>
                <strong>
                  Appointment
                </strong>
                <small>
                  Pick a date and an available
                  time.
                </small>
              </div>
            </div>

            <div className="booking-calendar">
              <div className="booking-calendar-top">
                <button
                  type="button"
                  className="calendar-arrow"
                  disabled={
                    !canGoPrevious ||
                    availabilityLoading
                  }
                  onClick={() =>
                    setCalendarMonth(
                      previousMonth
                    )
                  }
                >
                  ←
                </button>

                <strong>
                  {formatMonth(
                    calendarMonth
                  )}
                </strong>

                <button
                  type="button"
                  className="calendar-arrow"
                  disabled={
                    availabilityLoading
                  }
                  onClick={() =>
                    setCalendarMonth(
                      new Date(
                        calendarMonth.getFullYear(),
                        calendarMonth.getMonth() +
                          1,
                        1
                      )
                    )
                  }
                >
                  →
                </button>
              </div>

              <div className="calendar-weekdays">
                {WEEKDAYS.map(
                  (day) => (
                    <span
                      key={day}
                    >
                      {day}
                    </span>
                  )
                )}
              </div>

              <div className="calendar-grid">
                {calendarCells.map(
                  (
                    cell,
                    index
                  ) => {
                    if (!cell) {
                      return (
                        <span
                          className="calendar-empty"
                          key={`empty-${index}`}
                        />
                      );
                    }

                    const key =
                      dateKey(
                        cell
                      );

                    const day =
                      availability[
                        key
                      ];

                    const isPast =
                      key <
                      todayKey;

                    const available =
                      !isPast &&
                      Boolean(
                        day?.available
                      );

                    const selected =
                      preferredDate ===
                      key;

                    const today =
                      key ===
                      todayKey;

                    return (
                      <button
                        type="button"
                        key={key}
                        disabled={
                          !available ||
                          availabilityLoading
                        }
                        onClick={() =>
                          chooseDate(
                            key
                          )
                        }
                        className={`calendar-day ${
                          available
                            ? "available"
                            : ""
                        } ${
                          selected
                            ? "selected"
                            : ""
                        } ${
                          today
                            ? "today"
                            : ""
                        }`}
                      >
                        {cell.getDate()}
                      </button>
                    );
                  }
                )}
              </div>

              {availabilityLoading && (
                <div className="booking-calendar-note">
                  Checking availability…
                </div>
              )}

              {availabilityError && (
                <div className="booking-error-inline">
                  {availabilityError}
                </div>
              )}

              {preferredDate &&
                availability[
                  preferredDate
                ]?.available && (
                  <div className="booking-times">
                    <div className="booking-times-heading">
                      <span>
                        Available Times
                      </span>

                      <strong>
                        {formatDate(
                          preferredDate
                        )}
                      </strong>
                    </div>

                    <div className="booking-time-grid">
                      {availability[
                        preferredDate
                      ].slots.map(
                        (slot) => (
                          <button
                            type="button"
                            key={
                              slot
                            }
                            className={
                              preferredTime ===
                              slot
                                ? "selected"
                                : ""
                            }
                            onClick={() =>
                              setPreferredTime(
                                slot
                              )
                            }
                          >
                            {slot}
                          </button>
                        )
                      )}
                    </div>

                    {!availability[
                      preferredDate
                    ].slots.length && (
                      <div className="booking-calendar-note">
                        No available time
                        slots remain for
                        this date.
                      </div>
                    )}
                  </div>
                )}
            </div>
          </section>

          {/* 04 REMOVAL */}
          <section className="booking-section">
            <div className="booking-section-heading">
              <span>04</span>
              <div>
                <strong>
                  Existing Product Removal
                </strong>
                <small>
                  Let us know if you need existing
                  product removed.
                </small>
              </div>
            </div>

            <div className="field">
              <select
                value={removal}
                onChange={(
                  event
                ) =>
                  setRemoval(
                    event.target
                      .value
                  )
                }
              >
                {(
                  settings.removal_options ||
                  "None\nGel\nSoft Gel\nHard Gel\nOther"
                )
                  .split("\n")
                  .map(
                    (
                      option
                    ) => (
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

          {/* 05 PROMO */}
          <section className="booking-section">
            <div className="booking-section-heading">
              <span>05</span>
              <div>
                <strong>
                  Promo / Discount
                </strong>
                <small>
                  Select one applicable option.
                </small>
              </div>
            </div>

            <div className="field">
              <select
                value={
                  promoChoice
                }
                onChange={(
                  event
                ) => {
                  const value =
                    event.target
                      .value;

                  setPromoChoice(
                    value
                  );

                  if (
                    value !==
                    "student_pwd_sc"
                  ) {
                    setDiscountCategory(
                      ""
                    );
                    setStudentValidId(
                      null
                    );
                    setStudentRegistration(
                      null
                    );
                  }

                  if (
                    value !==
                    "referral"
                  ) {
                    setReferralName(
                      ""
                    );
                  }
                }}
              >
                <option value="">
                  Select a promo or discount
                </option>

                {promos.length >
                  0 && (
                  <optgroup label="Current Promo">
                    {promos.map(
                      (promo) => (
                        <option
                          key={
                            promo.id
                          }
                          value={`promo:${promo.id}`}
                        >
                          {
                            promo.name
                          }
                        </option>
                      )
                    )}
                  </optgroup>
                )}

                <optgroup label="Permanent Discounts">
                  <option value="first_time">
                    First-time Booking Discount — 5%
                  </option>

                  <option value="student_pwd_sc">
                    Student / PWD / SC Discount — 5%
                  </option>

                  <option value="referral">
                    Referral Program
                  </option>

                  <option value="none">
                    Not Applicable
                  </option>
                </optgroup>
              </select>
            </div>

            {promoChoice ===
              "first_time" && (
              <div className="booking-soft-note">
                5% applies to regular rates
                only and cannot be combined
                with a current promo.
              </div>
            )}

            {selectedPromo && (
              <div className="booking-soft-note">
                {selectedPromo.description ||
                  "Current promotional discount selected."}
              </div>
            )}

            {promoChoice ===
              "student_pwd_sc" && (
              <div className="booking-extra">
                <strong>
                  Student / PWD / SC
                  Discount — 5%
                </strong>

                <p>
                  A valid ID is required
                  for verification.
                </p>

                <div className="field">
                  <label>
                    Discount Type *
                  </label>

                  <select
                    value={
                      discountCategory
                    }
                    onChange={(
                      event
                    ) => {
                      const value =
                        event.target
                          .value;

                      setDiscountCategory(
                        value
                      );

                      if (
                        value !==
                        "student"
                      ) {
                        setStudentRegistration(
                          null
                        );
                      }
                    }}
                  >
                    <option value="">
                      Select one
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
                </div>

                <div className="field">
                  <label>
                    Valid ID *
                  </label>

                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.heic,.heif,.pdf,image/jpeg,image/png,application/pdf"
                    onChange={(
                      event
                    ) =>
                      setStudentValidId(
                        event
                          .target
                          .files?.[0] ||
                          null
                      )
                    }
                  />
                </div>

                {discountCategory ===
                  "student" && (
                  <div className="field">
                    <label>
                      Current Registration Card/Form
                      <span className="muted">
                        {" "}
                        (Optional)
                      </span>
                    </label>

                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.heic,.heif,.pdf,image/jpeg,image/png,application/pdf"
                      onChange={(
                        event
                      ) =>
                        setStudentRegistration(
                          event
                            .target
                            .files?.[0] ||
                            null
                        )
                      }
                    />
                  </div>
                )}
              </div>
            )}

            {promoChoice ===
              "referral" && (
              <div className="field">
                <label>
                  Name of the person who referred you *
                </label>

                <input
                  value={
                    referralName
                  }
                  onChange={(
                    event
                  ) =>
                    setReferralName(
                      event.target
                        .value
                    )
                  }
                  placeholder="Enter their name"
                />
              </div>
            )}
          </section>

          {/* 06 INSPIRATION */}
          <section className="booking-section">
            <div className="booking-section-heading">
              <span>06</span>
              <div>
                <strong>
                  Nail Inspiration
                </strong>
                <small>
                  Share photos so we can understand
                  your design direction.
                </small>
              </div>
            </div>

            <div className="booking-upload">
              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.heic,image/jpeg,image/png"
                onChange={(
                  event
                ) =>
                  setInspirationFiles(
                    Array.from(
                      event.target
                        .files || []
                    ).slice(0, 8)
                  )
                }
              />

              <p>
                {inspirationFiles.length
                  ? `${inspirationFiles.length} file(s) selected.`
                  : "Inspiration photos serve as a design reference only. Exact replication is not guaranteed due to differences in nail shape, length, condition, materials, and application technique."}
              </p>
            </div>
          </section>

          {/* 07 NOTES */}
          <section className="booking-section">
            <div className="booking-section-heading">
              <span>07</span>
              <div>
                <strong>
                  Additional Requests / Notes
                </strong>
                <small>
                  Anything else you'd like your Nail Technician to
                  know?
                </small>
              </div>
            </div>

            <div className="field">
              <textarea
                value={notes}
                onChange={(
                  event
                ) =>
                  setNotes(
                    event.target
                      .value
                  )
                }
                placeholder="We’d love to know anything that will help us make your appointment extra special! Feel free to share any nail concerns, sensitivities, previous enhancements, or special requests."
                rows={4}
              />
            </div>
          </section>

          {/* POLICY */}
          <section className="booking-policy">
            <div className="booking-policy-title">
              Before You Submit
            </div>

            <label className="booking-policy-check">
              <input
                type="checkbox"
                checked={
                  termsAccepted
                }
                onChange={(
                  event
                ) =>
                  setTermsAccepted(
                    event.target
                      .checked
                  )
                }
              />

              <span>
                I have read and agree to
                the studio's policies
                regarding booking, payment,
                pricing, rescheduling,
                cancellations, late
                arrivals, warranty, studio
                guidelines, and photo usage.{" "}
                <a
                  href={
                    FULL_POLICY_URL
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  View Full Policy →
                </a>
              </span>
            </label>
          </section>

          {/* ERROR */}
          {error && (
            <div className="booking-error">
              {error}
            </div>
          )}

          {/* SUMMARY */}
          <section className="booking-final-summary">
            <div className="booking-final-title">
              Booking Summary
            </div>

            <div className="booking-final-row">
              <span>
                Services
              </span>

              <strong>
                {selectedItems.length
                  ? selectedItems
                      .map(
                        (item) =>
                          item.variation_name
                            ? `${item.service_name} — ${item.variation_name}`
                            : item.service_name
                      )
                      .join(", ")
                  : "—"}
              </strong>
            </div>

            <div className="booking-final-row">
              <span>
                Appointment
              </span>

              <strong>
                {preferredDate
                  ? formatDate(
                      preferredDate
                    )
                  : "—"}

                {preferredTime
                  ? ` · ${preferredTime}`
                  : ""}
              </strong>
            </div>

            {discountAmount >
              0 && (
              <div className="booking-final-row">
                <span>
                  Discount
                </span>

                <strong>
                  −
                  {peso(
                    discountAmount
                  )}
                </strong>
              </div>
            )}

            <div className="booking-final-total">
              <span>
                Estimated Total
              </span>

              <strong>
                {peso(
                  estimatedTotal
                )}
              </strong>
            </div>
          </section>

          {/* SUBMIT */}
          <div className="status-action booking-submit">
            <button
              type="button"
              className="status-primary-button"
              disabled={busy}
              onClick={submit}
            >
              {busy
                ? "Preparing request…"
                : "Review Booking Request →"}
            </button>
          </div>

          {/* CONTACT */}
          <div className="status-contact">
            <p>
              Questions? Message us.
            </p>

            <div className="status-contact-links">
              <a
                href="https://instagram.com/theclawlabmnl"
                target="_blank"
                rel="noreferrer"
              >
                Instagram
              </a>

              <a
                href="https://m.me/theclawlabmnl"
                target="_blank"
                rel="noreferrer"
              >
                Messenger
              </a>
            </div>
          </div>

          <div className="status-footer">
            <a href="/">
              Back to TheClawLabMNL Homepage
            </a>
          </div>

        </div>
      </div>

      <style jsx global>{`
        .booking-customer-page {
          min-height: 100vh;
        }

        .booking-customer-page
          .status-card {
          width: 100%;
        }

        .booking-section {
          margin-top: 26px;
          padding-top: 22px;
          border-top: 1px solid #eee7e5;
        }

        .booking-section-heading {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          margin-bottom: 13px;
        }

        .booking-section-heading > span {
          flex: 0 0 auto;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #a37c84;
          padding-top: 3px;
        }

        .booking-section-heading > div {
          min-width: 0;
        }

        .booking-section-heading strong {
          display: block;
          font-size: 13px;
          line-height: 1.35;
          font-weight: 700;
          color: #111;
        }

        .booking-section-heading small {
          display: block;
          margin-top: 2px;
          color: #888;
          font-size: 10px;
          line-height: 1.45;
          font-weight: 400;
        }

        .booking-services {
          display: grid;
          gap: 7px;
        }

        .booking-service {
          border: 1px solid #e8e1df;
          border-radius: 9px;
          background: #fff;
          overflow: hidden;
          transition:
            border-color 0.15s ease,
            background 0.15s ease;
        }

        .booking-service.selected {
          border-color: #d7b7bf;
          background: #fcf7f8;
        }

        .booking-service-main {
          width: 100%;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 11px 12px;
          border: 0;
          background: transparent;
          text-align: left;
          cursor: pointer;
          color: #111;
          font: inherit;
        }

        .booking-check {
          width: 17px;
          height: 17px;
          flex: 0 0 17px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 1px;
          border: 1px solid #d8d0cd;
          border-radius: 50%;
          color: #fff;
          font-size: 9px;
          font-weight: 700;
        }

        .booking-check.checked {
          border-color: #111;
          background: #111;
        }

        .booking-service-copy {
          flex: 1;
          min-width: 0;
        }

        .booking-service-copy strong {
          display: block;
          font-size: 12px;
          line-height: 1.35;
          font-weight: 700;
        }

        .booking-service-copy small {
          display: block;
          margin-top: 2px;
          color: #888;
          font-size: 10px;
          line-height: 1.4;
        }

        .booking-service-price {
          flex: 0 0 auto;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          padding-top: 1px;
        }

        .booking-variation {
          margin: 0 12px 11px 39px;
        }

        .booking-variation label {
          display: block;
          margin-bottom: 4px;
          color: #777;
          font-size: 9px;
          font-weight: 600;
        }

        .booking-variation select {
          width: 100%;
          min-height: 35px;
        }

        .booking-helper {
          margin-top: 9px;
          color: #888;
          font-size: 10px;
          line-height: 1.5;
        }

        .booking-helper a,
        .booking-policy a {
          color: #8e6971;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .booking-fields {
          display: grid;
          gap: 10px;
        }

        .booking-customer-page
          .field {
          margin: 0;
        }

        .booking-customer-page
          .field
          label {
          display: block;
          margin-bottom: 4px;
          color: #777;
          font-size: 9px;
          font-weight: 600;
        }

        .booking-customer-page
          .field
          input,
        .booking-customer-page
          .field
          select,
        .booking-customer-page
          .field
          textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #e1dad7;
          border-radius: 7px;
          background: #fff;
          color: #111;
          font-family: inherit;
          font-size: 11px;
          outline: none;
          transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease;
        }

        .booking-customer-page
          .field
          input,
        .booking-customer-page
          .field
          select {
          min-height: 38px;
          padding: 0 10px;
        }

        .booking-customer-page
          .field
          textarea {
          min-height: 90px;
          padding: 10px;
          resize: vertical;
          line-height: 1.5;
        }

        .booking-customer-page
          .field
          input:focus,
        .booking-customer-page
          .field
          select:focus,
        .booking-customer-page
          .field
          textarea:focus {
          border-color: #c7a5ad;
          box-shadow: 0 0 0 2px
            rgba(199, 165, 173, 0.1);
        }

        .booking-calendar {
          border: 1px solid #e8e1df;
          border-radius: 10px;
          padding: 12px;
          background: #fff;
        }

        .booking-calendar-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 11px;
        }

        .booking-calendar-top strong {
          font-size: 12px;
          font-weight: 700;
        }

        .calendar-arrow {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e3dcda;
          border-radius: 7px;
          background: #fff;
          color: #111;
          font-size: 13px;
          cursor: pointer;
        }

        .calendar-arrow:disabled {
          opacity: 0.35;
          cursor: default;
        }

        .calendar-weekdays,
        .calendar-grid {
          display: grid;
          grid-template-columns:
            repeat(7, minmax(0, 1fr));
          gap: 4px;
        }

        .calendar-weekdays {
          margin-bottom: 4px;
        }

        .calendar-weekdays span {
          text-align: center;
          color: #999;
          font-size: 8px;
          font-weight: 700;
          padding: 3px 0;
        }

        .calendar-day,
        .calendar-empty {
          width: 100%;
          aspect-ratio: 1 / 1;
        }

        .calendar-day {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: 1px solid transparent;
          border-radius: 7px;
          background: #faf8f7;
          color: #aaa;
          font-family: inherit;
          font-size: 10px;
          font-weight: 500;
          cursor: default;
        }

        .calendar-day.available {
          border-color: #e5d7da;
          background: #fcf5f6;
          color: #111;
          cursor: pointer;
        }

        .calendar-day.available:hover {
          border-color: #cdaeb6;
        }

        .calendar-day.today {
          font-weight: 800;
        }

        .calendar-day.selected {
          border-color: #111;
          background: #111;
          color: #fff;
          font-weight: 700;
        }

        .booking-calendar-note {
          margin-top: 9px;
          color: #888;
          font-size: 9px;
          line-height: 1.5;
        }

        .booking-error-inline {
          margin-top: 9px;
          padding: 8px 10px;
          border: 1px solid #ead1d1;
          border-radius: 7px;
          background: #fff7f7;
          color: #7c4545;
          font-size: 9px;
          line-height: 1.5;
        }

        .booking-times {
          margin-top: 13px;
          padding-top: 12px;
          border-top: 1px solid #eee7e5;
        }

        .booking-times-heading span {
          display: block;
          color: #999;
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .booking-times-heading strong {
          display: block;
          margin-top: 3px;
          color: #222;
          font-size: 10px;
          line-height: 1.4;
        }

        .booking-time-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 5px;
          margin-top: 8px;
        }

        .booking-time-grid button {
          min-height: 33px;
          padding: 0 4px;
          border: 1px solid #e4ddda;
          border-radius: 7px;
          background: #fff;
          color: #222;
          font-family: inherit;
          font-size: 9px;
          cursor: pointer;
        }

        .booking-time-grid button:hover {
          border-color: #cdaeb6;
        }

        .booking-time-grid button.selected {
          border-color: #111;
          background: #111;
          color: #fff;
        }

        .booking-soft-note {
          margin-top: 8px;
          padding: 8px 10px;
          border: 1px solid #eee4e1;
          border-radius: 7px;
          background: #fcfaf9;
          color: #777;
          font-size: 9px;
          line-height: 1.5;
        }

        .booking-extra {
          display: grid;
          gap: 9px;
          margin-top: 9px;
          padding: 11px;
          border: 1px solid #e8e1df;
          border-radius: 8px;
          background: #fcfaf9;
        }

        .booking-extra > strong {
          font-size: 11px;
        }

        .booking-extra > p {
          margin: -5px 0 0;
          color: #888;
          font-size: 9px;
          line-height: 1.5;
        }

        .booking-upload {
          padding: 12px;
          border: 1px dashed #d8cfcc;
          border-radius: 8px;
          background: #fcfaf9;
        }

        .booking-upload input {
          width: 100%;
          font-size: 10px;
        }

        .booking-upload p {
          margin: 8px 0 0;
          color: #888;
          font-size: 9px;
          line-height: 1.5;
        }

        .booking-policy {
          margin-top: 26px;
          padding-top: 20px;
          border-top: 1px solid #eee7e5;
        }

        .booking-policy-title {
          color: #333;
          font-size: 11px;
          font-weight: 700;
        }

        .booking-policy-check {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-top: 9px;
          color: #777;
          font-size: 9px;
          line-height: 1.55;
          font-weight: 400;
          cursor: pointer;
        }

        .booking-policy-check input {
          flex: 0 0 auto;
          margin-top: 2px;
        }

        .booking-error {
          margin-top: 12px;
          padding: 9px 11px;
          border: 1px solid #ead1d1;
          border-radius: 7px;
          background: #fff7f7;
          color: #7c4545;
          font-size: 10px;
          line-height: 1.5;
        }

        .booking-final-summary {
          margin-top: 14px;
          padding: 13px;
          border: 1px solid #e4dcda;
          border-radius: 9px;
          background: #faf7f6;
        }

        .booking-final-title {
          margin-bottom: 9px;
          color: #333;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }

        .booking-final-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          padding: 6px 0;
          border-bottom: 1px solid #eee7e5;
        }

        .booking-final-row span {
          flex: 0 0 90px;
          color: #999;
          font-size: 9px;
        }

        .booking-final-row strong {
          flex: 1;
          color: #222;
          font-size: 9px;
          line-height: 1.45;
          text-align: right;
        }

        .booking-final-total {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding-top: 10px;
        }

        .booking-final-total span {
          color: #555;
          font-size: 10px;
          font-weight: 600;
        }

        .booking-final-total strong {
          color: #111;
          font-size: 15px;
          font-weight: 800;
        }

        .booking-submit {
          margin-top: 14px;
        }

        @media (max-width: 560px) {
          .booking-customer-page
            .status-card {
            padding-left: 17px;
            padding-right: 17px;
          }

          .booking-section {
            margin-top: 23px;
            padding-top: 19px;
          }

          .booking-service-main {
            padding: 10px;
          }

          .booking-time-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .booking-final-row {
            gap: 8px;
          }

          .booking-final-row span {
            flex-basis: 75px;
          }
        }
      `}</style>
    </main>
  );
}