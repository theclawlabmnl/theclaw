import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

function parseDate(
  value: string
) {
  const parts =
    value.split("-").map(Number);

  if (
    parts.length !== 3 ||
    parts.some(
      (part) =>
        !Number.isFinite(part)
    )
  ) {
    return null;
  }

  const [
    year,
    month,
    day,
  ] = parts;

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function getDayOfWeek(
  value: string
) {
  const date =
    parseDate(value);

  if (!date) {
    return -1;
  }

  return date.getUTCDay();
}

function makeDates(
  from: string,
  to: string
) {
  const start =
    parseDate(from);

  const end =
    parseDate(to);

  if (!start || !end) {
    return [];
  }

  const result: string[] = [];

  for (
    const current =
      new Date(start);
    current <= end;
    current.setUTCDate(
      current.getUTCDate() + 1
    )
  ) {
    result.push(
      current
        .toISOString()
        .slice(0, 10)
    );
  }

  return result;
}

function timeToMinutes(
  value: string | null | undefined
) {
  if (!value) {
    return null;
  }

  const parts =
    String(value)
      .slice(0, 5)
      .split(":")
      .map(Number);

  if (
    parts.length !== 2 ||
    !Number.isFinite(parts[0]) ||
    !Number.isFinite(parts[1])
  ) {
    return null;
  }

  return (
    parts[0] * 60 +
    parts[1]
  );
}

function minutesToTime(
  minutes: number
) {
  const hours =
    Math.floor(minutes / 60);

  const mins =
    minutes % 60;

  return `${String(hours).padStart(
    2,
    "0"
  )}:${String(mins).padStart(
    2,
    "0"
  )}`;
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

function subtractBlockedTime(
  windows: Array<
    [number, number]
  >,
  blockStart: number,
  blockEnd: number
) {
  const result: Array<
    [number, number]
  > = [];

  for (const [
    start,
    end,
  ] of windows) {
    if (
      blockEnd <= start ||
      blockStart >= end
    ) {
      result.push([
        start,
        end,
      ]);
      continue;
    }

    if (
      blockStart > start
    ) {
      result.push([
        start,
        Math.min(
          blockStart,
          end
        ),
      ]);
    }

    if (
      blockEnd < end
    ) {
      result.push([
        Math.max(
          blockEnd,
          start
        ),
        end,
      ]);
    }
  }

  return result.filter(
    ([start, end]) =>
      end > start
  );
}

function buildSlots({
  rule,
  overrides,
  bookings,
  duration,
}: {
  rule: any;
  overrides: any[];
  bookings: Array<{
    preferred_time: string;
    duration_minutes: number;
  }>;
  duration: number;
}) {
  let windows: Array<
    [number, number]
  > = [];

  /*
   * NORMAL WORKING HOURS
   */
  if (
    rule?.is_available &&
    rule.start_time &&
    rule.end_time
  ) {
    const start =
      timeToMinutes(
        rule.start_time
      );

    const end =
      timeToMinutes(
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
  for (const override of overrides) {
    if (
      override.kind !==
      "open"
    ) {
      continue;
    }

    const start =
      timeToMinutes(
        override.start_time
      );

    const end =
      timeToMinutes(
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

  /*
   * BLOCK TIME
   */
  for (const override of overrides) {
    if (
      override.kind !==
      "block"
    ) {
      continue;
    }

    const start =
      timeToMinutes(
        override.start_time
      );

    const end =
      timeToMinutes(
        override.end_time
      );

    if (
      start !== null &&
      end !== null &&
      end > start
    ) {
      windows =
        subtractBlockedTime(
          windows,
          start,
          end
        );
    }
  }

  /*
   * Merge overlapping windows.
   */
  windows.sort(
    (a, b) =>
      a[0] - b[0]
  );

  const merged: Array<
    [number, number]
  > = [];

  for (const window of windows) {
    const previous =
      merged[
        merged.length - 1
      ];

    if (
      previous &&
      window[0] <=
        previous[1]
    ) {
      previous[1] =
        Math.max(
          previous[1],
          window[1]
        );
    } else {
      merged.push([
        window[0],
        window[1],
      ]);
    }
  }

  if (!merged.length) {
    return [];
  }

  /*
   * Existing booked appointments.
   */
  const booked =
    bookings.map(
      (booking) => {
        const start =
          timeToMinutes(
            booking.preferred_time
          );

        const length =
          Math.max(
            30,
            Number(
              booking.duration_minutes
            ) || 60
          );

        return {
          start:
            start ?? 0,

          end:
            (start ?? 0) +
            length,
        };
      }
    );

  const available =
    new Set<string>();

  /*
   * Slots every 30 minutes.
   */
  for (const [
    windowStart,
    windowEnd,
  ] of merged) {
    for (
      let start =
        windowStart;

      start + duration <=
        windowEnd;

      start += 30
    ) {
      const end =
        start +
        duration;

      const conflict =
        booked.some(
          (booking) =>
            overlaps(
              start,
              end,
              booking.start,
              booking.end
            )
        );

      if (
        !conflict
      ) {
        available.add(
          minutesToTime(
            start
          )
        );
      }
    }
  }

  return Array.from(
    available
  ).sort();
}

export async function GET(
  request: NextRequest
) {
  try {
    const params =
      new URL(
        request.url
      ).searchParams;

    /*
     * Supports BOTH:
     *
     * /api/availability?date=2026-08-31
     *
     * and:
     *
     * /api/availability?from=2026-08-01&to=2026-08-31&duration=60
     */
    const singleDate =
      params.get(
        "date"
      );

    const from =
      params.get(
        "from"
      ) || singleDate;

    const to =
      params.get(
        "to"
      ) || singleDate;

    const duration =
      Math.max(
        30,
        Number(
          params.get(
            "duration"
          ) || 60
        )
      );

    if (
      !from ||
      !to
    ) {
      return NextResponse.json(
        {
          error:
            "Missing availability date.",
        },
        {
          status: 400,
        }
      );
    }

    const dates =
      makeDates(
        from,
        to
      );

    if (
      !dates.length ||
      dates.length > 62
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid availability date range.",
        },
        {
          status: 400,
        }
      );
    }

    const db =
      supabaseAdmin();

    const [
      rulesResult,
      overridesResult,
      bookingsResult,
    ] = await Promise.all([
      db
        .from(
          "availability_rules"
        )
        .select(
          "id,label,day_of_week,is_available,start_time,end_time,semester_name,active"
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
          "id,override_date,start_time,end_time,kind,note"
        )
        .gte(
          "override_date",
          from
        )
        .lte(
          "override_date",
          to
        ),

      db
        .from("bookings")
        .select(
          "id,preferred_date,preferred_time"
        )
        .gte(
          "preferred_date",
          from
        )
        .lte(
          "preferred_date",
          to
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

    const durationMap =
      new Map<
        string,
        number
      >();

    if (
      bookingIds.length
    ) {
      const serviceResult =
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
        !serviceResult.error
      ) {
        for (
          const item of
            serviceResult.data ||
            []
        ) {
          const current =
            durationMap.get(
              item.booking_id
            ) || 0;

          durationMap.set(
            item.booking_id,
            current +
              Math.max(
                0,
                Number(
                  item.duration_minutes
                ) || 0
              )
          );
        }
      }
    }

    const days: Record<
      string,
      string[]
    > = {};

    for (const date of dates) {
      const dayOfWeek =
        getDayOfWeek(
          date
        );

      const rule =
        (
          rulesResult.data ||
          []
        ).find(
          (item) =>
            Number(
              item.day_of_week
            ) ===
            dayOfWeek
        ) || null;

      const overrides =
        (
          overridesResult.data ||
          []
        ).filter(
          (item) =>
            item.override_date ===
            date
        );

      const dayBookings =
        bookings
          .filter(
            (booking) =>
              booking.preferred_date ===
              date
          )
          .map(
            (booking) => ({
              preferred_time:
                booking.preferred_time,

              duration_minutes:
                durationMap.get(
                  booking.id
                ) || 60,
            })
          );

      days[date] =
        buildSlots({
          rule,
          overrides,
          bookings:
            dayBookings,
          duration,
        });
    }

    /*
     * Return exactly the structure expected
     * by the customer calendar.
     */
    return NextResponse.json({
      from,
      to,
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