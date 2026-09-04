export type AvailabilityRule = {
  day_of_week: number;
  is_available: boolean;
  start_time?: string | null;
  end_time?: string | null;
};

export type AvailabilityOverride = {
  override_date?: string;
  start_time: string;
  end_time: string;
  kind: "open" | "block";
};

export type AvailabilityBooking = {
  preferred_time: string;
  duration_minutes: number;
};

export function timeToMinutes(value: string) {
  const [hours, minutes] = String(value)
    .slice(0, 5)
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(
    minutes
  ).padStart(2, "0")}`;
}

export function normalizeTime(value: string) {
  return String(value).slice(0, 5);
}

export function getDayOfWeek(date: string) {
  const [year, month, day] = date
    .split("-")
    .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return -1;
  }

  return new Date(
    Date.UTC(year, month - 1, day)
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

function subtractWindow(
  windowStart: number,
  windowEnd: number,
  blockStart: number,
  blockEnd: number
): Array<[number, number]> {
  
  if (
    blockEnd <= windowStart ||
    blockStart >= windowEnd
  ) {
    return [[windowStart, windowEnd]];
  }

  const result: Array<
    [number, number]
  > = [];

  if (blockStart > windowStart) {
    result.push([
      windowStart,
      Math.min(
        blockStart,
        windowEnd
      ),
    ]);
  }

  if (blockEnd < windowEnd) {
    result.push([
      Math.max(
        blockEnd,
        windowStart
      ),
      windowEnd,
    ]);
  }

  return result.filter(
    ([start, end]) => end > start
  );
}

export function getAvailableSlots({
  rule,
  overrides,
  bookings,
  durationMinutes,
  intervalMinutes = 30,
}: {
  rule?: AvailabilityRule | null;
  overrides: AvailabilityOverride[];
  bookings: AvailabilityBooking[];
  durationMinutes: number;
  intervalMinutes?: number;
}) {
  if (
    !durationMinutes ||
    durationMinutes <= 0
  ) {
    return [];
  }

  let windows: Array<
    [number, number]
  > = [];

  if (
    rule?.is_available &&
    rule.start_time &&
    rule.end_time
  ) {
    windows.push([
      timeToMinutes(
        rule.start_time
      ),
      timeToMinutes(
        rule.end_time
      ),
    ]);
  }

  for (const override of overrides) {
    if (
      override.kind !== "open"
    ) {
      continue;
    }

    windows.push([
      timeToMinutes(
        override.start_time
      ),
      timeToMinutes(
        override.end_time
      ),
    ]);
  }

  const blocks = overrides.filter(
    (override) =>
      override.kind === "block"
  );

  for (const block of blocks) {
    const blockStart =
      timeToMinutes(
        block.start_time
      );

    const blockEnd =
      timeToMinutes(
        block.end_time
      );

    windows = windows.flatMap(
      ([start, end]) =>
        subtractWindow(
          start,
          end,
          blockStart,
          blockEnd
        )
    );
  }

  const cleanedWindows =
    windows
      .filter(
        ([start, end]) =>
          end > start
      )
      .sort(
        (a, b) =>
          a[0] - b[0]
      );

  if (!cleanedWindows.length) {
    return [];
  }

  const bookedIntervals =
    bookings.map((booking) => {
      const start =
        timeToMinutes(
          booking.preferred_time
        );

      const duration =
        Number(
          booking.duration_minutes
        ) || 60;

      return {
        start,
        end: start + duration,
      };
    });

  const slots = new Set<string>();

  for (const [
    windowStart,
    windowEnd,
  ] of cleanedWindows) {
    for (
      let start = windowStart;
      start + durationMinutes <=
        windowEnd;
      start += intervalMinutes
    ) {
      const end =
        start + durationMinutes;

      const conflicts =
        bookedIntervals.some(
          (booking) =>
            overlaps(
              start,
              end,
              booking.start,
              booking.end
            )
        );

      if (!conflicts) {
        slots.add(
          minutesToTime(start)
        );
      }
    }
  }

  return Array.from(slots).sort();
}