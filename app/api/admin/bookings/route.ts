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

type ResolvedService = {
  service_id: string;
  variation_id: string | null;
  service_name: string;
  variation_name: string | null;
  price: number;
  duration_minutes: number;
};

type BookingServiceRow = {
  service_id: string | null;
  variation_id: string | null;
  service_name: string;
  variation_name: string | null;
  price: number | null;
  duration_minutes: number | null;
};

function timeToMinutes(
  value: string | null | undefined
): number | null {
  if (!value) {
    return null;
  }

  const parts = String(value)
    .slice(0, 5)
    .split(":");

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

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

function isValidDate(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  );
}

function isValidTime(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    /^\d{2}:\d{2}$/.test(
      value
    )
  );
}

function getDayOfWeek(
  dateValue: string
): number {
  const [
    year,
    month,
    day,
  ] = dateValue
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
): boolean {
  return (
    startA < endB &&
    endA > startB
  );
}

async function getAdminDb() {
  const session =
    await supabaseServer();

  const {
    data: {
      user,
    },
  } =
    await session.auth.getUser();

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

  if (error) {
    console.error(
      "Admin lookup error:",
      error
    );
    return null;
  }

  return admin ? db : null;
}

async function getBookingDuration(
  db: ReturnType<
    typeof supabaseAdmin
  >,
  bookingId: string
): Promise<number> {
  const {
    data,
    error,
  } =
    await db
      .from(
        "booking_services"
      )
      .select(
        "duration_minutes"
      )
      .eq(
        "booking_id",
        bookingId
      );

  if (error) {
    throw error;
  }

  const rows =
    (data || []) as Array<{
      duration_minutes:
        | number
        | null;
    }>;

  const total =
    rows.reduce(
      (
        sum: number,
        item: {
          duration_minutes:
            | number
            | null;
        }
      ) =>
        sum +
        Math.max(
          0,
          Number(
            item.duration_minutes ||
              0
          )
        ),
      0
    );

  return Math.max(
    30,
    total || 60
  );
}

