import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

type DayAvailability = {
  date: string;
  available: boolean;
  slots: string[];
};

function toMinutes(
  value: string | null | undefined
): number | null {
  if (!value) {
    return null;
  }

  const [
    hoursRaw,
    minutesRaw,
  ] = String(value)
    .slice(0, 5)
    .split(":");

  const hours =
    Number(hoursRaw);

  const minutes =
    Number(minutesRaw);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return null;
  }

  return (
    hours * 60 +
    minutes
  );
}

function formatTime(
  minutes: number
) {
  const hours24 =
    Math.floor(
      minutes / 60
    );

  const mins =
    minutes % 60;

  const suffix =
    hours24 >= 12
      ? "PM"
      : "AM";

  const hours12 =
    hours24 % 12 || 12;

  return `${hours12}:${String(
    mins
  ).padStart(
    2,
    "0"
  )} ${suffix}`;
}

function dateKey(
  date: Date
) {
  const year =
    date.getUTCFullYear();

  const month =
    String(
      date.getUTCMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getUTCDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDayOfWeek(
  value: string
) {
  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

  return new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  ).getUTCDay();
}

function overlaps(
  startA: number,
  endA: number,
  startB: number,
  endB: number
) {
  return (
    startA < endB &&
    endA > startB
  );
}

type Window = [
  number,
  number
];

function buildWindows(
  rule: any,
  overrides: any[]
): Window[] {
  let windows: Window[] =
    [];

  if (
    rule?.is_available &&
    rule.start_time &&
    rule.end_time
  ) {
    const start =
      toMinutes(
        rule.start_time
      );

    const end =
      toMinutes(
        rule.end_time
      );

    if (
      start !== null &&
      end !== null &&
      end > start
    ) {
      windows.push([
        start,
        end,
      ]);
    }
  }

  /*
   * OPEN EXTRA TIME
   */
  overrides.forEach(
    (override) => {
      if (
        override.kind !==
        "open"
      ) {
        return;
      }

      const start =
        toMinutes(
          override.start_time
        );

      const end =
        toMinutes(
          override.end_time
        );

      if (
        start !== null &&
        end !== null &&
        end > start
      ) {
        windows.push([
          start,
          end,
        ]);
      }
    }
  );

  /*
   * BLOCK TIME
   */
  overrides.forEach(
    (override) => {
      if (
        override.kind !==
        "block"
      ) {
        return;
      }

      const blockStart =
        toMinutes(
          override.start_time
        );

      const blockEnd =
        toMinutes(
          override.end_time
        );

      if (
        blockStart ===
          null ||
        blockEnd ===
          null ||
        blockEnd <=
          blockStart
      ) {
        return;
      }

      const nextWindows: Window[] =
        [];

      windows.forEach(
        ([
          start,
          end,
        ]) => {
          if (
            blockEnd <=
              start ||
            blockStart >=
              end
          ) {
            nextWindows.push([
              start,
              end,
            ]);

            return;
          }

          if (
            blockStart >
            start
          ) {
            nextWindows.push([
              start,
              Math.min(
                blockStart,
                end
              ),
            ]);
          }

          if (
            blockEnd <
            end
          ) {
            nextWindows.push([
              Math.max(
                blockEnd,
                start
              ),
              end,
            ]);
          }
        }
      );

      windows =
        nextWindows;
    }
  );

  /*
   * Merge overlapping windows.
   */
  return windows
    .filter(
      ([start, end]) =>
        end > start
    )
    .sort(
      (a, b) =>
        a[0] - b[0]
    )
    .reduce(
      (
        merged: Window[],
        window
      ) => {
        const last =
          merged[
            merged.length -
              1
          ];

        if (
          last &&
          window[0] <=
            last[1]
        ) {
          last[1] =
            Math.max(
              last[1],
              window[1]
            );
        } else {
          merged.push([
            window[0],
            window[1],
          ]);
        }

        return merged;
      },
      []
    );
}

async function getDataForRange(
  db: ReturnType<
    typeof supabaseAdmin
  >,
  startDate: string,
  endDate: string
) {
  const [
    rulesResult,
    overridesResult,
    bookingsResult,
  ] =
    await Promise.all([
      db
        .from(
          "availability_rules"
        )
        .select(
          "day_of_week,is_available,start_time,end_time,active"
        )
        .eq(
          "active",
          true
        ),

      db
        .from(
          "availability_overrides"
        )
        .select(
          "override_date,start_time,end_time,kind"
        )
        .gte(
          "override_date",
          startDate
        )
        .lte(
          "override_date",
          endDate
        ),

      db
        .from(
          "bookings"
        )
        .select(
          "id,preferred_date,preferred_time,status"
        )
        .gte(
          "preferred_date",
          startDate
        )
        .lte(
          "preferred_date",
          endDate
        )
        .in(
          "status",
          [
            "pending",
            "approved",
            "payment_submitted",
            "confirmed",
          ]
        ),
    ]);

  if (
    rulesResult.error
  ) {
    throw rulesResult.error;
  }

  if (
    overridesResult.error
  ) {
    throw overridesResult.error;
  }

  if (
    bookingsResult.error
  ) {
    throw bookingsResult.error;
  }

  const bookings =
    bookingsResult.data ||
    [];

  const bookingIds =
    bookings.map(
      (booking) =>
        booking.id
    );

  let bookingServices:
    Array<{
      booking_id: string;
      duration_minutes:
        | number
        | null;
    }> = [];

  if (
    bookingIds.length
  ) {
    const result =
      await db
        .from(
          "booking_services"
        )
        .select(
          "booking_id,duration_minutes"
        )
        .in(
          "booking_id",
          bookingIds
        );

    if (
      result.error
    ) {
      throw result.error;
    }

    bookingServices =
      result.data || [];
  }

  const durationByBooking =
    new Map<
      string,
      number
    >();

  bookingServices.forEach(
    (row) => {
      durationByBooking.set(
        row.booking_id,
        (
          durationByBooking.get(
            row.booking_id
          ) || 0
        ) +
          Number(
            row.duration_minutes ||
              0
          )
      );
    }
  );

  return {
    rules:
      rulesResult.data ||
      [],
    overrides:
      overridesResult.data ||
      [],
    bookings,
    durationByBooking,
  };
}

function slotsForDate({
  date,
  rule,
  overrides,
  bookings,
  durationByBooking,
  duration,
}: {
  date: string;
  rule: any;
  overrides: any[];
  bookings: any[];
  durationByBooking: Map<
    string,
    number
  >;
  duration: number;
}) {
  const windows =
    buildWindows(
      rule,
      overrides
    );

  const bookingsForDay =
    bookings.filter(
      (booking) =>
        booking.preferred_date ===
        date
    );

  const requiredDuration =
    Math.max(
      30,
      duration
    );

  const slots: string[] =
    [];

  /*
   * 30-minute increments keep
   * extra availability such as
   * 3:30 PM–8:00 PM usable.
   */
  windows.forEach(
    ([
      start,
      end,
    ]) => {
      for (
        let cursor =
          start;
        cursor +
          requiredDuration <=
          end;
        cursor +=
          30
      ) {
        const requestedEnd =
          cursor +
          requiredDuration;

        const blocked =
          bookingsForDay.some(
            (booking) => {
              const existingStart =
                toMinutes(
                  booking.preferred_time
                );

              if (
                existingStart ===
                null
              ) {
                return false;
              }

              const existingDuration =
                Math.max(
                  30,
                  durationByBooking.get(
                    booking.id
                  ) || 60
                );

              const existingEnd =
                existingStart +
                existingDuration;

              return overlaps(
                cursor,
                requestedEnd,
                existingStart,
                existingEnd
              );
            }
          );

        if (
          !blocked
        ) {
          slots.push(
            formatTime(
              cursor
            )
          );
        }
      }
    }
  );

  return slots.filter(
    (
      value,
      index,
      array
    ) =>
      array.indexOf(
        value
      ) === index
  );
}

export async function GET(
  request: NextRequest
) {
  try {
    const db =
      supabaseAdmin();

    const url =
      new URL(
        request.url
      );

    const date =
      url.searchParams.get(
        "date"
      );

    const month =
      url.searchParams.get(
        "month"
      );

    const durationRaw =
      Number(
        url.searchParams.get(
          "duration"
        ) || 60
      );

    const duration =
      Number.isFinite(
        durationRaw
      )
        ? Math.max(
            30,
            durationRaw
          )
        : 60;

    /*
     * Backwards-compatible
     * single-date response.
     */
    if (date) {
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          date
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid date.",
          },
          {
            status: 400,
          }
        );
      }

      const {
        rules,
        overrides,
        bookings,
        durationByBooking,
      } =
        await getDataForRange(
          db,
          date,
          date
        );

      const dayOfWeek =
        getDayOfWeek(
          date
        );

      const rule =
        rules.find(
          (item) =>
            item.day_of_week ===
            dayOfWeek
        ) ||
        null;

      const dateOverrides =
        overrides.filter(
          (item) =>
            item.override_date ===
            date
        );

      const slots =
        slotsForDate({
          date,
          rule,
          overrides:
            dateOverrides,
          bookings,
          durationByBooking,
          duration,
        });

      return NextResponse.json({
        rule,
        overrides:
          dateOverrides,
        booked:
          bookings.filter(
            (booking) =>
              booking.preferred_date ===
              date
          ),
        slots,
        available:
          slots.length >
          0,
      });
    }

    /*
     * Monthly calendar response.
     */
    if (!month) {
      return NextResponse.json(
        {
          error:
            "date or month required",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !/^\d{4}-\d{2}$/.test(
        month
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid month.",
        },
        {
          status: 400,
        }
      );
    }

    const [
      year,
      monthNumber,
    ] = month
      .split("-")
      .map(Number);

    const start =
      new Date(
        Date.UTC(
          year,
          monthNumber - 1,
          1
        )
      );

    const end =
      new Date(
        Date.UTC(
          year,
          monthNumber,
          0
        )
      );

    const startDate =
      dateKey(start);

    const endDate =
      dateKey(end);

    const {
      rules,
      overrides,
      bookings,
      durationByBooking,
    } =
      await getDataForRange(
        db,
        startDate,
        endDate
      );

    const days: Array<DayAvailability> =
      [];

    for (
      let current = new Date(
        start
      );
      current <=
      end;
      current.setUTCDate(
        current.getUTCDate() +
          1
      )
    ) {
      const currentKey =
        dateKey(
          current
        );

      const dayOfWeek =
        current.getUTCDay();

      const rule =
        rules.find(
          (item) =>
            item.day_of_week ===
            dayOfWeek
        ) ||
        null;

      const dateOverrides =
        overrides.filter(
          (item) =>
            item.override_date ===
            currentKey
        );

      const slots =
        slotsForDate({
          date:
            currentKey,
          rule,
          overrides:
            dateOverrides,
          bookings,
          durationByBooking,
          duration,
        });

      days.push({
        date:
          currentKey,
        available:
          slots.length >
          0,
        slots,
      });
    }

    return NextResponse.json({
      month,
      duration,
      days,
    });
  } catch (
    error: any
  ) {
    console.error(
      "Availability API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to load availability.",
      },
      {
        status: 500,
      }
    );
  }
}
