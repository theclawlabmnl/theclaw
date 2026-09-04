"use client";

import { useState } from "react";

type Rule = {
  id?: string;
  label: string;
  day_of_week: number;
  is_available: boolean;
  start_time: string | null;
  end_time: string | null;
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

function timeValue(value: string | null | undefined) {
  return value ? value.slice(0, 5) : "";
}

function initialSchedule(rules: Rule[]) {
  return DAYS.map((label, index) => {
    const rule = rules.find(
      (item) => item.day_of_week === index
    );

    return {
      day_of_week: index,
      label,
      is_available: rule?.is_available ?? false,
      start_time: timeValue(rule?.start_time),
      end_time: timeValue(rule?.end_time),
    };
  });
}

function sortOverrides(items: Override[]) {
  return [...items].sort((a, b) => {
    const dateCompare =
      a.override_date.localeCompare(b.override_date);

    if (dateCompare !== 0) {
      return dateCompare;
    }

    return a.start_time.localeCompare(b.start_time);
  });
}

export default function AvailabilityManager({
  rules,
  overrides,
}: {
  rules: Rule[];
  overrides: Override[];
}) {
  const [schedule, setSchedule] = useState(() =>
    initialSchedule(rules)
  );

  const [overrideDate, setOverrideDate] = useState("");
  const [overrideStart, setOverrideStart] = useState("");
  const [overrideEnd, setOverrideEnd] = useState("");
  const [overrideKind, setOverrideKind] = useState<
    "open" | "block"
  >("block");

  const [currentOverrides, setCurrentOverrides] =
    useState<Override[]>(sortOverrides(overrides));

  const [savingSchedule, setSavingSchedule] =
    useState(false);

  const [savingOverride, setSavingOverride] =
    useState(false);

  const [removingOverride, setRemovingOverride] =
    useState<string | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function updateDay(
    dayIndex: number,
    field:
      | "is_available"
      | "start_time"
      | "end_time",
    value: boolean | string
  ) {
    setSchedule((current) =>
      current.map((day) =>
        day.day_of_week === dayIndex
          ? {
              ...day,
              [field]: value,
            }
          : day
      )
    );
  }

  async function saveWorkingHours() {
    setError("");
    setMessage("");

    for (const day of schedule) {
      if (!day.is_available) continue;

      if (!day.start_time || !day.end_time) {
        setError(
          `${day.label} needs both a start and end time.`
        );
        return;
      }

      if (day.end_time <= day.start_time) {
        setError(
          `${day.label} must end after it starts.`
        );
        return;
      }
    }

    setSavingSchedule(true);

    try {
      const response = await fetch(
        "/api/admin/availability",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "schedule",
            rules: schedule,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to save working hours."
        );
      }

      if (Array.isArray(data?.rules)) {
        setSchedule(initialSchedule(data.rules));
      }

      setMessage("Working hours saved.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save working hours."
      );
    } finally {
      setSavingSchedule(false);
    }
  }

  async function saveOverride() {
    setError("");
    setMessage("");

    if (
      !overrideDate ||
      !overrideStart ||
      !overrideEnd
    ) {
      setError(
        "Please enter a date, start time, and end time."
      );
      return;
    }

    if (overrideEnd <= overrideStart) {
      setError("End time must be after start time.");
      return;
    }

    setSavingOverride(true);

    try {
      const response = await fetch(
        "/api/admin/availability",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "override",
            date: overrideDate,
            start: overrideStart,
            end: overrideEnd,
            kind: overrideKind,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to save override."
        );
      }

      if (data?.override) {
        setCurrentOverrides((current) =>
          sortOverrides([
            ...current,
            data.override,
          ])
        );
      }

      setOverrideDate("");
      setOverrideStart("");
      setOverrideEnd("");

      setMessage("Availability override saved.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save override."
      );
    } finally {
      setSavingOverride(false);
    }
  }

  async function removeOverride(id: string) {
    setError("");
    setMessage("");
    setRemovingOverride(id);

    try {
      const response = await fetch(
        `/api/admin/availability?id=${encodeURIComponent(
          id
        )}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to remove override."
        );
      }

      setCurrentOverrides((current) =>
        current.filter((item) => item.id !== id)
      );

      setMessage("Override removed.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to remove override."
      );
    } finally {
      setRemovingOverride(null);
    }
  }

  return (
    <div className="availability-admin">
      <section className="card availability-card">
        <div className="section-top">
          <div>
            <h2 className="serif">
              Weekly Working Hours
            </h2>

            <p className="muted">
              Set your normal schedule.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary save-hours"
            onClick={saveWorkingHours}
            disabled={savingSchedule}
          >
            {savingSchedule
              ? "Saving..."
              : "Save Hours"}
          </button>
        </div>

        <div className="schedule">
          {schedule.map((day) => (
            <div
              className="day-row"
              key={day.day_of_week}
            >
              <div className="day-main">
                <strong>{day.label}</strong>

                <label className="availability">
                  <input
                    type="checkbox"
                    checked={day.is_available}
                    onChange={(event) =>
                      updateDay(
                        day.day_of_week,
                        "is_available",
                        event.target.checked
                      )
                    }
                  />

                  <span>
                    {day.is_available
                      ? "Available"
                      : "Unavailable"}
                  </span>
                </label>
              </div>

              <div className="hours">
                <div className="hour">
                  <label>Start</label>

                  <input
                    type="time"
                    value={day.start_time}
                    disabled={!day.is_available}
                    onChange={(event) =>
                      updateDay(
                        day.day_of_week,
                        "start_time",
                        event.target.value
                      )
                    }
                  />
                </div>

                <span className="to">
                  to
                </span>

                <div className="hour">
                  <label>End</label>

                  <input
                    type="time"
                    value={day.end_time}
                    disabled={!day.is_available}
                    onChange={(event) =>
                      updateDay(
                        day.day_of_week,
                        "end_time",
                        event.target.value
                      )
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card availability-card">
        <div className="section-top">
          <div>
            <h2 className="serif">
              Availability Overrides
            </h2>

            <p className="muted">
              Open or block a specific date and time.
            </p>
          </div>
        </div>

        <div className="override-form-desktop">
          <div className="field">
            <label htmlFor="override-date-desktop">
              Date
            </label>

            <input
              id="override-date-desktop"
              type="date"
              value={overrideDate}
              onChange={(event) =>
                setOverrideDate(event.target.value)
              }
            />
          </div>

          <div className="field">
            <label htmlFor="override-start-desktop">
              Start
            </label>

            <input
              id="override-start-desktop"
              type="time"
              value={overrideStart}
              onChange={(event) =>
                setOverrideStart(event.target.value)
              }
            />
          </div>

          <div className="field">
            <label htmlFor="override-end-desktop">
              End
            </label>

            <input
              id="override-end-desktop"
              type="time"
              value={overrideEnd}
              onChange={(event) =>
                setOverrideEnd(event.target.value)
              }
            />
          </div>

          <div className="field">
            <label htmlFor="override-kind-desktop">
              Type
            </label>

            <select
              id="override-kind-desktop"
              value={overrideKind}
              onChange={(event) =>
                setOverrideKind(
                  event.target.value as
                    | "open"
                    | "block"
                )
              }
            >
              <option value="block">
                Block
              </option>

              <option value="open">
                Open
              </option>
            </select>
          </div>

          <div className="field">
            <label
              className="desktop-action-label"
              aria-hidden="true"
            >
              Action
            </label>

            <button
              type="button"
              className="btn btn-primary add-override"
              onClick={saveOverride}
              disabled={savingOverride}
            >
              {savingOverride
                ? "Saving..."
                : "Add Override"}
            </button>
          </div>
        </div>

        <div className="override-form-mobile">
          <div className="field mobile-date-field">
            <label htmlFor="override-date-mobile">
              Date
            </label>

            <input
              id="override-date-mobile"
              type="date"
              value={overrideDate}
              onChange={(event) =>
                setOverrideDate(event.target.value)
              }
            />
          </div>

          <div className="mobile-time-row">
            <div className="field">
              <label htmlFor="override-start-mobile">
                Start
              </label>

              <input
                id="override-start-mobile"
                type="time"
                value={overrideStart}
                onChange={(event) =>
                  setOverrideStart(event.target.value)
                }
              />
            </div>

            <span
              className="mobile-to"
              aria-hidden="true"
            >
              to
            </span>

            <div className="field">
              <label htmlFor="override-end-mobile">
                End
              </label>

              <input
                id="override-end-mobile"
                type="time"
                value={overrideEnd}
                onChange={(event) =>
                  setOverrideEnd(event.target.value)
                }
              />
            </div>
          </div>

          <div className="field mobile-type-field">
            <label htmlFor="override-kind-mobile">
              Type
            </label>

            <select
              id="override-kind-mobile"
              value={overrideKind}
              onChange={(event) =>
                setOverrideKind(
                  event.target.value as
                    | "open"
                    | "block"
                )
              }
            >
              <option value="block">
                Block
              </option>

              <option value="open">
                Open
              </option>
            </select>
          </div>

          <button
            type="button"
            className="btn btn-primary add-override mobile-add-override"
            onClick={saveOverride}
            disabled={savingOverride}
          >
            {savingOverride
              ? "Saving..."
              : "Add Override"}
          </button>
        </div>

        {currentOverrides.length > 0 && (
          <div className="override-list">
            {currentOverrides.map((item) => (
              <div
                className="override-row"
                key={item.id}
              >
                <div className="override-info">
                  <strong>
                    {item.override_date}
                  </strong>

                  <span>
                    {timeValue(item.start_time)} –{" "}
                    {timeValue(item.end_time)}
                  </span>

                  <span className="kind">
                    {item.kind === "block"
                      ? "Blocked"
                      : "Open"}
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary remove"
                  onClick={() =>
                    removeOverride(item.id)
                  }
                  disabled={
                    removingOverride === item.id
                  }
                >
                  {removingOverride === item.id
                    ? "Removing..."
                    : "Remove"}
                </button>
              </div>
            ))}
          </div>
        )}

        {currentOverrides.length === 0 && (
          <p className="muted empty">
            No availability overrides yet.
          </p>
        )}
      </section>

      {(error || message) && (
        <div
          className={`message ${
            error ? "error" : "success"
          }`}
        >
          {error || message}
        </div>
      )}

      <style jsx>{`
        .availability-admin {
          width: 100%;
          max-width: 100%;
          display: grid;
          gap: 20px;
          box-sizing: border-box;
        }

        .availability-card {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          padding: 20px;
        }

        .section-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }

        .section-top h2 {
          margin: 0 0 3px;
          font-size: 21px;
        }

        .section-top p {
          margin: 0;
          font-size: 13px;
        }

        .save-hours {
          flex: 0 0 auto;
          height: 36px;
          padding: 7px 14px;
          font-size: 12px;
        }

        .schedule {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          border-top: 1px solid var(--line);
        }

        .day-row {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
          display: grid;
          grid-template-columns:
            minmax(150px, 0.8fr)
            minmax(260px, 1fr);
          align-items: center;
          gap: 20px;
          padding: 11px 2px;
          border-bottom: 1px solid var(--line);
        }

        .day-main {
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .day-main strong {
          font-size: 14px;
          white-space: nowrap;
        }

        .availability {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          flex: 0 0 auto;
          font-size: 12px;
          white-space: nowrap;
        }

        .availability input {
          width: 15px;
          height: 15px;
          margin: 0;
        }

        /*
          SAME TIME LAYOUT USED EVERYWHERE
        */

        .hours {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            36px
            minmax(0, 1fr);
          align-items: end;
          gap: 10px;
          min-width: 0;
          width: 100%;
          max-width: 420px;
          box-sizing: border-box;
        }

        .hour {
          min-width: 0;
          width: 100%;
          max-width: 100%;
          display: grid;
          gap: 3px;
          box-sizing: border-box;
        }

        .hour label,
        .field label {
          font-size: 10px;
          color: var(--muted);
          line-height: 1;
        }

        .hour input {
          display: block;
          width: 100%;
          min-width: 0;
          max-width: 100%;
          height: 34px;
          box-sizing: border-box;
          padding: 5px 7px;
          font-size: 13px;
        }

        .to {
          align-self: end;
          width: 36px;
          margin-bottom: 8px;
          text-align: center;
          font-size: 11px;
          color: var(--muted);
          white-space: nowrap;
          box-sizing: border-box;
        }

        /*
          OVERRIDES
        */

        .field {
          min-width: 0;
          display: grid;
          gap: 4px;
          box-sizing: border-box;
        }

        .field label {
          font-size: 10px;
          color: var(--muted);
          line-height: 1;
        }

        .override-form-desktop {
          display: grid;
          grid-template-columns:
            repeat(5, minmax(0, 1fr));
          align-items: end;
          gap: 12px;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        .override-form-desktop .field {
          grid-template-rows: 12px 36px;
        }

        .override-form-desktop input,
        .override-form-desktop select,
        .override-form-desktop .add-override {
          width: 100%;
          min-width: 0;
          max-width: 100%;
          height: 36px;
          min-height: 36px;
          max-height: 36px;
          margin: 0;
          box-sizing: border-box;
        }

        .override-form-desktop input,
        .override-form-desktop select {
          padding: 6px 8px;
          font-size: 13px;
        }

        .override-form-desktop .add-override {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-width: 0;
          max-width: 100%;
          height: 36px;
          min-height: 36px;
          max-height: 36px;
          margin: 0;
          padding: 6px 8px;
          border-width: 1px;
          box-sizing: border-box;
          white-space: nowrap;
          font-size: 12px;
          line-height: 1;
          transform: translateY(-14px);
        }

        .override-form-desktop .field:last-child {
          grid-template-rows: 12px 36px;
          align-items: end;
        }

        .desktop-action-label {
          display: block;
          height: 12px;
          min-height: 12px;
          margin: 0;
          line-height: 12px;
          visibility: hidden;
        }

        .override-form-mobile {
          display: none;
        }

        .override-list {
          margin-top: 16px;
          border-top: 1px solid var(--line);
        }

        .override-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 9px 0;
          border-bottom: 1px solid var(--line);
        }

        .override-info {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          min-width: 0;
          font-size: 12px;
        }

        .override-info span:not(.kind) {
          color: var(--muted);
        }

        .kind {
          padding: 3px 7px;
          border: 1px solid var(--line);
          border-radius: 999px;
          font-size: 10px;
          white-space: nowrap;
        }

        .remove {
          flex: 0 0 auto;
          height: 31px;
          padding: 5px 10px;
          font-size: 11px;
        }

        .empty {
          margin: 12px 0 0;
          font-size: 12px;
        }

        .message {
          padding: 9px 11px;
          border: 1px solid var(--line);
          border-radius: 8px;
          font-size: 12px;
        }

        .error {
          border-color: #e1b7b7;
        }

        @media (max-width: 850px) {
          .day-row {
            grid-template-columns:
              minmax(130px, 0.8fr)
              minmax(240px, 1fr);
            gap: 14px;
          }

          .hours {
            max-width: 380px;
          }
        }

        @media (max-width: 700px) {
          .availability-card {
            padding: 16px;
          }

          .day-row {
            display: block;
            padding: 11px 0;
          }

          .day-main {
            margin-bottom: 8px;
          }

          .hours {
            width: 100%;
            max-width: 330px;
            grid-template-columns:
              minmax(0, 1fr)
              38px
              minmax(0, 1fr);
            gap: 10px;
          }

          .hour input {
            height: 32px;
            font-size: 12px;
          }

          .to {
            width: 38px;
            margin-bottom: 8px;
          }

          .override-form-desktop {
            display: none;
          }

          .override-form-mobile {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 14px;
            width: 100%;
          }

          .override-form-mobile .field {
            width: 100%;
          }

          .mobile-date-field {
            width: 330px !important;
            max-width: 100%;
          }

          .override-form-mobile input,
          .override-form-mobile select {
            width: 100%;
            min-width: 0;
            max-width: 100%;
            height: 36px;
            box-sizing: border-box;
            padding: 6px 8px;
            font-size: 13px;
          }

          .mobile-time-row {
            display: grid;
            grid-template-columns:
              minmax(0, 1fr)
              38px
              minmax(0, 1fr);
            align-items: end;
            gap: 10px;
            width: 330px;
            max-width: 100%;
          }

          .mobile-time-row .field {
            grid-template-rows: 12px 36px;
          }

          .mobile-time-row .field:last-child {
            transform: translateY(-14px);
          }

          .mobile-time-row input {
            height: 36px;
          }

          .mobile-to {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 36px;
            margin: 0;
            color: var(--muted);
            font-size: 11px;
            line-height: 1;
          }

          .mobile-type-field {
            width: 120px !important;
            max-width: 120px;
          }

          .mobile-add-override {
            width: 100%;
            height: 36px;
            box-sizing: border-box;
          }
        }

        @media (max-width: 430px) {
          .availability-card {
            padding: 14px;
          }

          .section-top {
            flex-direction: column;
            align-items: flex-start;
            gap: 9px;
          }

          .save-hours {
            align-self: flex-start;
          }

          .hours {
            max-width: 300px;
            grid-template-columns:
              minmax(0, 1fr)
              38px
              minmax(0, 1fr);
            gap: 10px;
          }

          .mobile-date-field,
          .mobile-time-row {
            width: 300px !important;
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}