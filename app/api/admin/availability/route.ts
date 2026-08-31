import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  supabaseServer,
} from "@/lib/supabase-server";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

async function getAdminDb() {
  const supabase =
    await supabaseServer();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const db =
    supabaseAdmin();

  const {
    data: admin,
    error,
  } =
    await db
      .from("admins")
      .select("id")
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "active",
        true
      )
      .maybeSingle();

  if (
    error ||
    !admin
  ) {
    return null;
  }

  return db;
}

function validTime(
  value: unknown
) {
  return (
    typeof value ===
      "string" &&
    /^\d{2}:\d{2}$/.test(
      value
    )
  );
}

function timeToMinutes(
  value: string
) {
  const [
    hours,
    minutes,
  ] = value
    .split(":")
    .map(Number);

  return (
    hours * 60 +
    minutes
  );
}

function validTimeRange(
  start: string,
  end: string
) {
  return (
    validTime(start) &&
    validTime(end) &&
    timeToMinutes(end) >
      timeToMinutes(start)
  );
}

function validDate(
  value: unknown
) {
  return (
    typeof value ===
      "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  );
}

/*
 * GET
 *
 * Returns the current weekly working hours
 * and date-specific overrides.
 */
export async function GET() {
  try {
    const db =
      await getAdminDb();

    if (!db) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const [
      rulesResult,
      overridesResult,
    ] = await Promise.all([
      db
        .from(
          "availability_rules"
        )
        .select("*")
        .order(
          "day_of_week",
          {
            ascending: true,
          }
        ),

      db
        .from(
          "availability_overrides"
        )
        .select("*")
        .order(
          "override_date",
          {
            ascending: true,
          }
        )
        .order(
          "start_time",
          {
            ascending: true,
          }
        )
        .limit(200),
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

    return NextResponse.json({
      rules:
        rulesResult.data ||
        [],

      overrides:
        overridesResult.data ||
        [],
    });
  } catch (
    error: any
  ) {
    console.error(
      "Availability GET error:",
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

/*
 * POST
 *
 * Supports:
 *
 * 1. type = "schedule"
 *    Save all seven weekly working-hour rules.
 *
 * 2. type = "rule"
 *    Save one weekly rule.
 *
 * 3. type = "override"
 *    Save one date-specific open/block override.
 */
export async function POST(
  request: NextRequest
) {
  try {
    const db =
      await getAdminDb();

    if (!db) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json();

    /*
     * SAVE COMPLETE WEEKLY SCHEDULE
     */
    if (
      body.type ===
      "schedule"
    ) {
      const rules =
        Array.isArray(
          body.rules
        )
          ? body.rules
          : [];

      if (
        rules.length !==
        7
      ) {
        return NextResponse.json(
          {
            error:
              "A complete weekly schedule is required.",
          },
          {
            status: 400,
          }
        );
      }

      const savedRules: any[] =
        [];

      for (let day = 0; day <= 6; day++) {
        const incoming =
          rules.find(
            (rule: any) =>
              Number(
                rule.day_of_week
              ) === day
          );

        if (!incoming) {
          return NextResponse.json(
            {
              error:
                `Missing schedule for ${day}.`,
            },
            {
              status: 400,
            }
          );
        }

        const isAvailable =
          Boolean(
            incoming.is_available
          );

        const start =
          String(
            incoming.start_time ||
              ""
          ).slice(0, 5);

        const end =
          String(
            incoming.end_time ||
              ""
          ).slice(0, 5);

        if (
          isAvailable &&
          !validTimeRange(
            start,
            end
          )
        ) {
          return NextResponse.json(
            {
              error:
                "Please make sure every available day has a valid start and end time, with the end time later than the start time.",
            },
            {
              status: 400,
            }
          );
        }

        const values = {
          label:
            incoming.label ||
            [
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ][day],

          day_of_week:
            day,

          is_available:
            isAvailable,

          start_time:
            isAvailable
              ? start
              : null,

          end_time:
            isAvailable
              ? end
              : null,

          semester_name:
            incoming.semester_name ||
            null,

          active: true,
        };

        /*
         * Do not rely on a unique constraint for
         * day_of_week. The original schema does not
         * define one.
         *
         * Update every existing row for that day.
         * If no row exists, insert one.
         */
        const existing =
          await db
            .from(
              "availability_rules"
            )
            .select(
              "id"
            )
            .eq(
              "day_of_week",
              day
            );

        if (
          existing.error
        ) {
          throw existing.error;
        }

        let saved;

        if (
          existing.data &&
          existing.data.length
        ) {
          saved =
            await db
              .from(
                "availability_rules"
              )
              .update(
                values
              )
              .eq(
                "day_of_week",
                day
              )
              .select(
                "*"
              );

          if (
            saved.error
          ) {
            throw saved.error;
          }

          savedRules.push(
            ...(saved.data ||
              [])
          );
        } else {
          saved =
            await db
              .from(
                "availability_rules"
              )
              .insert(
                values
              )
              .select(
                "*"
              );

          if (
            saved.error
          ) {
            throw saved.error;
          }

          savedRules.push(
            ...(saved.data ||
              [])
          );
        }
      }

      return NextResponse.json({
        ok: true,
        type: "schedule",
        rules: savedRules,
      });
    }

    /*
     * SAVE ONE WEEKLY RULE
     */
    if (
      body.type ===
      "rule"
    ) {
      const day =
        Number(
          body.day_of_week
        );

      if (
        !Number.isInteger(
          day
        ) ||
        day < 0 ||
        day > 6
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid day of week.",
          },
          {
            status: 400,
          }
        );
      }

      const isAvailable =
        Boolean(
          body.is_available
        );

      const start =
        String(
          body.start_time ||
            ""
        ).slice(0, 5);

      const end =
        String(
          body.end_time ||
            ""
        ).slice(0, 5);

      if (
        isAvailable &&
        !validTimeRange(
          start,
          end
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Please enter a valid start and end time.",
          },
          {
            status: 400,
          }
        );
      }

      const values = {
        day_of_week:
          day,

        is_available:
          isAvailable,

        start_time:
          isAvailable
            ? start
            : null,

        end_time:
          isAvailable
            ? end
            : null,

        active: true,
      };

      const existing =
        await db
          .from(
            "availability_rules"
          )
          .select(
            "id"
          )
          .eq(
            "day_of_week",
            day
          );

      if (
        existing.error
      ) {
        throw existing.error;
      }

      if (
        existing.data &&
        existing.data.length
      ) {
        const updated =
          await db
            .from(
              "availability_rules"
            )
            .update(
              values
            )
            .eq(
              "day_of_week",
              day
            )
            .select(
              "*"
            );

        if (
          updated.error
        ) {
          throw updated.error;
        }

        return NextResponse.json({
          ok: true,
          type: "rule",
          rules:
            updated.data ||
            [],
        });
      }

      const inserted =
        await db
          .from(
            "availability_rules"
          )
          .insert({
            ...values,
            label:
              [
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
              ][day],
          })
          .select(
            "*"
          );

      if (
        inserted.error
      ) {
        throw inserted.error;
      }

      return NextResponse.json({
        ok: true,
        type: "rule",
        rules:
          inserted.data ||
          [],
      });
    }

    /*
     * SAVE DATE-SPECIFIC OVERRIDE
     */
    if (
      body.type ===
      "override"
    ) {
      const date =
        String(
          body.date ||
            ""
        );

      const start =
        String(
          body.start ||
            ""
        ).slice(0, 5);

      const end =
        String(
          body.end ||
            ""
        ).slice(0, 5);

      const kind =
        String(
          body.kind ||
            ""
        );

      if (
        !validDate(
          date
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Please choose a valid date.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        ![
          "open",
          "block",
        ].includes(
          kind
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Please choose OPEN EXTRA TIME or BLOCK TIME.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !validTimeRange(
          start,
          end
        )
      ) {
        return NextResponse.json(
          {
            error:
              "End time must be later than start time.",
          },
          {
            status: 400,
          }
        );
      }

      const inserted =
        await db
          .from(
            "availability_overrides"
          )
          .insert({
            override_date:
              date,

            start_time:
              start,

            end_time:
              end,

            kind,
          })
          .select(
            "*"
          )
          .single();

      if (
        inserted.error
      ) {
        throw inserted.error;
      }

      return NextResponse.json({
        ok: true,
        type: "override",
        override:
          inserted.data,
      });
    }

    return NextResponse.json(
      {
        error:
          "Invalid availability request.",
      },
      {
        status: 400,
      }
    );
  } catch (
    error: any
  ) {
    console.error(
      "Availability POST error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to save availability.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * DELETE DATE-SPECIFIC OVERRIDE
 */
export async function DELETE(
  request: NextRequest
) {
  try {
    const db =
      await getAdminDb();

    if (!db) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const id =
      new URL(
        request.url
      ).searchParams.get(
        "id"
      );

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Override ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      error,
    } =
      await db
        .from(
          "availability_overrides"
        )
        .delete()
        .eq(
          "id",
          id
        );

    if (error) {
      throw error;
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (
    error: any
  ) {
    console.error(
      "Availability DELETE error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to remove override.",
      },
      {
        status: 500,
      }
    );
  }
}