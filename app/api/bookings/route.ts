import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

import {
  makeToken,
  sanitizeFilename,
} from "@/lib/utils";

import {
  notifyNewBooking,
} from "@/lib/notifications";

const MAX_INSPIRATION_FILES = 8;
const MAX_IMAGE_MB = 8;
const MAX_STUDENT_FILE_MB = 8;

const IMAGE_TYPES = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
]);

const STUDENT_FILE_TYPES =
  new Set<string>([
    "image/jpeg",
    "image/png",
    "image/heic",
    "image/heif",
    "application/pdf",
  ]);

type SelectedServiceInput = {
  service_id: string;
  variation_id?: string | null;
};

type ResolvedService = {
  service_id: string;
  variation_id: string | null;
  service_name: string;
  variation_name: string | null;
  price: number;
  duration_minutes: number;
};

type AvailabilityResult = {
  ok: boolean;
  error?: string;
};

function toMinutes(
  value: string | null | undefined
): number | null {
  if (!value) {
    return null;
  }

  const [hoursRaw, minutesRaw] =
    String(value)
      .slice(0, 5)
      .split(":");

  const hours = Number(hoursRaw);
  const minutes = Number(
    minutesRaw
  );

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return null;
  }

  return hours * 60 + minutes;
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
  value: string
): number {
  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return -1;
  }

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

function calculatePromoDiscount(
  promo: any,
  total: number
): number {
  if (!promo) {
    return 0;
  }

  const type =
    String(
      promo.discount_type ||
        ""
    ).toLowerCase();

  const value = Number(
    promo.discount_value || 0
  );

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return 0;
  }

  if (
    type === "percentage" ||
    type === "percent" ||
    type === "percent_off"
  ) {
    return Math.min(
      total,
      total * (value / 100)
    );
  }

  return Math.min(
    total,
    value
  );
}

async function getBookingDuration(
  db: ReturnType<typeof supabaseAdmin>,
  bookingId: string
): Promise<number> {
  const {
    data,
    error,
  } = await db
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
      ): number =>
        sum +
        Number(
          item.duration_minutes ||
            0
        ),
      0
    );

  return Math.max(
    30,
    total || 60
  );
}