async function checkAppointmentAvailability(
  db: ReturnType<
    typeof supabaseAdmin
  >,
  {
    bookingId,
    date,
    time,
    duration,
  }: {
    bookingId?: string;
    date: string;
    time: string;
    duration: number;
  }
): Promise<{
  ok: boolean;
  error?: string;
}> {
  const requestedStart =
    timeToMinutes(time);

  if (
    requestedStart ===
    null
  ) {
    return {
      ok: false,
      error:
        "Invalid appointment time.",
    };
  }

  const requestedEnd =
    requestedStart +
    Math.max(
      30,
      duration
    );

  const dayOfWeek =
    getDayOfWeek(date);

  const [
    ruleResult,
    overrideResult,
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
          "day_of_week",
          dayOfWeek
        )
        .eq(
          "active",
          true
        )
        .maybeSingle(),

      db
        .from(
          "availability_overrides"
        )
        .select(
          "override_date,start_time,end_time,kind"
        )
        .eq(
          "override_date",
          date
        ),

      db
        .from("bookings")
        .select(
          "id,preferred_date,preferred_time,status"
        )
        .eq(
          "preferred_date",
          date
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

  if (ruleResult.error) {
    throw ruleResult.error;
  }

  if (
    overrideResult.error
  ) {
    throw overrideResult.error;
  }

  if (
    bookingsResult.error
  ) {
    throw bookingsResult.error;
  }

  let windows: Array<
    [number, number]
  > = [];

  const rule =
    ruleResult.data;

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

  const overrides =
    overrideResult.data ||
    [];

  for (
    const override of overrides
  ) {
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

  for (
    const override of overrides
  ) {
    if (
      override.kind !==
      "block"
    ) {
      continue;
    }

    const blockStart =
      timeToMinutes(
        override.start_time
      );

    const blockEnd =
      timeToMinutes(
        override.end_time
      );

    if (
      blockStart === null ||
      blockEnd === null ||
      blockEnd <=
        blockStart
    ) {
      continue;
    }

    const updatedWindows: Array<
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
        updatedWindows.push([
          start,
          end,
        ]);
        continue;
      }

      if (
        blockStart > start
      ) {
        updatedWindows.push([
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
        updatedWindows.push([
          Math.max(
            blockEnd,
            start
          ),
          end,
        ]);
      }
    }

    windows =
      updatedWindows;
  }

  const insideSchedule =
    windows.some(
      (
        [start, end]: [
          number,
          number
        ]
      ) =>
        requestedStart >=
          start &&
        requestedEnd <= end
    );

  if (
    !insideSchedule
  ) {
    return {
      ok: false,
      error:
        "That appointment is outside the studio's available working hours.",
    };
  }

  const activeBookings =
    (
      bookingsResult.data ||
      []
    ).filter(
      (booking) =>
        booking.id !==
        bookingId
    );

  for (
    const booking of activeBookings
  ) {
    const start =
      timeToMinutes(
        booking.preferred_time
      );

    if (
      start === null
    ) {
      continue;
    }

    const bookingDuration =
      await getBookingDuration(
        db,
        booking.id
      );

    const end =
      start +
      bookingDuration;

    if (
      overlaps(
        requestedStart,
        requestedEnd,
        start,
        end
      )
    ) {
      return {
        ok: false,
        error:
          "That appointment overlaps another client's booking.",
      };
    }
  }

  return {
    ok: true,
  };
}

function calculatePromoDiscount(
  promo: any,
  total: number
): number {
  if (!promo) {
    return 0;
  }

  const discountType =
    String(
      promo.discount_type ||
        ""
    ).toLowerCase();

  const discountValue =
    Number(
      promo.discount_value ||
        0
    );

  if (
    discountValue <=
    0
  ) {
    return 0;
  }

  if (
    discountType ===
      "percentage" ||
    discountType ===
      "percent" ||
    discountType ===
      "percent_off"
  ) {
    return Math.min(
      total,
      total *
        (discountValue /
          100)
    );
  }

  return Math.min(
    total,
    discountValue
  );
}

async function resolveServices(
  db: ReturnType<
    typeof supabaseAdmin
  >,
  selectedServices: any[]
): Promise<{
  resolvedServices: ResolvedService[];
  total: number;
  duration: number;
}> {
  const serviceIds =
    selectedServices.map(
      (
        item: any
      ) =>
        String(
          item.service_id
        )
    );

  const uniqueServiceIds =
    Array.from(
      new Set(
        serviceIds
      )
    );

  const {
    data: services,
    error:
      servicesError,
  } =
    await db
      .from("services")
      .select(
        "id,name,price,duration_minutes,active"
      )
      .in(
        "id",
        uniqueServiceIds
      )
      .eq(
        "active",
        true
      );

  if (servicesError) {
    throw servicesError;
  }

  const serviceRows =
    services || [];

  if (
    serviceRows.length !==
    uniqueServiceIds.length
  ) {
    throw new Error(
      "One or more selected services are no longer available."
    );
  }

  const variationIds =
    selectedServices
      .map(
        (
          item: any
        ) =>
          item.variation_id
            ? String(
                item.variation_id
              )
            : null
      )
      .filter(
        (
          value: string | null
        ): value is string =>
          Boolean(value)
      );

  let variations: any[] =
    [];

  if (
    variationIds.length
  ) {
    const {
      data,
      error,
    } =
      await db
        .from(
          "service_variations"
        )
        .select(
          "id,service_id,name,price_delta,duration_delta_minutes,active"
        )
        .in(
          "id",
          Array.from(
            new Set(
              variationIds
            )
          )
        )
        .eq(
          "active",
          true
        );

    if (error) {
      throw error;
    }

    variations =
      data || [];
  }

  const serviceMap =
    new Map<
      string,
      any
    >(
      serviceRows.map(
        (
          service: any
        ) => [
          String(
            service.id
          ),
          service,
        ]
      )
    );

  const variationMap =
    new Map<
      string,
      any
    >(
      variations.map(
        (
          variation: any
        ) => [
          String(
            variation.id
          ),
          variation,
        ]
      )
    );

  const resolvedServices: ResolvedService[] =
    selectedServices.map(
      (
        item: any
      ): ResolvedService => {
        const service =
          serviceMap.get(
            String(
              item.service_id
            )
          );

        if (!service) {
          throw new Error(
            "Invalid service selected."
          );
        }

        const variation =
          item.variation_id
            ? variationMap.get(
                String(
                  item.variation_id
                )
              )
            : null;

        if (
          variation &&
          String(
            variation.service_id
          ) !==
            String(
              service.id
            )
        ) {
          throw new Error(
            "Invalid service variation."
          );
        }

        return {
          service_id:
            String(
              service.id
            ),

          variation_id:
            variation
              ? String(
                  variation.id
                )
              : null,

          service_name:
            String(
              service.name
            ),

          variation_name:
            variation
              ? String(
                  variation.name
                )
              : null,

          price:
            Number(
              service.price ||
                0
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
      }
    );

  const total =
    resolvedServices.reduce(
      (
        sum: number,
        item: ResolvedService
      ): number =>
        sum +
        Number(
          item.price || 0
        ),
      0
    );

  const duration =
    Math.max(
      30,
      resolvedServices.reduce(
        (
          sum: number,
          item: ResolvedService
        ): number =>
          sum +
          Number(
            item.duration_minutes ||
              0
          ),
        0
      )
    );

  return {
    resolvedServices,
    total,
    duration,
  };
}

export async function PATCH(
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

    const action =
      String(
        body.action ||
          "status"
      );

    const id =
      String(
        body.id ||
          ""
      ).trim();

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Booking ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * STATUS
     */
    if (
      action ===
      "status"
    ) {
      const status =
        String(
          body.status ||
            ""
        );

      const allowedStatuses =
        [
          "approved",
          "rejected",
          "confirmed",
          "completed",
          "cancelled",
        ];

      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid booking status.",
          },
          {
            status: 400,
          }
        );
      }

      const {
        data: booking,
        error:
          bookingError,
      } =
        await db
          .from("bookings")
          .select(
            "id,status,preferred_date,preferred_time,down_payment"
          )
          .eq(
            "id",
            id
          )
          .single();

      if (
        bookingError
      ) {
        throw bookingError;
      }

      if (
        status ===
        "confirmed"
      ) {
        const availability =
          await checkAppointmentAvailability(
            db,
            {
              bookingId:
                id,

              date:
                String(
                  booking.preferred_date
                ),

              time:
                String(
                  booking.preferred_time
                ).slice(
                  0,
                  5
                ),

              duration:
                await getBookingDuration(
                  db,
                  id
                ),
            }
          );

        if (
          !availability.ok
        ) {
          return NextResponse.json(
            {
              error:
                availability.error,
            },
            {
              status: 409,
            }
          );
        }
      }

      const patch: Record<
        string,
        any
      > = {
        status,
      };

      const now =
        new Date().toISOString();

      if (
        status ===
        "approved"
      ) {
        patch.approved_at =
          now;
      }

      if (
        status ===
        "confirmed"
      ) {
        patch.confirmed_at =
          now;
      }

      if (
        status ===
        "completed"
      ) {
        patch.completed_at =
          now;
      }

      const {
        error,
      } =
        await db
          .from("bookings")
          .update(
            patch
          )
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
    }

    /*
     * EDIT / RESCHEDULE
     */
    if (
      action ===
        "edit" ||
      action ===
        "reschedule"
    ) {
      const {
        data: booking,
        error:
          bookingError,
      } =
        await db
          .from("bookings")
          .select(
            "id,status,down_payment"
          )
          .eq(
            "id",
            id
          )
          .single();

      if (
        bookingError
      ) {
        throw bookingError;
      }

      if (
        [
          "completed",
          "cancelled",
          "rejected",
        ].includes(
          booking.status
        )
      ) {
        return NextResponse.json(
          {
            error:
              "This booking can no longer be edited or rescheduled.",
          },
          {
            status: 400,
          }
        );
      }

      const customerName =
        String(
          body.customer_name ||
            ""
        ).trim();

      const mobile =
        String(
          body.mobile_number ||
            ""
        ).trim();

      const social =
        String(
          body.social_handle ||
            ""
        ).trim();

      const date =
        String(
          body.preferred_date ||
            ""
        );

      const time =
        String(
          body.preferred_time ||
            ""
        ).slice(
          0,
          5
        );

      const notes =
        String(
          body.notes ||
            ""
        );

      if (
        !customerName ||
        !mobile
      ) {
        return NextResponse.json(
          {
            error:
              "Customer name and mobile number are required.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !isValidDate(date)
      ) {
        return NextResponse.json(
          {
            error:
              "Please enter a valid appointment date.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !isValidTime(time)
      ) {
        return NextResponse.json(
          {
            error:
              "Please enter a valid appointment time.",
          },
          {
            status: 400,
          }
        );
      }

      const selectedServices =
        Array.isArray(
          body.services
        )
          ? body.services
          : [];

      if (
        selectedServices.length ===
        0
      ) {
        return NextResponse.json(
          {
            error:
              "A booking must contain at least one service.",
          },
          {
            status: 400,
          }
        );
      }

      const {
        resolvedServices,
        total,
        duration,
      } =
        await resolveServices(
          db,
          selectedServices
        );

      const availability =
        await checkAppointmentAvailability(
          db,
          {
            bookingId:
              id,

            date,

            time,

            duration,
          }
        );

      if (
        !availability.ok
      ) {
        return NextResponse.json(
          {
            error:
              availability.error,
          },
          {
            status: 409,
          }
        );
      }

      const currentPaid =
        Number(
          booking.down_payment ||
            0
        );

      if (
        currentPaid >
        total
      ) {
        return NextResponse.json(
          {
            error:
              "The current down payment is greater than the new booking total.",
          },
          {
            status: 400,
          }
        );
      }

      const updated =
        await db
          .from("bookings")
          .update({
            customer_name:
              customerName.slice(
                0,
                120
              ),

            mobile_number:
              mobile.slice(
                0,
                40
              ),

            social_handle:
              social.slice(
                0,
                120
              ),

            preferred_date:
              date,

            preferred_time:
              time,

            notes:
              notes.slice(
                0,
                3000
              ),

            estimated_total:
              total,
          })
          .eq(
            "id",
            id
          )
          .select(
            "*"
          )
          .single();

      if (
        updated.error
      ) {
        throw updated.error;
      }

      const deleted =
        await db
          .from(
            "booking_services"
          )
          .delete()
          .eq(
            "booking_id",
            id
          );

      if (
        deleted.error
      ) {
        throw deleted.error;
      }

      const rows =
        resolvedServices.map(
          (
            item: ResolvedService
          ) => ({
            booking_id:
              id,

            service_id:
              item.service_id,

            variation_id:
              item.variation_id,

            service_name:
              item.service_name,

            variation_name:
              item.variation_name,

            price:
              item.price,

            duration_minutes:
              item.duration_minutes,
          })
        );

      const inserted =
        await db
          .from(
            "booking_services"
          )
          .insert(
            rows
          );

      if (
        inserted.error
      ) {
        throw inserted.error;
      }

      return NextResponse.json({
        ok: true,
        booking:
          updated.data,
      });
    }

    /*
     * MANUAL PAYMENT
     */
    if (
      action ===
      "record_payment"
    ) {
      const amount =
        Number(
          body.amount
        );

      const method =
        String(
          body.method ||
            "other"
        ).slice(
          0,
          40
        );

      if (
        !Number.isFinite(
          amount
        ) ||
        amount <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "Enter a valid payment amount.",
          },
          {
            status: 400,
          }
        );
      }

      const {
        data: booking,
        error:
          bookingError,
      } =
        await db
          .from("bookings")
          .select(
            "id,estimated_total"
          )
          .eq(
            "id",
            id
          )
          .single();

      if (
        bookingError
      ) {
        throw bookingError;
      }

      const total =
        Number(
          booking.estimated_total ||
            0
        );

      const {
        data: existingPayments,
        error:
          paymentsError,
      } =
        await db
          .from("payments")
          .select(
            "amount,status"
          )
          .eq(
            "booking_id",
            id
          )
          .eq(
            "status",
            "verified"
          );

      if (
        paymentsError
      ) {
        throw paymentsError;
      }

      const verifiedPayments =
        (
          existingPayments ||
          []
        ) as Array<{
          amount:
            | number
            | null;
          status:
            | string
            | null;
        }>;

      const paid =
        verifiedPayments.reduce(
          (
            sum: number,
            payment: {
              amount:
                | number
                | null;
              status:
                | string
                | null;
            }
          ): number =>
            sum +
            Number(
              payment.amount ||
                0
            ),
          0
        );

      if (
        paid + amount >
        total
      ) {
        return NextResponse.json(
          {
            error:
              "Payment cannot exceed the remaining balance.",
          },
          {
            status: 400,
          }
        );
      }

      const {
        error:
          paymentError,
      } =
        await db
          .from("payments")
          .insert({
            booking_id:
              id,

            method,

            amount,

            status:
              "verified",

            verified_at:
              new Date().toISOString(),
          });

      if (
        paymentError
      ) {
        throw paymentError;
      }

      const newPaid =
        paid + amount;

      const {
        error:
          updateError,
      } =
        await db
          .from("bookings")
          .update({
            down_payment:
              newPaid,
          })
          .eq(
            "id",
            id
          );

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({
        ok: true,

        down_payment:
          newPaid,

        remaining:
          Math.max(
            0,
            total -
              newPaid
          ),
      });
    }

    return NextResponse.json(
      {
        error:
          "Invalid booking action.",
      },
      {
        status: 400,
      }
    );
  } catch (
    error: any
  ) {
    console.error(
      "Admin bookings API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to update booking.",
      },
      {
        status: 500,
      }
    );
  }
}