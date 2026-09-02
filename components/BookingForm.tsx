"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { peso } from "@/lib/utils";
import type {
  Service,
} from "@/lib/types";

const FULL_POLICY_URL =
  "https://docs.google.com/document/d/1aIrWBfOvahFIs1j4nsryNNydulxCCd9-D4ehWWyjsRg/edit?usp=sharing";

const DESIGN_GUIDE_URL =
  "https://drive.google.com/file/d/1dlP8kP9WLrA71hYyTfm8sJ0l0ddrPnFd/view?usp=drive_link";

type DayAvailability = {
  date: string;
  available: boolean;
  slots: string[];
};

type AvailabilityMap = Record<
  string,
  DayAvailability
>;

const WEEKDAYS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

function dateKey(
  date: Date
) {
  const year =
    date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function monthKey(
  date: Date
) {
  const year =
    date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  return `${year}-${month}`;
}

function formatMonth(
  date: Date
) {
  return date.toLocaleDateString(
    "en-PH",
    {
      month: "long",
      year: "numeric",
    }
  );
}

function formatSelectedDate(
  value: string
) {
  if (!value) {
    return "";
  }

  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

  const date = new Date(
    year,
    month - 1,
    day
  );

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
    files,
    setFiles,
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
    discount_category: "",
    referral_name: "",
    notes: "",
    terms_accepted: false,
  });

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    err,
    setErr,
  ] = useState("");

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
  ] = useState<AvailabilityMap>(
    {}
  );

  const [
    availabilityLoading,
    setAvailabilityLoading,
  ] = useState(false);

  const [
    availabilityError,
    setAvailabilityError,
  ] = useState("");

  const items = useMemo(
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
                service.price +
                (variation?.price_delta ||
                  0),
              duration_minutes:
                service.duration_minutes +
                (variation?.duration_delta_minutes ||
                  0),
            };
          }
        ),
    [
      services,
      selected,
    ]
  );

  const total =
    items.reduce(
      (
        sum: number,
        item: {
          price: number;
        }
      ) =>
        sum + item.price,
      0
    );

  const durationMinutes =
    Math.max(
      30,
      items.reduce(
        (
          sum: number,
          item: {
            duration_minutes: number;
          }
        ) =>
          sum +
          Number(
            item.duration_minutes ||
              0
          ),
        0
      ) || 60
    );

  const toggleService = (
    id: string
  ) => {
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
  };

  /*
   * Load the current month's
   * available dates and slots.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadAvailability() {
      setAvailabilityLoading(
        true
      );
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

        if (
          !response.ok
        ) {
          throw new Error(
            result.error ||
              "Unable to load availability."
          );
        }

        if (
          cancelled
        ) {
          return;
        }

        const next: AvailabilityMap =
          Object.fromEntries(
            (
              result.days ||
              []
            ).map(
              (
                day: DayAvailability
              ) => [
                day.date,
                day,
              ]
            )
          );

        setAvailability(
          next
        );
      } catch (
        error: any
      ) {
        if (
          cancelled
        ) {
          return;
        }

        setAvailabilityError(
          error?.message ||
            "Unable to load availability."
        );
        setAvailability(
          {}
        );
      } finally {
        if (
          !cancelled
        ) {
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

  /*
   * If the selected service duration
   * changes and the previous slot is
   * no longer possible, clear it.
   */
  useEffect(() => {
    if (
      !form.preferred_date
    ) {
      return;
    }

    const day =
      availability[
        form.preferred_date
      ];

    if (
      !day?.available
    ) {
      setForm(
        (current) => ({
          ...current,
          preferred_date:
            "",
          preferred_time:
            "",
        })
      );
      return;
    }

    if (
      form.preferred_time &&
      !day.slots.includes(
        form.preferred_time
      )
    ) {
      setForm(
        (current) => ({
          ...current,
          preferred_time:
            "",
        })
      );
    }
  }, [
    availability,
    form.preferred_date,
    form.preferred_time,
  ]);

  const firstDay =
    new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      1
    );

  const daysInMonth =
    new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth() + 1,
      0
    ).getDate();

  const leadingBlankDays =
    firstDay.getDay();

  const calendarCells: Array<
    Date | null
  > = [];

  for (
    let index = 0;
    index <
    leadingBlankDays;
    index++
  ) {
    calendarCells.push(
      null
    );
  }

  for (
    let day = 1;
    day <=
    daysInMonth;
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

  const today = new Date();
  const todayKey =
    dateKey(today);

  const previousMonth =
    new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth() - 1,
      1
    );

  const previousMonthKey =
    monthKey(
      previousMonth
    );

  const currentMonthKey =
    monthKey(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
    );

  const canGoPrevious =
    previousMonthKey >=
    currentMonthKey;

  const chooseDate = (
    value: string
  ) => {
    const day =
      availability[value];

    if (
      !day?.available
    ) {
      return;
    }

    setForm(
      (current) => ({
        ...current,
        preferred_date:
          value,
        preferred_time:
          day.slots.includes(
            current.preferred_time
          )
            ? current.preferred_time
            : "",
      })
    );
  };

  const submit =
    async () => {
      setErr("");

      if (
        !items.length
      ) {
        setErr(
          "Please select at least one service."
        );
        return;
      }

      if (
        !form.customer_name ||
        !form.mobile_number ||
        !form.preferred_date ||
        !form.preferred_time
      ) {
        setErr(
          "Please complete the required customer and appointment fields."
        );
        return;
      }

      if (
        !form.terms_accepted
      ) {
        setErr(
          "Please read and agree to the studio’s policies before continuing."
        );
        return;
      }

      if (!form.promo_choice) {
        setErr(
          "Please choose a promo or discount option."
        );
        return;
      }

      if (
        form.promo_choice ===
          "referral" &&
        !form.referral_name.trim()
      ) {
        setErr(
          "Please enter the name of the person who referred you."
        );
        return;
      }

      if (
        form.promo_choice ===
          "student_pwd_sc" &&
        !form.discount_category
      ) {
        setErr(
          "Please select whether the discount is for a Student, PWD, or Senior Citizen."
        );
        return;
      }

      if (
        form.promo_choice ===
          "student_pwd_sc" &&
        !studentValidId
      ) {
        setErr(
          "Student / PWD / SC Discount requires a valid ID."
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
            services:
              items,
            promo_choice:
              form.promo_choice,
            discount_category:
              form.discount_category,
            referral_name:
              form.referral_name,
            inspiration_files:
              files.map(
                (file) =>
                  file.name
              ),
          })
        );

        files.forEach(
          (file) => {
            data.append(
              "inspiration",
              file
            );
          }
        );

        if (studentValidId) {
          data.append(
            "student_valid_id",
            studentValidId
          );
        }

        if (studentRegistration) {
          data.append(
            "student_registration",
            studentRegistration
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
        error: any
      ) {
        setErr(
          error?.message ||
            "Unable to submit your request."
        );
      } finally {
        setBusy(
          false
        );
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
                              value={
                                variation.id
                              }
                              key={
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

        <div
          style={{
            marginTop:
              14,
            padding:
              "12px 14px",
            border:
              "1px solid var(--line)",
            borderRadius: 12,
            background:
              "var(--soft)",
            lineHeight: 1.5,
            fontSize: 13,
          }}
        >
          Not sure which design set to choose, or not sure which tier your
          chosen design falls under?{" "}
          <a
            href={
              DESIGN_GUIDE_URL
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
              fontWeight: 600,
            }}
          >
            Check our Design Tier Guide →
          </a>
        </div>

        {/* CUSTOMER DETAILS */}
        <h2
          className="serif"
          style={{
            marginTop:
              35,
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
              setForm({
                ...form,
                customer_name:
                  event
                    .target
                    .value,
              })
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
              setForm({
                ...form,
                mobile_number:
                  event
                    .target
                    .value,
              })
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
              setForm({
                ...form,
                social_handle:
                  event
                    .target
                    .value,
              })
            }
          />
        </div>

        {/* APPOINTMENT */}
        <h2
          className="serif"
          style={{
            marginTop:
              35,
          }}
        >
          3. Appointment
        </h2>

        <div
          style={{
            border:
              "1px solid var(--line)",
            borderRadius: 16,
            padding: 16,
            marginTop: 12,
            background:
              "var(--card)",
          }}
        >
          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              gap: 12,
              marginBottom:
                14,
            }}
          >
            <button
              type="button"
              className="btn secondary small"
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

            <strong
              style={{
                fontSize:
                  16,
                textAlign:
                  "center",
              }}
            >
              {formatMonth(
                calendarMonth
              )}
            </strong>

            <button
              type="button"
              className="btn secondary small"
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

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(7, minmax(0, 1fr))",
              gap: 5,
              marginBottom:
                6,
            }}
          >
            {WEEKDAYS.map(
              (day) => (
                <div
                  key={day}
                  className="muted"
                  style={{
                    textAlign:
                      "center",
                    fontSize:
                      11,
                    fontWeight:
                      600,
                    padding:
                      "5px 0",
                  }}
                >
                  {day}
                </div>
              )
            )}

            {calendarCells.map(
              (
                cell,
                index
              ) => {
                if (!cell) {
                  return (
                    <div
                      key={`blank-${index}`}
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

                const isAvailable =
                  !isPast &&
                  Boolean(
                    day?.available
                  );

                const isSelected =
                  form.preferred_date ===
                  key;

                return (
                  <button
                    type="button"
                    key={key}
                    disabled={
                      !isAvailable ||
                      availabilityLoading
                    }
                    onClick={() =>
                      chooseDate(
                        key
                      )
                    }
                    aria-label={`${cell.toLocaleDateString(
                      "en-PH",
                      {
                        month:
                          "long",
                        day:
                          "numeric",
                        year:
                          "numeric",
                      }
                    )}${
                      isAvailable
                        ? ", available"
                        : ", unavailable"
                    }`}
                    style={{
                      width:
                        "100%",
                      minWidth: 0,
                      aspectRatio:
                        "1 / 1",
                      border:
                        isSelected
                          ? "2px solid var(--ink)"
                          : "1px solid var(--line)",
                      borderRadius:
                        10,
                      background:
                        isSelected
                          ? "var(--ink)"
                          : isAvailable
                            ? "var(--soft)"
                            : "transparent",
                      color:
                        isSelected
                          ? "white"
                          : isAvailable
                            ? "var(--ink)"
                            : "var(--muted)",
                      opacity:
                        isPast ||
                        (!isAvailable &&
                          !isSelected)
                          ? 0.45
                          : 1,
                      cursor:
                        isAvailable
                          ? "pointer"
                          : "default",
                      fontSize:
                        13,
                      fontWeight:
                        isSelected ||
                        key ===
                          todayKey
                          ? 700
                          : 500,
                      padding: 0,
                    }}
                  >
                    {cell.getDate()}
                  </button>
                );
              }
            )}
          </div>

          <div
            style={{
              display:
                "flex",
              flexWrap:
                "wrap",
              gap: 10,
              marginTop:
                12,
              fontSize:
                12,
            }}
            className="muted"
          >
            <span>
              ● Available
            </span>
            <span>
              ● Unavailable
            </span>
          </div>

          {availabilityError && (
            <div
              className="notice"
              style={{
                marginTop:
                  12,
              }}
            >
              {availabilityError}
            </div>
          )}

          {availabilityLoading && (
            <p
              className="muted"
              style={{
                marginTop:
                  14,
              }}
            >
              Checking available
              dates…
            </p>
          )}

          {!availabilityLoading &&
            !items.length && (
              <div
                className="notice"
                style={{
                  marginTop:
                    14,
                }}
              >
                Select at least one
                service first so we
                can show the correct
                available time slots.
              </div>
            )}

          {form.preferred_date &&
            availability[
              form
                .preferred_date
            ]?.available && (
              <div
                style={{
                  marginTop:
                    18,
                  paddingTop:
                    16,
                  borderTop:
                    "1px solid var(--line)",
                }}
              >
                <div className="kicker">
                  Available times
                </div>

                <strong
                  style={{
                    display:
                      "block",
                    marginTop:
                      4,
                    marginBottom:
                      12,
                  }}
                >
                  {formatSelectedDate(
                    form.preferred_date
                  )}
                </strong>

                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(110px, 1fr))",
                    gap: 8,
                  }}
                >
                  {availability[
                    form
                      .preferred_date
                  ].slots.map(
                    (slot) => {
                      const selectedTime =
                        form.preferred_time ===
                        slot;

                      return (
                        <button
                          type="button"
                          key={
                            slot
                          }
                          className={
                            selectedTime
                              ? "btn small"
                              : "btn secondary small"
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
                          {slot}
                        </button>
                      );
                    }
                  )}
                </div>

                {!availability[
                  form
                    .preferred_date
                ].slots.length && (
                  <div
                    className="notice"
                    style={{
                      marginTop:
                        12,
                    }}
                  >
                    No available time
                    slots remain for
                    the services selected
                    on this date.
                  </div>
                )}
              </div>
            )}
        </div>

        <div
          className="notice"
          style={{
            marginTop:
              12,
          }}
        >
          Available dates and times are
          based on the Nailtech's current
          availability. Your selected
          date/time is still a request and
          will only be confirmed after
          approval.
        </div>

        {/* REMOVAL */}
        <h2
          className="serif"
          style={{
            marginTop:
              35,
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
              setForm({
                ...form,
                removal:
                  event
                    .target
                    .value,
              })
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
                    {
                      option
                    }
                  </option>
                )
              )}
          </select>
        </div>

        {/* PROMO / DISCOUNT */}
        <h2
          className="serif"
          style={{
            marginTop:
              35,
          }}
        >
          5. Promo / Discount
        </h2>

        <div className="field">
          <label>
            Choose one option
          </label>

          <select
            value={
              form.promo_choice
            }
            onChange={(
              event
            ) => {
              const value =
                event
                  .target
                  .value;

              setForm(
                (current) => ({
                  ...current,
                  promo_choice:
                    value,
                  discount_category:
                    value ===
                    "student_pwd_sc"
                      ? current.discount_category
                      : "",
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
                setStudentValidId(
                  null
                );
                setStudentRegistration(
                  null
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
                      value={`promo:${promo.id}`}
                      key={
                        promo.id
                      }
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

        {form.promo_choice ===
          "first_time" && (
          <div
            className="notice"
            style={{
              marginTop:
                10,
            }}
          >
            5% applies to regular rates
            only and cannot be combined
            with a current promo.
          </div>
        )}

        {form.promo_choice ===
          "student_pwd_sc" && (
          <div
            style={{
              marginTop:
                12,
              padding:
                "14px 16px",
              border:
                "1px solid var(--line)",
              borderRadius:
                12,
              background:
                "var(--soft)",
            }}
          >
            <strong>
              Student / PWD / SC Discount — 5%
            </strong>

            <div
              className="muted"
              style={{
                marginTop:
                  4,
                fontSize:
                  13,
                lineHeight:
                  1.5,
              }}
            >
              A valid ID is required for
              verification.
            </div>

            <div
              className="field"
              style={{
                marginTop:
                  12,
              }}
            >
              <label>
                Discount Type *
              </label>

              <select
                value={
                  form.discount_category
                }
                onChange={(
                  event
                ) => {
                  const value =
                    event.target.value;

                  setForm(
                    (current) => ({
                      ...current,
                      discount_category:
                        value,
                    })
                  );

                  if (
                    value !== "student"
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

            <div
              className="field"
              style={{
                marginTop:
                  10,
              }}
            >
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
                    event.target.files?.[0] ||
                      null
                  )
                }
              />
            </div>

            {form.discount_category ===
              "student" && (
              <div
                className="field"
                style={{
                  marginTop:
                    10,
                }}
              >
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
                      event.target.files?.[0] ||
                        null
                    )
                  }
                />

                <div
                  className="muted"
                  style={{
                    marginTop:
                      5,
                    fontSize:
                      12,
                  }}
                >
                  Upload this only if you are a student.
                </div>
              </div>
            )}
          </div>
        )}

        {form.promo_choice ===
          "referral" && (
          <div
            className="field"
            style={{
              marginTop:
                10,
            }}
          >
            <label>
              Name of the person who referred you *
            </label>

            <input
              value={
                form.referral_name
              }
              onChange={(
                event
              ) =>
                setForm(
                  (current) => ({
                    ...current,
                    referral_name:
                      event
                        .target
                        .value,
                  })
                )
              }
              placeholder="Enter their name"
            />
          </div>
        )}

        {/* NAIL INSPIRATION */}
        <h2
          className="serif"
          style={{
            marginTop:
              35,
          }}
        >
          6. Nail Inspiration
        </h2>

        <div className="field">
          <label>
            Upload Your Nail Inspiration
          </label>

          <div className="upload">
            <input
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.heic,image/jpeg,image/png"
              onChange={(
                event
              ) =>
                setFiles(
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
                marginTop:
                  8,
              }}
            >
              {files.length
                ? `${files.length} file(s) selected`
                : "Design Inspiration: Please note that inspiration photos serve as a design reference only. While we aim to achieve the closest possible result, exact replication is not guaranteed due to differences in nail shape, length, condition, materials, and application technique."}
            </div>
          </div>
        </div>

        {/* NOTES */}
        <h2
          className="serif"
          style={{
            marginTop:
              35,
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
              setForm({
                ...form,
                notes:
                  event
                    .target
                    .value,
              })
            }
          />
        </div>

        {/* POLICY ACKNOWLEDGMENT */}
        <div
          className="policy-acknowledgment"
          style={{
            marginTop:
              35,
            paddingTop:
              22,
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
              fontWeight:
                400,
              fontSize:
                13,
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
                setForm({
                  ...form,
                  terms_accepted:
                    event
                      .target
                      .checked,
                })
              }
              style={{
                marginTop:
                  3,
                flex:
                  "0 0 auto",
              }}
            />

            <span>
              I have read and agree
              to the studio’s
              policies regarding
              booking, payment,
              pricing, rescheduling,
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

        {err && (
          <div
            className="notice"
            style={{
              marginTop:
                15,
            }}
          >
            {err}
          </div>
        )}

        <div
          style={{
            display:
              "flex",
            justifyContent:
              "flex-end",
            marginTop:
              22,
          }}
        >
          <button
            className="btn"
            disabled={
              busy
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
            Choose services to see your
            request total.
          </p>
        )}

        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            marginTop:
              15,
          }}
        >
          <strong>
            Estimated total
          </strong>

          <strong>
            {peso(
              total
            )}
          </strong>
        </div>

        {form.preferred_date &&
          form.preferred_time && (
            <div
              style={{
                marginTop:
                  16,
                paddingTop:
                  16,
                borderTop:
                  "1px solid var(--line)",
              }}
            >
              <div className="muted">
                Appointment
              </div>

              <strong>
                {formatSelectedDate(
                  form.preferred_date
                )}
              </strong>

              <div>
                at{" "}
                {
                  form.preferred_time
                }
              </div>
            </div>
          )}
      </aside>
    </div>
  );
}
