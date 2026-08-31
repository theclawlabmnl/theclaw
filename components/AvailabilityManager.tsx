"use client";

import {
  useState,
} from "react";

type Rule = {
  id?: string;
  label?: string | null;
  day_of_week: number;
  is_available: boolean;
  start_time?: string | null;
  end_time?: string | null;
  semester_name?: string | null;
  active?: boolean;
};

type Override = {
  id: string;
  override_date: string;
  start_time: string;
  end_time: string;
  kind: "open" | "block";
  note?: string | null;
};

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function timeValue(
  value:
    | string
    | null
    | undefined
) {
  return value
    ? String(value).slice(0, 5)
    : "";
}

function initialSchedule(
  rules: Rule[]
) {
  return DAYS.map(
    (_, day) => {
      const found =
        rules.find(
          (rule) =>
            Number(
              rule.day_of_week
            ) === day
        );

      return {
        day_of_week:
          day,

        label:
          found?.label ||
          DAYS[day],

        is_available:
          Boolean(
            found?.is_available
          ),

        start_time:
          timeValue(
            found?.start_time
          ),

        end_time:
          timeValue(
            found?.end_time
          ),

        semester_name:
          found?.semester_name ||
          "",
      };
    }
  );
}

function sortOverrides(
  values: Override[]
) {
  return [
    ...values,
  ].sort((a, b) => {
    const date =
      a.override_date.localeCompare(
        b.override_date
      );

    if (date !== 0) {
      return date;
    }

    return a.start_time.localeCompare(
      b.start_time
    );
  });
}