async function checkAvailability(
  db: ReturnType<typeof supabaseAdmin>,
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
): Promise<AvailabilityResult> {
  const requestedStart =
    toMinutes(time);

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

  if (
    dayOfWeek < 0
  ) {
    return {
      ok: false,
      error:
        "Invalid appointment date.",
    };
  }

  const [
    ruleResult,
    overrideResult,
    bookingResult,
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

  if (
    ruleResult.error
  ) {
    throw ruleResult.error;
  }

  if (
    overrideResult.error
  ) {
    throw overrideResult.error;
  }

  if (
    bookingResult.error
  ) {
    throw bookingResult.error;
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

  const overrides =
    overrideResult.data ||
    [];

  /*
   * OPEN EXTRA TIME
   */
  overrides.forEach(
    (
      override: any
    ) => {
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
    (
      override: any
    ) => {
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
        blockEnd === null ||
        blockEnd <=
          blockStart
      ) {
        return;
      }

      const nextWindows: Array<
        [number, number]
      > = [];

      windows.forEach(
        (
          [
            start,
            end,
          ]: [number, number]
        ) => {
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

  const insideSchedule =
    windows.some(
      (
        [
          start,
          end,
        ]: [number, number]
      ): boolean =>
        requestedStart >=
          start &&
        requestedEnd <=
          end
    );

  if (
    !insideSchedule
  ) {
    return {
      ok: false,
      error:
        "That requested time is outside current availability. Please choose another time.",
    };
  }

  /*
   * ONE CLIENT AT A TIME
   */
  const activeBookings =
    (
      bookingResult.data ||
      []
    ).filter(
      (
        booking: any
      ): boolean =>
        booking.id !==
        bookingId
    );

  for (
    const booking of
      activeBookings
  ) {
    const existingStart =
      toMinutes(
        booking.preferred_time
      );

    if (
      existingStart ===
      null
    ) {
      continue;
    }

    const existingDuration =
      await getBookingDuration(
        db,
        booking.id
      );

    const existingEnd =
      existingStart +
      existingDuration;

    if (
      overlaps(
        requestedStart,
        requestedEnd,
        existingStart,
        existingEnd
      )
    ) {
      return {
        ok: false,
        error:
          "That appointment overlaps another client's booking. Please choose another time.",
      };
    }
  }

  return {
    ok: true,
  };
}

async function resolveServices(
  db: ReturnType<typeof supabaseAdmin>,
  selectedServices: SelectedServiceInput[]
): Promise<{
  resolvedServices: ResolvedService[];
  total: number;
  duration: number;
}> {
  const serviceIds =
    selectedServices.map(
      (
        item: SelectedServiceInput
      ): string =>
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

  if (
    servicesError
  ) {
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
          item: SelectedServiceInput
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

  let variations:
    any[] = [];

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
    >();

  serviceRows.forEach(
    (
      service: any
    ) => {
      serviceMap.set(
        String(
          service.id
        ),
        service
      );
    }
  );

  const variationMap =
    new Map<
      string,
      any
    >();

  variations.forEach(
    (
      variation: any
    ) => {
      variationMap.set(
        String(
          variation.id
        ),
        variation
      );
    }
  );

  const resolvedServices =
    selectedServices.map(
      (
        item: SelectedServiceInput
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

        const price =
          Number(
            service.price ||
              0
          ) +
          Number(
            variation?.price_delta ||
              0
          );

        const duration =
          Number(
            service.duration_minutes ||
              0
          ) +
          Number(
            variation?.duration_delta_minutes ||
              0
          );

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

          price,

          duration_minutes:
            duration,
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

export async function POST(
  request: NextRequest
) {
  try {
    const formData =
      await request.formData();

    const payloadRaw =
      formData.get(
        "payload"
      );

    const payloadText =
      typeof payloadRaw ===
      "string"
        ? payloadRaw
        : "{}";

    let payload: any;

    try {
      payload =
        JSON.parse(
          payloadText
        );
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid booking data.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !payload.customer_name ||
      !payload.mobile_number ||
      !payload.preferred_date ||
      !payload.preferred_time ||
      !payload.terms_accepted ||
      !Array.isArray(
        payload.services
      ) ||
      !payload.services.length
    ) {
      return NextResponse.json(
        {
          error:
            "Required booking fields are missing.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !isValidDate(
        payload.preferred_date
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid appointment date.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !isValidTime(
        payload.preferred_time
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid appointment time.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      payload.services.length >
      20
    ) {
      return NextResponse.json(
        {
          error:
            "Too many services.",
        },
        {
          status: 400,
        }
      );
    }

    const db =
      supabaseAdmin();

    /*
     * INSPIRATION FILES
     */
    const inspirationFiles =
      formData
        .getAll(
          "inspiration"
        )
        .filter(
          (
            item: FormDataEntryValue
          ): item is File =>
            item instanceof
            File
        );

    if (
      inspirationFiles.length >
      MAX_INSPIRATION_FILES
    ) {
      return NextResponse.json(
        {
          error:
            "Maximum 8 inspiration images.",
        },
        {
          status: 400,
        }
      );
    }

    for (
      const file of
        inspirationFiles
    ) {
      if (
        file.size >
        MAX_IMAGE_MB *
          1024 *
          1024
      ) {
        return NextResponse.json(
          {
            error:
              "Each inspiration image must be 8MB or smaller.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !IMAGE_TYPES.has(
          file.type
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid inspiration file type.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * SERVICES
     */
    const selectedServices: SelectedServiceInput[] =
      payload.services.map(
        (
          item: any
        ): SelectedServiceInput => ({
          service_id:
            String(
              item.service_id
            ),

          variation_id:
            item.variation_id
              ? String(
                  item.variation_id
                )
              : null,
        })
      );

    const {
      resolvedServices,
      total: baseTotal,
      duration,
    } =
      await resolveServices(
        db,
        selectedServices
      );

    /*
     * PROMO / DISCOUNT
     */
    const promoChoice =
      String(
        payload.promo_choice ||
          ""
      );

    let promoId:
      | string
      | null = null;

    let promoName =
      "Not Applicable";

    let discount = 0;

    const isFirstTime =
      promoChoice ===
      "first_time";

    const isStudentPwdSc =
      promoChoice ===
      "student_pwd_sc";

    const isReferral =
      promoChoice ===
      "referral";

    /*
     * CURRENT PROMO
     *
     * This is mutually exclusive with
     * the permanent discount choices.
     */
    if (
      promoChoice.startsWith(
        "promo:"
      )
    ) {
      promoId =
        promoChoice.slice(
          6
        );

      if (!promoId) {
        return NextResponse.json(
          {
            error:
              "Invalid promo selection.",
          },
          {
            status: 400,
          }
        );
      }

      const {
        data: promo,
        error:
          promoError,
      } =
        await db
          .from("promos")
          .select(
            "id,name,description,discount_type,discount_value,active"
          )
          .eq(
            "id",
            promoId
          )
          .eq(
            "active",
            true
          )
          .single();

      if (
        promoError ||
        !promo
      ) {
        return NextResponse.json(
          {
            error:
              "That current promo is no longer available.",
          },
          {
            status: 409,
          }
        );
      }

      promoName =
        String(
          promo.name
        );

      discount =
        calculatePromoDiscount(
          promo,
          baseTotal
        );
    }

    /*
     * FIRST-TIME BOOKING DISCOUNT
     *
     * 5% off regular rates only.
     * It cannot be combined with a promo.
     */
    if (
      isFirstTime
    ) {
      promoName =
        "First-time Booking Discount";

      discount =
        baseTotal * 0.05;
    }

    /*
     * STUDENT / PWD / SC DISCOUNT
     *
     * 5% discount.
     * BOTH verification documents are required.
     */
    if (
      isStudentPwdSc
    ) {
      promoName =
        "Student / PWD / SC Discount";

      discount =
        baseTotal * 0.05;

      const validId =
        formData.get(
          "student_valid_id"
        );

      const registration =
        formData.get(
          "student_registration"
        );

      if (
        !(
          validId instanceof
          File
        ) ||
        validId.size <=
          0
      ) {
        return NextResponse.json(
          {
            error:
              "Student / PWD / SC Discount requires a valid ID.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !(
          registration instanceof
          File
        ) ||
        registration.size <=
          0
      ) {
        return NextResponse.json(
          {
            error:
              "Student / PWD / SC Discount requires a current Registration Card/Form.",
          },
          {
            status: 400,
          }
        );
      }

      const verificationFiles =
        [
          validId,
          registration,
        ];

      for (
        const file of
          verificationFiles
      ) {
        if (
          file.size >
          MAX_STUDENT_FILE_MB *
            1024 *
            1024
        ) {
          return NextResponse.json(
            {
              error:
                "Student verification files must be 8MB or smaller.",
            },
            {
              status: 400,
            }
          );
        }

        if (
          !STUDENT_FILE_TYPES.has(
            file.type
          )
        ) {
          return NextResponse.json(
            {
              error:
                "Student verification files must be JPG, PNG, HEIC, or PDF.",
            },
            {
              status: 400,
            }
          );
        }
      }
    }

    /*
     * REFERRAL PROGRAM
     *
     * Currently no automatic discount;
     * it simply records who referred them.
     */
    if (
      isReferral
    ) {
      const referralName =
        String(
          payload.referral_name ||
            ""
        ).trim();

      if (
        !referralName
      ) {
        return NextResponse.json(
          {
            error:
              "Please enter the name of the person who referred you.",
          },
          {
            status: 400,
          }
        );
      }

      promoName =
        `Referral Program — Referred by: ${referralName.slice(
          0,
          120
        )}`;
    }

    /*
     * NO DISCOUNT
     */
    if (
      !promoChoice
    ) {
      promoName =
        "Not Applicable";

      discount = 0;
    }

    /*
     * FINAL SERVER-CALCULATED TOTAL
     */
    const estimatedTotal =
      Math.max(
        0,
        baseTotal -
          discount
      );

    /*
     * AVAILABILITY
     */
    const availability =
      await checkAvailability(
        db,
        {
          date:
            payload.preferred_date,

          time:
            String(
              payload.preferred_time
            ).slice(
              0,
              5
            ),

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

    /*
     * CREATE DRAFT BOOKING
     */
    const token =
      makeToken(32);

    const referenceCode =
      `TCL-${new Date().getFullYear()}-${Math.floor(
        100000 +
          Math.random() *
            900000
      )}`;

    const {
      data: booking,
      error:
        bookingError,
    } =
      await db
        .from("bookings")
        .insert({
          reference_code:
            referenceCode,

          access_token:
            token,

          customer_name:
            String(
              payload.customer_name
            ).slice(
              0,
              120
            ),

          mobile_number:
            String(
              payload.mobile_number
            ).slice(
              0,
              40
            ),

          social_handle:
            String(
              payload.social_handle ||
                ""
            ).slice(
              0,
              120
            ),

          preferred_date:
            payload.preferred_date,

          preferred_time:
            String(
              payload.preferred_time
            ).slice(
              0,
              5
            ),

          removal:
            String(
              payload.removal ||
                "None"
            ).slice(
              0,
              120
            ),

          promo_id:
            promoId,

          promo_name:
            promoName,

          notes:
            String(
              payload.notes ||
                ""
            ).slice(
              0,
              3000
            ),

          terms_accepted:
            true,

          status:
            "draft",

          estimated_total:
            estimatedTotal,

          down_payment:
            0,

          inspiration_count:
            inspirationFiles.length,
        })
        .select(
          "id"
        )
        .single();

    if (
      bookingError ||
      !booking
    ) {
      throw (
        bookingError ||
        new Error(
          "Unable to create booking."
        )
      );
    }

    /*
     * BOOKING SERVICES
     *
     * All prices and durations come from
     * the database-resolved service records.
     */
    const bookingServiceRows =
      resolvedServices.map(
        (
          item: ResolvedService
        ) => ({
          booking_id:
            booking.id,

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

    const {
      error:
        bookingServicesError,
    } =
      await db
        .from(
          "booking_services"
        )
        .insert(
          bookingServiceRows
        );

    if (
      bookingServicesError
    ) {
      throw bookingServicesError;
    }

    /*
     * NAIL INSPIRATION
     */
    for (
      const file of
        inspirationFiles
    ) {
      const path =
        `${booking.id}/${makeToken(
          10
        )}-${sanitizeFilename(
          file.name
        )}`;

      const {
        error:
          uploadError,
      } =
        await db.storage
          .from(
            "nail-inspiration"
          )
          .upload(
            path,
            await file.arrayBuffer(),
            {
              contentType:
                file.type,

              upsert:
                false,
            }
          );

      if (uploadError) {
        throw uploadError;
      }

      const {
        error:
          recordError,
      } =
        await db
          .from(
            "booking_files"
          )
          .insert({
            booking_id:
              booking.id,

            bucket:
              "nail-inspiration",

            path,

            kind:
              "inspiration",
          });

      if (recordError) {
        throw recordError;
      }
    }

    /*
     * STUDENT / PWD / SC DOCUMENTS
     *
     * Stored separately using distinct `kind`
     * values so Admin can identify them.
     */
    if (
      isStudentPwdSc
    ) {
      const validId =
        formData.get(
          "student_valid_id"
        );

      const registration =
        formData.get(
          "student_registration"
        );

      const studentDocuments:
        Array<{
          file: File;
          kind: string;
        }> = [];

      if (
        validId instanceof
        File
      ) {
        studentDocuments.push({
          file: validId,
          kind:
            "student_valid_id",
        });
      }

      if (
        registration instanceof
        File
      ) {
        studentDocuments.push({
          file: registration,
          kind:
            "student_registration",
        });
      }

      for (
        const document of
          studentDocuments
      ) {
        const path =
          `${booking.id}/student/${makeToken(
            10
          )}-${sanitizeFilename(
            document.file.name
          )}`;

        const {
          error:
            uploadError,
        } =
          await db.storage
            .from(
              "nail-inspiration"
            )
            .upload(
              path,
              await document.file.arrayBuffer(),
              {
                contentType:
                  document.file.type,

                upsert:
                  false,
              }
            );

        if (uploadError) {
          throw uploadError;
        }

        const {
          error:
            recordError,
        } =
          await db
            .from(
              "booking_files"
            )
            .insert({
              booking_id:
                booking.id,

              bucket:
                "nail-inspiration",

              path,

              kind:
                document.kind,
            });

        if (recordError) {
          throw recordError;
        }
      }
    }

    return NextResponse.json({
      token,
    });
  } catch (
    error: any
  ) {
    console.error(
      "Create booking error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to create booking.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
  request: NextRequest
) {
  try {
    const token =
      new URL(
        request.url
      ).searchParams.get(
        "token"
      );

    if (!token) {
      return NextResponse.json(
        {
          error:
            "Missing token.",
        },
        {
          status: 400,
        }
      );
    }

    const db =
      supabaseAdmin();

    const {
      data: booking,
      error:
        bookingError,
    } = await db
      .from("bookings")
      .select(
        `
        id,
        status,
        reference_code,
        access_token,
        customer_name,
        mobile_number,
        social_handle,
        preferred_date,
        preferred_time,
        estimated_total,
        removal,
        notes
        `
      )
      .eq(
        "access_token",
        token
      )
      .single();

    if (
      bookingError ||
      !booking
    ) {
      return NextResponse.json(
        {
          error:
            "Booking not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      booking.status !==
      "draft"
    ) {
      return NextResponse.json(
        {
          error:
            "Request is not editable/submittable.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      error,
    } = await db
      .from("bookings")
      .update({
        status:
          "pending",

        submitted_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        booking.id
      );

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    const {
      data: bookingServices,
      error:
        bookingServicesError,
    } = await db
      .from(
        "booking_services"
      )
      .select(
        "service_name,variation_name,price"
      )
      .eq(
        "booking_id",
        booking.id
      );

    if (
      bookingServicesError
    ) {
      console.error(
        "Unable to load booking services for notification:",
        bookingServicesError
      );
    } else {
      try {
        await notifyNewBooking({
          booking,
          services:
            bookingServices ||
            [],
        });
      } catch (
        notificationError
      ) {
        console.error(
          "New booking notification failed:",
          notificationError
        );
      }
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (
    error: any
  ) {
    console.error(
      "Submit booking error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to submit booking.",
      },
      {
        status: 500,
      }
    );
  }
}
