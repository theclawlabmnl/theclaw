"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { peso } from "@/lib/utils";
import type { Service } from "@/lib/types";

const FULL_POLICY_URL =
  "https://docs.google.com/document/d/1aIrWBfOvahFIs1j4nsryNNydulxCCd9-D4ehWWyjsRg/edit?usp=sharing";

function dateValue(date: Date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(
    2,
    "0"
  )}-${String(
    date.getDate()
  ).padStart(
    2,
    "0"
  )}`;
}

function monthText(date: Date) {
  return date.toLocaleDateString(
    "en-US",
    {
      month: "long",
      year: "numeric",
    }
  );
}

function readableDate(value: string) {
  if (!value) return "";

  return new Date(
    `${value}T12:00:00`
  ).toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  );
}

function readableTime(value: string) {
  if (!value) return "";

  const [
    hours,
    minutes,
  ] = value
    .slice(0, 5)
    .split(":")
    .map(Number);

  const hour =
    hours % 12 || 12;

  const period =
    hours >= 12 ? "PM" : "AM";

  return `${hour}:${String(
    minutes
  ).padStart(
    2,
    "0"
  )} ${period}`;
}

function getCalendarDays(
  month: Date
) {
  const year =
    month.getFullYear();

  const monthIndex =
    month.getMonth();

  const firstDay =
    new Date(
      year,
      monthIndex,
      1
    ).getDay();

  const daysInMonth =
    new Date(
      year,
      monthIndex + 1,
      0
    ).getDate();

  const result: Array<
    | {
        date: string;
        day: number;
      }
    | null
  > = [];

  for (
    let i = 0;
    i < firstDay;
    i++
  ) {
    result.push(null);
  }

  for (
    let day = 1;
    day <= daysInMonth;
    day++
  ) {
    const current =
      new Date(
        year,
        monthIndex,
        day
      );

    result.push({
      date:
        dateValue(current),
      day,
    });
  }

  return result;
}

function promoDiscount(
  promo: any,
  total: number
) {
  if (!promo) {
    return 0;
  }

  const type = String(
    promo.discount_type ||
      ""
  ).toLowerCase();

  const value =
    Number(
      promo.discount_value
    ) || 0;

  if (value <= 0) {
    return 0;
  }

  if (
    type ===
      "percentage" ||
    type ===
      "percent" ||
    type ===
      "percent_off"
  ) {
    return Math.min(
      total,
      total *
        (value / 100)
    );
  }

  return Math.min(
    total,
    value
  );
}

export default function BookingForm({
  services,
  promos,
  settings,
}: {
  services: Service[];
  promos: any[];
  settings: Record<string, string>;
}) {
  const router =
    useRouter();

  const [
    selected,
    setSelected,
  ] = useState<
    Record<string, string>
  >({});

  const [
    inspirationFiles,
    setInspirationFiles,
  ] = useState<File[]>(
    []
  );

  const [
    studentIdFile,
    setStudentIdFile,
  ] = useState<File | null>(
    null
  );

  const [
    studentRegistrationFile,
    setStudentRegistrationFile,
  ] = useState<File | null>(
    null
  );

  const [
    month,
    setMonth,
  ] = useState(() => {
    const now =
      new Date();

    return new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );
  });

  const [
    availability,
    setAvailability,
  ] = useState<
    Record<
      string,
      string[]
    >
  >({});

  const [
    loadingAvailability,
    setLoadingAvailability,
  ] = useState(false);

  const [
    form,
    setForm,
  ] = useState({
    customer_name: "",
    mobile_number: "",
    social_handle: "",
    preferred_date: "",
    preferred_time: "",
    removal: "None",
    promo_choice: "",
    referral_name: "",
    notes: "",
    terms_accepted: false,
  });

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const items =
    useMemo(
      () =>
        services
          .filter(
            (service) =>
              selected[
                service.id
              ] !== undefined
          )
          .map(
            (service) => {
              const variation =
                service.service_variations?.find(
                  (item) =>
                    item.id ===
                    selected[
                      service.id
                    ]
                );

              return {
                service_id:
                  service.id,

                service_name:
                  service.name,

                variation_id:
                  variation?.id,

                variation_name:
                  variation?.name,

                price:
                  Number(
                    service.price
                  ) +
                  Number(
                    variation?.price_delta ||
                      0
                  ),

                duration_minutes:
                  Number(
                    service.duration_minutes
                  ) +
                  Number(
                    variation?.duration_delta_minutes ||
                      0
                  ),
              };
            }
          ),
      [
        services,
        selected,
      ]
    );

  const baseTotal =
    items.reduce(
      (
        total,
        item
      ) =>
        total +
        item.price,
      0
    );

  const duration =
    Math.max(
      30,
      items.reduce(
        (
          total,
          item
        ) =>
          total +
          item.duration_minutes,
        0
      )
    );

  const currentPromo =
    form.promo_choice.startsWith(
      "promo:"
    )
      ? promos.find(
          (promo) =>
            String(
              promo.id
            ) ===
            form.promo_choice.slice(
              6
            )
        )
      : null;

  const permanentType =
    form.promo_choice;

  let discount = 0;

  if (
    permanentType ===
    "first_time"
  ) {
    discount =
      baseTotal * 0.05;
  }

  if (
    permanentType ===
    "student_pwd_sc"
  ) {
    discount =
      baseTotal * 0.05;
  }

  if (
    currentPromo
  ) {
    discount =
      promoDiscount(
        currentPromo,
        baseTotal
      );
  }

  const estimatedTotal =
    Math.max(
      0,
      baseTotal -
        discount
    );

  const cells =
    useMemo(
      () =>
        getCalendarDays(
          month
        ),
      [month]
    );

  const today =
    dateValue(
      new Date()
    );

  const selectedSlots =
    form.preferred_date
      ? availability[
          form.preferred_date
        ] || []
      : [];

  const promoLabel =
    currentPromo
      ? currentPromo.name
      : permanentType ===
        "first_time"
        ? "First-time Booking Discount"
        : permanentType ===
          "student_pwd_sc"
          ? "Student / PWD / SC Discount"
          : permanentType ===
            "referral"
            ? "Referral Program"
            : "Not Applicable";

  const isStudentDiscount =
    permanentType ===
    "student_pwd_sc";

  const isReferral =
    permanentType ===
    "referral";

  const isPromo =
    Boolean(
      currentPromo
    );

  useEffect(() => {
    if (!items.length) {
      setAvailability({});
      return;
    }

    const first =
      new Date(
        month.getFullYear(),
        month.getMonth(),
        1
      );

    const last =
      new Date(
        month.getFullYear(),
        month.getMonth() + 1,
        0
      );

    const from =
      dateValue(first);

    const to =
      dateValue(last);

    let cancelled =
      false;

    async function load() {
      setLoadingAvailability(
        true
      );

      try {
        const response =
          await fetch(
            `/api/availability?from=${encodeURIComponent(
              from
            )}&to=${encodeURIComponent(
              to
            )}&duration=${encodeURIComponent(
              duration
            )}`,
            {
              cache:
                "no-store",
            }
          );

        const result =
          await response.json();

        if (
          !response.ok
        ) {
          throw new Error(
            result.error ||
              "Unable to load availability."
          );
        }

        if (
          !cancelled
        ) {
          setAvailability(
            result.days ||
              {}
          );
        }
      } catch {
        if (
          !cancelled
        ) {
          setAvailability(
            {}
          );
        }
      } finally {
        if (
          !cancelled
        ) {
          setLoadingAvailability(
            false
          );
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [
    month,
    duration,
    items.length,
  ]);

  const toggleService =
    (id: string) => {
      setSelected(
        (current) => {
          const next = {
            ...current,
          };

          if (
            next[id] !==
            undefined
          ) {
            delete next[id];
          } else {
            next[id] = "";
          }

          return next;
        }
      );

      setForm(
        (current) => ({
          ...current,
          preferred_date:
            "",
          preferred_time:
            "",
        })
      );
    };

  const chooseDate =
    (date: string) => {
      const slots =
        availability[
          date
        ] || [];

      if (!slots.length) {
        return;
      }

      setForm(
        (current) => ({
          ...current,
          preferred_date:
            date,
          preferred_time:
            "",
        })
      );

      setError("");
    };

  const previousMonth =
    () => {
      const current =
        new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1
        );

      const previous =
        new Date(
          month.getFullYear(),
          month.getMonth() - 1,
          1
        );

      if (
        previous < current
      ) {
        return;
      }

      setMonth(
        previous
      );
    };

  const nextMonth =
    () => {
      setMonth(
        new Date(
          month.getFullYear(),
          month.getMonth() + 1,
          1
        )
      );
    };

  const submit =
    async () => {
      setError("");

      if (
        !items.length
      ) {
        setError(
          "Please select at least one service."
        );
        return;
      }

      if (
        !form.customer_name ||
        !form.mobile_number
      ) {
        setError(
          "Please complete your required customer details."
        );
        return;
      }

      if (
        !form.preferred_date ||
        !form.preferred_time
      ) {
        setError(
          "Please choose an available date and time."
        );
        return;
      }

      if (
        !form.terms_accepted
      ) {
        setError(
          "Please read and agree to the studio’s policies before continuing."
        );
        return;
      }

      if (
        isReferral &&
        !form.referral_name.trim()
      ) {
        setError(
          "Please enter the name of the person who referred you."
        );
        return;
      }

      if (
        isStudentDiscount &&
        !studentIdFile
      ) {
        setError(
          "Please upload your Valid ID."
        );
        return;
      }

      if (
        isStudentDiscount &&
        !studentRegistrationFile
      ) {
        setError(
          "Please upload your current Registration Card or Registration Form."
        );
        return;
      }

      setBusy(true);

      try {
        const data =
          new FormData();

        data.append(
          "payload",
          JSON.stringify({
            ...form,

            promo_id:
              form.promo_choice.startsWith(
                "promo:"
              )
                ? form.promo_choice.slice(
                    6
                  )
                : null,

            promo_choice:
              form.promo_choice,

            promo_name:
              promoLabel,

            services:
              items,

            estimated_total:
              estimatedTotal,

            student_proof_required:
              isStudentDiscount,

            inspiration_files:
              inspirationFiles.map(
                (
                  file
                ) =>
                  file.name
              ),
          })
        );

        inspirationFiles.forEach(
          (file) => {
            data.append(
              "inspiration",
              file
            );
          }
        );

        if (
          studentIdFile
        ) {
          data.append(
            "student_valid_id",
            studentIdFile
          );
        }

        if (
          studentRegistrationFile
        ) {
          data.append(
            "student_registration",
            studentRegistrationFile
          );
        }

        const response =
          await fetch(
            "/api/bookings",
            {
              method:
                "POST",
              body: data,
            }
          );

        const result =
          await response.json();

        if (
          !response.ok
        ) {
          throw new Error(
            result.error ||
              "Unable to submit your request."
          );
        }

        router.push(
          `/book/review?token=${result.token}`
        );
      } catch (
        err: any
      ) {
        setError(
          err?.message ||
            "Unable to submit your request."
        );
      } finally {
        setBusy(false);
      }
    };

  return (
    <div className="form-layout">
      <div className="form-card">

        {/* SERVICES */}
        <h2 className="serif">
          1. Services
        </h2>

        <div className="service-select">
          {services.map(
            (service) => (
              <div
                className="service-row"
                key={
                  service.id
                }
              >
                <div className="service-top">
                  <input
                    type="checkbox"
                    checked={
                      selected[
                        service.id
                      ] !==
                      undefined
                    }
                    onChange={() =>
                      toggleService(
                        service.id
                      )
                    }
                  />

                  <div>
                    <strong>
                      {
                        service.name
                      }
                    </strong>

                    <div className="muted">
                      {
                        service.description
                      }
                    </div>
                  </div>

                  <div>
                    {peso(
                      service.price
                    )}
                  </div>
                </div>

                {selected[
                  service.id
                ] !==
                  undefined && (
                  <div className="field">
                    <label>
                      Variation
                    </label>

                    <select
                      value={
                        selected[
                          service.id
                        ]
                      }
                      onChange={(
                        event
                      ) =>
                        setSelected(
                          (
                            current
                          ) => ({
                            ...current,
                            [service.id]:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                    >
                      <option value="">
                        Standard
                      </option>

                      {service
                        .service_variations
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
                              {variation.price_delta >=
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
            )
          )}
        </div>

        {/* DETAILS */}
        <h2
          className="serif"
          style={{
            marginTop: 35,
          }}
        >
          2. Your details
        </h2>

        <div className="field">
          <label>
            Your Name *
          </label>

          <input
            value={
              form.customer_name
            }
            onChange={(
              event
            ) =>
              setForm(
                (
                  current
                ) => ({
                  ...current,
                  customer_name:
                    event
                      .target
                      .value,
                })
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
              form.mobile_number
            }
            onChange={(
              event
            ) =>
              setForm(
                (
                  current
                ) => ({
                  ...current,
                  mobile_number:
                    event
                      .target
                      .value,
                })
              )
            }
          />
        </div>

        <div className="field">
          <label>
            IG or Messenger Handle
          </label>

          <input
            value={
              form.social_handle
            }
            onChange={(
              event
            ) =>
              setForm(
                (
                  current
                ) => ({
                  ...current,
                  social_handle:
                    event
                      .target
                      .value,
                })
              )
            }
          />
        </div>

        {/* APPOINTMENT */}
        <h2
          className="serif"
          style={{
            marginTop: 35,
          }}
        >
          3. Choose your appointment
        </h2>

        {!items.length ? (
          <div className="notice">
            Select a service first to
            see your available dates
            and times.
          </div>
        ) : (
          <>
            <div className="booking-calendar">
              <div className="calendar-header">
                <button
                  type="button"
                  className="calendar-nav"
                  onClick={
                    previousMonth
                  }
                >
                  ‹
                </button>

                <div className="calendar-month">
                  {monthText(
                    month
                  )}
                </div>

                <button
                  type="button"
                  className="calendar-nav"
                  onClick={
                    nextMonth
                  }
                >
                  ›
                </button>
              </div>

              <div className="calendar-weekdays">
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
                      key={
                        day
                      }
                    >
                      {day}
                    </div>
                  )
                )}
              </div>

              <div className="calendar-days">
                {cells.map(
                  (
                    cell,
                    index
                  ) => {
                    if (!cell) {
                      return (
                        <div
                          key={`empty-${index}`}
                          className="calendar-day empty"
                        />
                      );
                    }

                    const slots =
                      availability[
                        cell.date
                      ] || [];

                    const available =
                      cell.date >=
                        today &&
                      slots.length >
                        0;

                    const selectedDate =
                      form.preferred_date ===
                      cell.date;

                    return (
                      <button
                        key={
                          cell.date
                        }
                        type="button"
                        disabled={
                          !available ||
                          loadingAvailability
                        }
                        className={[
                          "calendar-day",
                          available
                            ? "available"
                            : "unavailable",
                          selectedDate
                            ? "selected"
                            : "",
                        ]
                          .filter(
                            Boolean
                          )
                          .join(
                            " "
                          )}
                        onClick={() =>
                          chooseDate(
                            cell.date
                          )
                        }
                      >
                        {
                          cell.day
                        }

                        {available && (
                          <i />
                        )}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {loadingAvailability && (
              <div
                className="notice"
                style={{
                  marginTop: 12,
                }}
              >
                Checking available
                appointments…
              </div>
            )}

            {form.preferred_date &&
              !loadingAvailability && (
                <div
                  style={{
                    marginTop: 18,
                  }}
                >
                  <div className="kicker">
                    Available times
                  </div>

                  <p
                    style={{
                      margin:
                        "3px 0 10px",
                    }}
                  >
                    <strong>
                      {readableDate(
                        form.preferred_date
                      )}
                    </strong>
                  </p>

                  {selectedSlots.length ? (
                    <div className="time-slot-grid">
                      {selectedSlots.map(
                        (
                          slot
                        ) => (
                          <button
                            key={
                              slot
                            }
                            type="button"
                            className={
                              form.preferred_time ===
                              slot
                                ? "time-slot selected"
                                : "time-slot"
                            }
                            onClick={() =>
                              setForm(
                                (
                                  current
                                ) => ({
                                  ...current,
                                  preferred_time:
                                    slot,
                                })
                              )
                            }
                          >
                            {readableTime(
                              slot
                            )}
                          </button>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="notice">
                      No available times remain
                      for this date.
                    </div>
                  )}
                </div>
              )}
          </>
        )}

        {/* REMOVAL */}
        <h2
          className="serif"
          style={{
            marginTop: 35,
          }}
        >
          4. Removal
        </h2>

        <div className="field">
          <select
            value={
              form.removal
            }
            onChange={(
              event
            ) =>
              setForm(
                (
                  current
                ) => ({
                  ...current,
                  removal:
                    event
                      .target
                      .value,
                })
              )
            }
          >
            {(
              settings.removal_options ||
              "None\nGel\nSoft Gel\nHard Gel\nOther"
            )
              .split(
                "\n"
              )
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

        {/* PROMOS / DISCOUNTS */}
        <h2
          className="serif"
          style={{
            marginTop: 35,
          }}
        >
          5. Promo / Discount
        </h2>

        <div className="field">
          <label>
            Choose one
          </label>

          <select
            value={
              form.promo_choice
            }
            onChange={(
              event
            ) => {
              const value =
                event.target
                  .value;

              setForm(
                (
                  current
                ) => ({
                  ...current,
                  promo_choice:
                    value,
                  referral_name:
                    value ===
                    "referral"
                      ? current.referral_name
                      : "",
                })
              );

              if (
                value !==
                "student_pwd_sc"
              ) {
                setStudentIdFile(
                  null
                );

                setStudentRegistrationFile(
                  null
                );
              }

              if (
                value !==
                "referral"
              ) {
                setForm(
                  (
                    current
                  ) => ({
                    ...current,
                    referral_name:
                      "",
                  })
                );
              }
            }}
          >
            <option value="">
              Not Applicable
            </option>

            {promos.length >
              0 && (
              <optgroup label="Current Promo">
                {promos.map(
                  (
                    promo
                  ) => (
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

            <optgroup label="Permanent">
              <option value="first_time">
                First-time Booking Discount
                — 5% off regular rates
              </option>

              <option value="student_pwd_sc">
                Student / PWD / SC Discount
                — 5%
              </option>

              <option value="referral">
                Referral Program
              </option>
            </optgroup>
          </select>
        </div>

        {form.promo_choice ===
          "first_time" && (
          <div
            className="notice"
            style={{
              marginTop: 10,
            }}
          >
            <strong>
              First-time Booking Discount
            </strong>

            <br />

            5% discount on regular rates
            only. This discount cannot be
            combined with a current promo.
          </div>
        )}

        {isStudentDiscount && (
          <div
            className="card"
            style={{
              marginTop: 12,
              background:
                "#fcf7f4",
            }}
          >
            <div className="kicker">
              Verification required
            </div>

            <h3
              className="serif"
              style={{
                margin:
                  "4px 0 8px",
              }}
            >
              Student / PWD / SC Discount
            </h3>

            <p
              className="muted"
              style={{
                marginTop: 0,
              }}
            >
              5% discount. Please upload
              <strong>
                {" "}
                BOTH
              </strong>{" "}
              documents below. The studio
              will verify eligibility before
              the discount is finalized.
            </p>

            <div className="field">
              <label>
                Valid ID *
              </label>

              <input
                type="file"
                accept=".jpg,.jpeg,.png,.heic,.pdf,image/jpeg,image/png,image/heic,application/pdf"
                onChange={(
                  event
                ) =>
                  setStudentIdFile(
                    event
                      .target
                      .files?.[0] ||
                      null
                  )
                }
              />

              <div className="muted">
                {studentIdFile
                  ? studentIdFile.name
                  : "Upload your valid ID."}
              </div>
            </div>

            <div className="field">
              <label>
                Current Registration Card / Registration Form *
              </label>

              <input
                type="file"
                accept=".jpg,.jpeg,.png,.heic,.pdf,image/jpeg,image/png,image/heic,application/pdf"
                onChange={(
                  event
                ) =>
                  setStudentRegistrationFile(
                    event
                      .target
                      .files?.[0] ||
                      null
                  )
                }
              />

              <div className="muted">
                {studentRegistrationFile
                  ? studentRegistrationFile.name
                  : "Upload your current Registration Card/Form showing the current School Year."}
              </div>
            </div>
          </div>
        )}

        {isReferral && (
          <div className="field">
            <label>
              Who referred you? *
            </label>

            <input
              placeholder="Enter the name of the person who referred you"
              value={
                form.referral_name
              }
              onChange={(
                event
              ) =>
                setForm(
                  (
                    current
                  ) => ({
                    ...current,
                    referral_name:
                      event
                        .target
                        .value,
                  })
                )
              }
            />
          </div>
        )}

        {isPromo && (
          <div
            className="notice"
            style={{
              marginTop: 10,
            }}
          >
            <strong>
              {currentPromo.name}
            </strong>

            {currentPromo.description && (
              <>
                <br />
                {currentPromo.description}
              </>
            )}
          </div>
        )}

        {/* NAIL INSPIRATION */}
        <h2
          className="serif"
          style={{
            marginTop: 35,
          }}
        >
          6. Nail Inspiration
        </h2>

        <div className="field">
          <label>
            Nail Inspiration — File Upload
          </label>

          <div className="upload">
            <input
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.heic,image/jpeg,image/png,image/heic"
              onChange={(
                event
              ) =>
                setInspirationFiles(
                  Array.from(
                    event
                      .target
                      .files ||
                      []
                  ).slice(
                    0,
                    8
                  )
                )
              }
            />

            <div
              className="muted"
              style={{
                marginTop: 8,
              }}
            >
              {inspirationFiles.length
                ? `${inspirationFiles.length} file(s) selected`
                : "JPG, JPEG, PNG; HEIC where supported."}
            </div>
          </div>
        </div>

        {/* NOTES */}
        <h2
          className="serif"
          style={{
            marginTop: 35,
          }}
        >
          7. Additional Requests / Notes
        </h2>

        <div className="field">
          <textarea
            placeholder="Anything else you'd like us to know?"
            value={
              form.notes
            }
            onChange={(
              event
            ) =>
              setForm(
                (
                  current
                ) => ({
                  ...current,
                  notes:
                    event
                      .target
                      .value,
                })
              )
            }
          />
        </div>

        {/* POLICY */}
        <div
          style={{
            marginTop: 35,
            paddingTop: 22,
            borderTop:
              "1px solid var(--line)",
          }}
        >
          <label
            style={{
              display:
                "flex",
              gap: 10,
              alignItems:
                "flex-start",
              margin: 0,
              fontWeight: 400,
              fontSize: 13,
              lineHeight:
                1.55,
            }}
          >
            <input
              type="checkbox"
              checked={
                form.terms_accepted
              }
              onChange={(
                event
              ) =>
                setForm(
                  (
                    current
                  ) => ({
                    ...current,
                    terms_accepted:
                      event
                        .target
                        .checked,
                  })
                )
              }
              style={{
                marginTop: 3,
                flex:
                  "0 0 auto",
              }}
            />

            <span>
              I have read and agree to
              the studio’s policies
              regarding booking,
              payment, pricing,
              rescheduling,
              cancellations, late
              arrivals, warranty,
              studio guidelines, and
              photo usage.{" "}
              <a
                href={
                  FULL_POLICY_URL
                }
                target="_blank"
                rel="noreferrer"
                style={{
                  color:
                    "var(--rose-dark)",
                  textDecoration:
                    "underline",
                  textUnderlineOffset:
                    "2px",
                }}
              >
                View Full Policy →
              </a>
            </span>
          </label>
        </div>

        {error && (
          <div
            className="notice"
            style={{
              marginTop: 15,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display:
              "flex",
            justifyContent:
              "flex-end",
            marginTop: 22,
          }}
        >
          <button
            type="button"
            className="btn"
            disabled={
              busy ||
              !form.preferred_date ||
              !form.preferred_time
            }
            onClick={
              submit
            }
          >
            {busy
              ? "Preparing…"
              : "Review request →"}
          </button>
        </div>
      </div>

      {/* SUMMARY */}
      <aside
        className="card"
        style={{
          position:
            "sticky",
          top: 92,
        }}
      >
        <div className="kicker">
          Your request
        </div>

        <h2 className="serif">
          Summary
        </h2>

        {items.length ? (
          items.map(
            (item) => (
              <div
                key={
                  item.service_id
                }
                style={{
                  padding:
                    "10px 0",
                  borderBottom:
                    "1px solid var(--line)",
                }}
              >
                <strong>
                  {
                    item.service_name
                  }
                </strong>

                {item.variation_name && (
                  <div className="muted">
                    {
                      item.variation_name
                    }
                  </div>
                )}

                <div>
                  {peso(
                    item.price
                  )}
                </div>
              </div>
            )
          )
        ) : (
          <p className="muted">
            Choose services to see
            your request total.
          </p>
        )}

        {form.preferred_date &&
          form.preferred_time && (
            <div
              style={{
                marginTop: 15,
                paddingTop: 15,
                borderTop:
                  "1px solid var(--line)",
              }}
            >
              <div className="muted">
                Appointment
              </div>

              <strong>
                {readableDate(
                  form.preferred_date
                )}
              </strong>

              <div>
                {readableTime(
                  form.preferred_time
                )}
              </div>
            </div>
          )}

        {form.promo_choice && (
          <div
            style={{
              marginTop: 15,
              paddingTop: 15,
              borderTop:
                "1px solid var(--line)",
            }}
          >
            <div className="muted">
              Discount
            </div>

            <strong>
              {promoLabel}
            </strong>

            {discount > 0 && (
              <div>
                -{" "}
                {peso(
                  discount
                )}
              </div>
            )}

            {isReferral &&
              form.referral_name && (
                <div className="muted">
                  Referred by:{" "}
                  {
                    form.referral_name
                  }
                </div>
              )}

            {isStudentDiscount && (
              <div className="muted">
                Verification required
              </div>
            )}
          </div>
        )}

        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            gap: 10,
            marginTop: 15,
          }}
        >
          <strong>
            Estimated total
          </strong>

          <strong>
            {peso(
              estimatedTotal
            )}
          </strong>
        </div>
      </aside>
    </div>
  );
}