export default function AvailabilityManager({
  rules,
  overrides,
}: {
  rules: Rule[];
  overrides: Override[];
}) {
  const [
    schedule,
    setSchedule,
  ] = useState(
    () =>
      initialSchedule(
        rules
      )
  );

  const [
    overrideDate,
    setOverrideDate,
  ] = useState("");

  const [
    overrideStart,
    setOverrideStart,
  ] = useState("");

  const [
    overrideEnd,
    setOverrideEnd,
  ] = useState("");

  const [
    overrideKind,
    setOverrideKind,
  ] = useState<
    "open" | "block"
  >("open");

  const [
    currentOverrides,
    setCurrentOverrides,
  ] = useState(
    sortOverrides(
      overrides
    )
  );

  const [
    savingSchedule,
    setSavingSchedule,
  ] = useState(false);

  const [
    savingOverride,
    setSavingOverride,
  ] = useState(false);

  const [
    removingOverride,
    setRemovingOverride,
  ] = useState<
    string | null
  >(null);

  const [
    error,
    setError,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const updateDay = (
    day: number,
    patch: Partial<
      (typeof schedule)[number]
    >
  ) => {
    setSchedule(
      (current) =>
        current.map(
          (item) =>
            item.day_of_week ===
            day
              ? {
                  ...item,
                  ...patch,
                }
              : item
        )
    );
  };

  const saveWorkingHours =
    async () => {
      setError("");
      setMessage("");

      for (
        const day of schedule
      ) {
        if (
          day.is_available
        ) {
          if (
            !day.start_time ||
            !day.end_time
          ) {
            setError(
              `${day.label}: please enter both start and end time.`
            );
            return;
          }

          if (
            day.start_time >=
            day.end_time
          ) {
            setError(
              `${day.label}: end time must be later than start time.`
            );
            return;
          }
        }
      }

      setSavingSchedule(
        true
      );

      try {
        const response =
          await fetch(
            "/api/admin/availability",
            {
              method: "POST",
              headers: {
                "content-type":
                  "application/json",
              },
              body: JSON.stringify({
                type: "schedule",
                rules:
                  schedule,
              }),
            }
          );

        const result =
          await response.json();

        if (
          !response.ok
        ) {
          throw new Error(
            result.error ||
              "Unable to save working hours."
          );
        }

        if (
          Array.isArray(
            result.rules
          )
        ) {
          const returned =
            result.rules;

          setSchedule(
            (current) =>
              current.map(
                (day) => {
                  const found =
                    returned.find(
                      (
                        rule: Rule
                      ) =>
                        Number(
                          rule.day_of_week
                        ) ===
                        day.day_of_week
                    );

                  return found
                    ? {
                        ...day,
                        ...found,
                        start_time:
                          timeValue(
                            found.start_time
                          ),
                        end_time:
                          timeValue(
                            found.end_time
                          ),
                      }
                    : day;
                }
              )
          );
        }

        setMessage(
          "Working hours saved successfully."
        );
      } catch (
        error: any
      ) {
        setError(
          error?.message ||
            "Unable to save working hours."
        );
      } finally {
        setSavingSchedule(
          false
        );
      }
    };

  const saveOverride =
    async () => {
      setError("");
      setMessage("");

      if (
        !overrideDate ||
        !overrideStart ||
        !overrideEnd
      ) {
        setError(
          "Please choose a date and enter both times."
        );
        return;
      }

      if (
        overrideStart >=
        overrideEnd
      ) {
        setError(
          "End time must be later than start time."
        );
        return;
      }

      setSavingOverride(
        true
      );

      try {
        const response =
          await fetch(
            "/api/admin/availability",
            {
              method: "POST",
              headers: {
                "content-type":
                  "application/json",
              },
              body: JSON.stringify({
                type: "override",
                date:
                  overrideDate,
                start:
                  overrideStart,
                end:
                  overrideEnd,
                kind:
                  overrideKind,
              }),
            }
          );

        const result =
          await response.json();

        if (
          !response.ok
        ) {
          throw new Error(
            result.error ||
              "Unable to save override."
          );
        }

        if (
          result.override
        ) {
          setCurrentOverrides(
            (current) =>
              sortOverrides([
                ...current,
                result.override,
              ])
          );
        }

        setOverrideDate("");
        setOverrideStart("");
        setOverrideEnd("");
        setOverrideKind(
          "open"
        );

        setMessage(
          "Availability override saved."
        );
      } catch (
        error: any
      ) {
        setError(
          error?.message ||
            "Unable to save override."
        );
      } finally {
        setSavingOverride(
          false
        );
      }
    };

  const removeOverride =
    async (
      id: string
    ) => {
      setError("");
      setMessage("");
      setRemovingOverride(
        id
      );

      try {
        const response =
          await fetch(
            `/api/admin/availability?id=${encodeURIComponent(
              id
            )}`,
            {
              method:
                "DELETE",
            }
          );

        const result =
          await response.json();

        if (
          !response.ok
        ) {
          throw new Error(
            result.error ||
              "Unable to remove override."
          );
        }

        setCurrentOverrides(
          (current) =>
            current.filter(
              (item) =>
                item.id !== id
            )
        );

        setMessage(
          "Override removed."
        );
      } catch (
        error: any
      ) {
        setError(
          error?.message ||
            "Unable to remove override."
        );
      } finally {
        setRemovingOverride(
          null
        );
      }
    };

  return (
    <div className="availability-admin">
      {/* WEEKLY WORKING HOURS */}
      <div className="card">
        <div className="kicker">
          Weekly schedule
        </div>

        <h2
          className="serif"
          style={{
            margin:
              "5px 0 8px",
          }}
        >
          Working hours
        </h2>

        <p className="muted">
          Set your normal semester
          working hours. Customers will
          only see time slots that fit
          within these hours.
        </p>

        <div
          className="working-hours-list"
          style={{
            marginTop: 20,
          }}
        >
          {schedule.map(
            (day) => (
              <div
                className="working-day"
                key={
                  day.day_of_week
                }
              >
                <div className="working-day-name">
                  <strong>
                    {
                      day.label
                    }
                  </strong>
                </div>

                <label className="availability-toggle">
                  <input
                    type="checkbox"
                    checked={
                      day.is_available
                    }
                    onChange={(
                      event
                    ) =>
                      updateDay(
                        day.day_of_week,
                        {
                          is_available:
                            event
                              .target
                              .checked,
                        }
                      )
                    }
                  />

                  <span>
                    {day.is_available
                      ? "Available"
                      : "Unavailable"}
                  </span>
                </label>

                {day.is_available ? (
                  <div className="working-times">
                    <input
                      type="time"
                      value={
                        day.start_time
                      }
                      onChange={(
                        event
                      ) =>
                        updateDay(
                          day.day_of_week,
                          {
                            start_time:
                              event
                                .target
                                .value,
                          }
                        )
                      }
                    />

                    <span className="muted">
                      to
                    </span>

                    <input
                      type="time"
                      value={
                        day.end_time
                      }
                      onChange={(
                        event
                      ) =>
                        updateDay(
                          day.day_of_week,
                          {
                            end_time:
                              event
                                .target
                                .value,
                          }
                        )
                      }
                    />
                  </div>
                ) : (
                  <span className="muted">
                    No customer appointments
                  </span>
                )}
              </div>
            )
          )}
        </div>

        {error && (
          <div
            className="notice"
            style={{
              marginTop: 18,
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            className="notice"
            style={{
              marginTop: 18,
            }}
          >
            {message}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent:
              "flex-end",
            marginTop: 22,
          }}
        >
          <button
            type="button"
            className="btn"
            disabled={
              savingSchedule
            }
            onClick={
              saveWorkingHours
            }
          >
            {savingSchedule
              ? "Saving…"
              : "Save working hours"}
          </button>
        </div>
      </div>

      {/* OVERRIDES */}
      <div className="card">
        <div className="kicker">
          Exceptions
        </div>

        <h2
          className="serif"
          style={{
            margin:
              "5px 0 8px",
          }}
        >
          Open extra time / block time
        </h2>

        <p className="muted">
          Use these for one-off changes
          to your normal schedule.
        </p>

        <div
          style={{
            display: "grid",
            gap: 12,
            marginTop: 20,
          }}
        >
          <div className="field">
            <label>
              Date
            </label>

            <input
              type="date"
              value={
                overrideDate
              }
              onChange={(event) =>
                setOverrideDate(
                  event.target
                    .value
                )
              }
            />
          </div>

          <div className="inline-grid">
            <div className="field">
              <label>
                Start time
              </label>

              <input
                type="time"
                value={
                  overrideStart
                }
                onChange={(event) =>
                  setOverrideStart(
                    event.target
                      .value
                  )
                }
              />
            </div>

            <div className="field">
              <label>
                End time
              </label>

              <input
                type="time"
                value={
                  overrideEnd
                }
                onChange={(event) =>
                  setOverrideEnd(
                    event.target
                      .value
                  )
                }
              />
            </div>
          </div>

          <div className="field">
            <label>
              Type
            </label>

            <select
              value={
                overrideKind
              }
              onChange={(event) =>
                setOverrideKind(
                  event.target
                    .value as
                    | "open"
                    | "block"
                )
              }
            >
              <option value="open">
                OPEN EXTRA TIME
              </option>

              <option value="block">
                BLOCK TIME
              </option>
            </select>
          </div>

          <button
            type="button"
            className="btn"
            disabled={
              savingOverride
            }
            onClick={
              saveOverride
            }
          >
            {savingOverride
              ? "Saving…"
              : "Save override"}
          </button>
        </div>
      </div>

      {/* OVERRIDES LIST */}
      <div className="card">
        <div className="kicker">
          Upcoming changes
        </div>

        <h2
          className="serif"
          style={{
            margin:
              "5px 0 18px",
          }}
        >
          Overrides
        </h2>

        {currentOverrides.length ? (
          <div className="override-list">
            {currentOverrides.map(
              (item) => (
                <div
                  className="override-row"
                  key={item.id}
                >
                  <div>
                    <strong>
                      {
                        item.override_date
                      }
                    </strong>

                    <div className="muted">
                      {
                        item.start_time
                          .slice(
                            0,
                            5
                          )
                      }{" "}
                      –{" "}
                      {
                        item.end_time
                          .slice(
                            0,
                            5
                          )
                      }
                    </div>
                  </div>

                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: 10,
                    }}
                  >
                    <span className="status-pill">
                      {item.kind ===
                      "open"
                        ? "OPEN"
                        : "BLOCKED"}
                    </span>

                    <button
                      type="button"
                      className="btn secondary small"
                      disabled={
                        removingOverride ===
                        item.id
                      }
                      onClick={() =>
                        removeOverride(
                          item.id
                        )
                      }
                    >
                      {removingOverride ===
                      item.id
                        ? "Removing…"
                        : "Remove"}
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        ) : (
          <p className="muted">
            No date-specific overrides yet.
          </p>
        )}
      </div>

      <style jsx>{`
        .working-hours-list {
          display: grid;
          gap: 0;
        }

        .working-day {
          display: grid;
          grid-template-columns:
            minmax(120px, 0.8fr)
            minmax(130px, 0.8fr)
            minmax(200px, 1fr);
          gap: 16px;
          align-items: center;
          padding: 15px 0;
          border-top: 1px solid var(--line);
        }

        .working-day:first-child {
          border-top: 0;
        }

        .working-day-name strong {
          font-size: 13px;
        }

        .availability-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          font-size: 12px;
        }

        .working-times {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .working-times input {
          width: 100%;
          min-width: 0;
        }

        .override-list {
          display: grid;
        }

        .override-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 13px 0;
          border-top: 1px solid var(--line);
        }

        @media (max-width: 760px) {
          .working-day {
            grid-template-columns: 1fr;
            gap: 9px;
          }

          .working-times {
            width: 100%;
          }

          .override-row {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}