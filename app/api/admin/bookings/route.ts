import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notifyBookingCompleted } from "@/lib/notifications";

const RESET_STATUSES = [
  "pending",
  "approved",
  "payment_submitted",
  "confirmed",
] as const;

const CANCELLATION_REASONS = [
  "Cancelled by client",
  "No-show",
  "Cancelled by Nailtech",
  "Other",
] as const;

const PAYMENT_TYPES = [
  "additional_charge",
  "balance",
  "tip",
  "other",
] as const;

const PAYMENT_METHODS = [
  "Cash",
  "GCash",
  "QR PH",
  "Bank Transfer",
  "Maya",
  "Card",
  "Other",
] as const;

/*
 * Approved bookings have 3 hours to
 * submit their required payment.
 *
 * IMPORTANT:
 * The timer starts from approved_at,
 * NOT from the original booking request.
 */
const PAYMENT_DEADLINE_HOURS = 3;

const PAYMENT_DEADLINE_MS =
  PAYMENT_DEADLINE_HOURS * 60 * 60 * 1000;

const PAYMENT_DEADLINE_REASON =
  "Payment deadline expired";

const PAYMENT_DEADLINE_NOTE =
  "Booking was automatically cancelled because payment was not submitted within 3 hours of approval.";

async function getAdminDb() {
  const session = await supabaseServer();

  const {
    data: { user },
  } = await session.auth.getUser();

  if (!user) {
    return null;
  }

  const db = supabaseAdmin();

  const { data: admin, error } = await db
    .from("admins")
    .select("id")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error("Admin lookup error:", error);
    return null;
  }

  return admin ? db : null;
}

function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/*
 * Returns the payment deadline for an
 * approved booking.
 */
function getPaymentDeadline(
  approvedAt: string | null | undefined
): Date | null {
  if (!approvedAt) {
    return null;
  }

  const timestamp = new Date(approvedAt);

  if (Number.isNaN(timestamp.getTime())) {
    return null;
  }

  return new Date(
    timestamp.getTime() + PAYMENT_DEADLINE_MS
  );
}

/*
 * Checks whether an approved booking's
 * payment deadline has passed.
 */
function isPaymentDeadlineExpired(
  approvedAt: string | null | undefined,
  now = new Date()
): boolean {
  const deadline =
    getPaymentDeadline(approvedAt);

  if (!deadline) {
    return false;
  }

  return now.getTime() >= deadline.getTime();
}

/*
 * Automatically cancels approved bookings
 * whose 3-hour payment window has expired.
 *
 * This function is safe to run repeatedly.
 *
 * It ONLY cancels bookings whose current
 * status is still "approved".
 *
 * Therefore:
 *
 * approved
 *   -> deadline expires
 *   -> cancelled
 *
 * But:
 *
 * approved
 *   -> payment_submitted
 *   -> confirmed
 *
 * will NOT be cancelled.
 */
async function expireOverdueApprovedBookings(
  db: ReturnType<typeof supabaseAdmin>,
  now = new Date()
) {
  const nowIso = now.toISOString();

  /*
   * Only approved bookings can expire.
   */
  const {
    data: bookings,
    error,
  } = await db
    .from("bookings")
    .select(
      "id,approved_at,status"
    )
    .eq("status", "approved")
    .not("approved_at", "is", null);

  if (error) {
    throw error;
  }

  if (!bookings?.length) {
    return {
      checked: 0,
      cancelled: 0,
    };
  }

  const expiredIds = bookings
    .filter((booking) =>
      isPaymentDeadlineExpired(
        booking.approved_at,
        now
      )
    )
    .map((booking) =>
      String(booking.id)
    );

  if (!expiredIds.length) {
    return {
      checked: bookings.length,
      cancelled: 0,
    };
  }

  /*
   * IMPORTANT:
   *
   * The status condition prevents a booking
   * that was already moved to
   * payment_submitted/confirmed/etc. from
   * being cancelled by a delayed job.
   */
  const {
    data: cancelledBookings,
    error: cancellationError,
  } = await db
    .from("bookings")
    .update({
      status: "cancelled",
      cancellation_reason:
        PAYMENT_DEADLINE_REASON,
      cancellation_note:
        PAYMENT_DEADLINE_NOTE,
      cancelled_at: nowIso,
    })
    .in("id", expiredIds)
    .eq("status", "approved")
    .select("id");

  if (cancellationError) {
    throw cancellationError;
  }

  return {
    checked: bookings.length,
    cancelled:
      cancelledBookings?.length || 0,
  };
}

/*
 * Normalizes:
 *
 * 09:00
 * 09:00:00
 * 9:00
 * 9:00 AM
 * 9:00:00 AM
 *
 * into:
 *
 * 09:00
 */
function normalizeTime(value: unknown): string | null {
  if (!value) {
    return null;
  }

  const raw = String(value).trim();

  const match24 = raw.match(
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/
  );

  if (match24) {
    const hours = Number(match24[1]);
    const minutes = Number(match24[2]);
    const seconds = match24[3]
      ? Number(match24[3])
      : 0;

    if (
      hours >= 0 &&
      hours <= 23 &&
      minutes >= 0 &&
      minutes <= 59 &&
      seconds >= 0 &&
      seconds <= 59
    ) {
      return `${String(hours).padStart(
        2,
        "0"
      )}:${String(minutes).padStart(
        2,
        "0"
      )}`;
    }
  }

  const match12 = raw.match(
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i
  );

  if (!match12) {
    return null;
  }

  let hours = Number(match12[1]);

  const minutes = Number(match12[2]);

  const seconds = match12[3]
    ? Number(match12[3])
    : 0;

  const suffix =
    match12[4].toUpperCase();

  if (
    hours < 1 ||
    hours > 12 ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) {
    return null;
  }

  if (suffix === "AM") {
    if (hours === 12) {
      hours = 0;
    }
  } else if (hours !== 12) {
    hours += 12;
  }

  return `${String(hours).padStart(
    2,
    "0"
  )}:${String(minutes).padStart(
    2,
    "0"
  )}`;
}

function toMinutes(value: unknown): number | null {
  const normalized =
    normalizeTime(value);

  if (!normalized) {
    return null;
  }

  const [hours, minutes] =
    normalized
      .split(":")
      .map(Number);

  return hours * 60 + minutes;
}

function isValidDate(value: unknown) {
  const date = String(value || "").trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    return false;
  }

  const parsed =
    new Date(`${date}T00:00:00Z`);

  return (
    !Number.isNaN(
      parsed.getTime()
    ) &&
    parsed.toISOString().slice(0, 10) ===
      date
  );
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

async function calculateServicesTotal(
  db: ReturnType<typeof supabaseAdmin>,
  servicesInput: unknown
) {
  if (!Array.isArray(servicesInput)) {
    throw new Error(
      "Services are required."
    );
  }

  if (servicesInput.length === 0) {
    throw new Error(
      "At least one service is required."
    );
  }

  if (servicesInput.length > 20) {
    throw new Error(
      "A maximum of 20 services can be selected."
    );
  }

  const selections =
    servicesInput.map(
      (item: any, index: number) => {
        const serviceId =
          String(
            item?.service_id ||
              item?.serviceId ||
              ""
          ).trim();

        const variationIdRaw =
          String(
            item?.variation_id ||
              item?.variationId ||
              ""
          ).trim();

        return {
          index,
          serviceId,
          variationId:
            variationIdRaw || null,
        };
      }
    );

  if (
    selections.some(
      (item) => !item.serviceId
    )
  ) {
    throw new Error(
      "Every selected service must have a service ID."
    );
  }

  const serviceIds = [
    ...new Set(
      selections.map(
        (item) => item.serviceId
      )
    ),
  ];

  const variationIds = [
    ...new Set(
      selections
        .map(
          (item) =>
            item.variationId
        )
        .filter(Boolean)
    ),
  ];

  const [
    servicesResult,
    variationsResult,
  ] = await Promise.all([
    db
      .from("services")
      .select(
        "id,name,price,duration_minutes,active"
      )
      .in("id", serviceIds)
      .eq("active", true),

    variationIds.length
      ? db
          .from("service_variations")
          .select(
            "id,service_id,name,price_delta,duration_delta_minutes,active"
          )
          .in(
            "id",
            variationIds
          )
          .eq("active", true)
      : Promise.resolve({
          data: [],
          error: null,
        }),
  ]);

  if (servicesResult.error) {
    throw servicesResult.error;
  }

  if (variationsResult.error) {
    throw variationsResult.error;
  }

  const serviceMap =
    new Map(
      (servicesResult.data || []).map(
        (service) => [
          String(service.id),
          service,
        ]
      )
    );

  const variationMap =
    new Map(
      (variationsResult.data || []).map(
        (variation) => [
          String(variation.id),
          variation,
        ]
      )
    );

  if (
    serviceMap.size !==
    serviceIds.length
  ) {
    throw new Error(
      "One or more selected services are invalid or inactive."
    );
  }

  let total = 0;
  let duration = 0;

  const resolved =
    selections.map(
      (selection) => {
        const service =
          serviceMap.get(
            selection.serviceId
          );

        if (!service) {
          throw new Error(
            "Selected service could not be found."
          );
        }

        const variation =
          selection.variationId
            ? variationMap.get(
                selection.variationId
              )
            : null;

        if (
          selection.variationId &&
          !variation
        ) {
          throw new Error(
            "One or more selected variations are invalid or inactive."
          );
        }

        if (
          variation &&
          String(
            variation.service_id
          ) !==
            String(service.id)
        ) {
          throw new Error(
            "A selected variation does not belong to its service."
          );
        }

        const servicePrice =
          Number(
            service.price || 0
          );

        const variationPrice =
          Number(
            variation?.price_delta ||
              0
          );

        const serviceDuration =
          Number(
            service.duration_minutes ||
              0
          );

        const variationDuration =
          Number(
            variation?.duration_delta_minutes ||
              0
          );

        const price =
          servicePrice +
          variationPrice;

        const itemDuration =
          Math.max(
            0,
            serviceDuration +
              variationDuration
          );

        total += price;
        duration += itemDuration;

        return {
          service_id:
            service.id,
          variation_id:
            variation?.id || null,
          service_name:
            service.name,
          variation_name:
            variation?.name || null,
          price,
          duration_minutes:
            itemDuration,
        };
      }
    );

  return {
    total,
    duration: Math.max(
      30,
      duration
    ),
    services: resolved,
  };
}

async function validateAvailability(
  db: ReturnType<typeof supabaseAdmin>,
  bookingId: string,
  date: string,
  time: string,
  duration: number
) {
  const selectedStart =
    toMinutes(time);

  if (selectedStart === null) {
    throw new Error(
      "Invalid appointment time."
    );
  }

  const selectedDuration =
    Math.max(
      30,
      Number(duration || 30)
    );

  const selectedEnd =
    selectedStart +
    selectedDuration;

  const dayOfWeek =
    new Date(
      `${date}T00:00:00Z`
    ).getUTCDay();

  const [
    ruleResult,
    overridesResult,
    bookingsResult,
  ] = await Promise.all([
    db
      .from("availability_rules")
      .select(
        "day_of_week,is_available,start_time,end_time,active"
      )
      .eq(
        "day_of_week",
        dayOfWeek
      )
      .eq("active", true)
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
        "id,preferred_time,status"
      )
      .eq(
        "preferred_date",
        date
      )
      .in("status", [
        "pending",
        "approved",
        "payment_submitted",
        "confirmed",
      ])
      .neq("id", bookingId),
  ]);

  if (ruleResult.error) {
    throw ruleResult.error;
  }

  if (overridesResult.error) {
    throw overridesResult.error;
  }

  if (bookingsResult.error) {
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

  for (
    const override of
      overridesResult.data || []
  ) {
    if (
      override.kind !== "open"
    ) {
      continue;
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

  for (
    const override of
      overridesResult.data || []
  ) {
    if (
      override.kind !== "block"
    ) {
      continue;
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
      blockStart === null ||
      blockEnd === null ||
      blockEnd <= blockStart
    ) {
      continue;
    }

    const nextWindows: Array<
      [number, number]
    > = [];

    for (
      const [start, end] of
        windows
    ) {
      if (
        blockEnd <= start ||
        blockStart >= end
      ) {
        nextWindows.push([
          start,
          end,
        ]);
        continue;
      }

      if (
        blockStart > start
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
        blockEnd < end
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

    windows =
      nextWindows;
  }

  const insideAvailability =
    windows.some(
      ([start, end]) =>
        selectedStart >= start &&
        selectedEnd <= end
    );

  if (!insideAvailability) {
    throw new Error(
      "The selected appointment time is outside the studio's available hours."
    );
  }

  const bookingIds =
    (
      bookingsResult.data || []
    ).map(
      (booking) => booking.id
    );

  const durationByBooking =
    new Map<
      string,
      number
    >();

  if (bookingIds.length) {
    const servicesResult =
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
      servicesResult.error
    ) {
      throw servicesResult.error;
    }

    for (
      const row of
        servicesResult.data ||
        []
    ) {
      const key =
        String(
          row.booking_id
        );

      durationByBooking.set(
        key,
        (
          durationByBooking.get(
            key
          ) || 0
        ) +
          Number(
            row.duration_minutes ||
              0
          )
      );
    }
  }

  const conflict =
    (
      bookingsResult.data ||
      []
    ).some(
      (existing) => {
        const existingStart =
          toMinutes(
            existing.preferred_time
          );

        if (
          existingStart === null
        ) {
          return false;
        }

        const existingDuration =
          Math.max(
            30,
            durationByBooking.get(
              String(
                existing.id
              )
            ) || 60
          );

        return overlaps(
          selectedStart,
          selectedEnd,
          existingStart,
          existingStart +
            existingDuration
        );
      }
    );

  if (conflict) {
    throw new Error(
      "The selected appointment time is already booked."
    );
  }
}

/*
 * POST
 */
export async function POST(
  request: NextRequest
) {
  try {
    const db =
      await getAdminDb();

    if (!db) {
      return jsonError(
        "Unauthorized",
        401
      );
    }

    const formData =
      await request.formData();

    const action =
      String(
        formData.get(
          "action"
        ) || ""
      )
        .trim()
        .toLowerCase();

    const id =
      String(
        formData.get(
          "id"
        ) || ""
      ).trim();

    if (!id) {
      return jsonError(
        "Booking ID is required."
      );
    }

    if (
      action ===
      "verify_discount"
    ) {
      const {
        data: booking,
        error:
          bookingError,
      } = await db
        .from("bookings")
        .select(
          "id,promo_name,discount_verified"
        )
        .eq("id", id)
        .single();

      if (
        bookingError ||
        !booking
      ) {
        return jsonError(
          "Booking not found.",
          404
        );
      }

      if (!booking.promo_name) {
        return jsonError(
          "No discount was selected for this booking."
        );
      }

      if (
        booking.discount_verified
      ) {
        return jsonError(
          "This discount has already been verified."
        );
      }

      const now =
        new Date().toISOString();

      const { error } =
        await db
          .from("bookings")
          .update({
            discount_verified:
              true,
            discount_verified_at:
              now,
          })
          .eq("id", id)
          .eq(
            "discount_verified",
            false
          );

      if (error) {
        throw error;
      }

      return NextResponse.redirect(
        new URL(
          `/admin/bookings/${id}`,
          request.url
        )
      );
    }

    if (
      action ===
      "unverify_discount"
    ) {
      const { error } =
        await db
          .from("bookings")
          .update({
            discount_verified:
              false,
            discount_verified_at:
              null,
            discount_amount:
              0,
          })
          .eq("id", id);

      if (error) {
        throw error;
      }

      return NextResponse.redirect(
        new URL(
          `/admin/bookings/${id}`,
          request.url
        )
      );
    }

    if (
      action ===
      "verify_payment"
    ) {
      const paymentId =
        String(
          formData.get(
            "payment_id"
          ) || ""
        ).trim();

      if (!paymentId) {
        return jsonError(
          "Payment ID is required."
        );
      }

      const {
        data: payment,
        error:
          paymentLookupError,
      } = await db
        .from("payments")
        .select(
          "id,booking_id,amount,status"
        )
        .eq(
          "id",
          paymentId
        )
        .eq(
          "booking_id",
          id
        )
        .maybeSingle();

      if (
        paymentLookupError
      ) {
        throw paymentLookupError;
      }

      if (!payment) {
        return jsonError(
          "Payment not found.",
          404
        );
      }

      if (
        payment.status ===
        "verified"
      ) {
        return jsonError(
          "This payment is already verified."
        );
      }

      const now =
        new Date().toISOString();

      const { error } =
        await db
          .from("payments")
          .update({
            status:
              "verified",
            verified_at:
              now,
          })
          .eq(
            "id",
            paymentId
          )
          .eq(
            "booking_id",
            id
          );

      if (error) {
        throw error;
      }

      return NextResponse.redirect(
        new URL(
          `/admin/bookings/${id}`,
          request.url
        )
      );
    }

    return jsonError(
      "Invalid booking action."
    );
  } catch (error: any) {
    console.error(
      "Admin bookings POST error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to process booking action.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * PATCH
 */
export async function PATCH(
  request: NextRequest
) {
  try {
    const db =
      await getAdminDb();

    if (!db) {
      return jsonError(
        "Unauthorized",
        401
      );
    }

    /*
     * Run the expiry check whenever
     * the admin booking API is used.
     *
     * The dedicated scheduled job we add
     * next will handle true unattended
     * automatic cancellation.
     */
    try {
      await expireOverdueApprovedBookings(
        db
      );
    } catch (expiryError) {
      console.error(
        "Payment deadline expiry check failed:",
        expiryError
      );
    }

    const body =
      await request
        .json()
        .catch(() => ({}));

    const action =
      String(
        body.action || ""
      )
        .trim()
        .toLowerCase();

    const id =
      String(
        body.id || ""
      ).trim();

    if (!id) {
      return jsonError(
        "Booking ID is required."
      );
    }

    /*
     * EDIT BOOKING
     */
    if (action === "edit") {
      const {
        data: existingBooking,
        error:
          existingBookingError,
      } = await db
        .from("bookings")
        .select(
          "id,status,estimated_total,down_payment,promo_name,discount_verified"
        )
        .eq("id", id)
        .maybeSingle();

      if (
        existingBookingError
      ) {
        throw existingBookingError;
      }

      if (!existingBooking) {
        return jsonError(
          "Booking not found.",
          404
        );
      }

      const customerName =
        String(
          body.customer_name ||
            ""
        ).trim();

      const mobileNumber =
        String(
          body.mobile_number ||
            ""
        ).trim();

      const socialHandle =
        String(
          body.social_handle ||
            ""
        ).trim();

      const preferredDate =
        String(
          body.preferred_date ||
            ""
        ).trim();

      const preferredTime =
        normalizeTime(
          body.preferred_time
        );

      const removal =
        String(
          body.removal ||
            ""
        ).trim();

      const notes =
        String(
          body.notes ||
            ""
        ).trim();

      if (!customerName) {
        return jsonError(
          "Customer name is required."
        );
      }

      if (!mobileNumber) {
        return jsonError(
          "Mobile number is required."
        );
      }

      if (
        !isValidDate(
          preferredDate
        )
      ) {
        return jsonError(
          "A valid appointment date is required."
        );
      }

      if (!preferredTime) {
        return jsonError(
          "A valid appointment time is required."
        );
      }

      const calculated =
        await calculateServicesTotal(
          db,
          body.services
        );

      await validateAvailability(
        db,
        id,
        preferredDate,
        preferredTime,
        calculated.duration
      );

      let discountAmount = 0;

      if (
        existingBooking.discount_verified &&
        existingBooking.promo_name
      ) {
        discountAmount =
          Math.round(
            calculated.total *
              0.05 *
              100
          ) / 100;
      }

      const finalTotal =
        Math.max(
          0,
          Math.round(
            (
              calculated.total -
              discountAmount
            ) *
              100
          ) / 100
        );

      const currentDownPayment =
        Number(
          existingBooking.down_payment ||
            0
        );

      const {
        error:
          bookingUpdateError,
      } = await db
        .from("bookings")
        .update({
          customer_name:
            customerName,
          mobile_number:
            mobileNumber,
          social_handle:
            socialHandle ||
            null,
          preferred_date:
            preferredDate,
          preferred_time:
            preferredTime,
          removal:
            removal || null,
          notes:
            notes || null,
          estimated_total:
            finalTotal,
          discount_amount:
            discountAmount,
        })
        .eq("id", id);

      if (
        bookingUpdateError
      ) {
        throw bookingUpdateError;
      }

      const {
        error:
          deleteServicesError,
      } = await db
        .from("booking_services")
        .delete()
        .eq(
          "booking_id",
          id
        );

      if (
        deleteServicesError
      ) {
        throw deleteServicesError;
      }

      const rows =
        calculated.services.map(
          (service) => ({
            booking_id: id,
            service_id:
              service.service_id,
            variation_id:
              service.variation_id,
            service_name:
              service.service_name,
            variation_name:
              service.variation_name,
            price:
              service.price,
            duration_minutes:
              service.duration_minutes,
          })
        );

      const {
        error:
          insertServicesError,
      } = await db
        .from("booking_services")
        .insert(rows);

      if (
        insertServicesError
      ) {
        throw insertServicesError;
      }

      return NextResponse.json({
        ok: true,
        id,
        estimated_total:
          finalTotal,
        original_total:
          calculated.total,
        discount_amount:
          discountAmount,
        down_payment:
          currentDownPayment,
        duration:
          calculated.duration,
        services:
          calculated.services,
      });
    }

    /*
     * RECORD PAYMENT
     */
    if (
      action ===
      "record_payment"
    ) {
      const paymentType =
        String(
          body.payment_type ||
            ""
        )
          .trim()
          .toLowerCase();

      const method =
        String(
          body.method ||
            ""
        ).trim();

      const amount =
        Number(
          body.amount
        );

      const note =
        String(
          body.note ||
            ""
        ).trim();

      if (
        !PAYMENT_TYPES.includes(
          paymentType as (
            typeof PAYMENT_TYPES
          )[number]
        )
      ) {
        return jsonError(
          "Invalid payment type."
        );
      }

      if (
        !PAYMENT_METHODS.includes(
          method as (
            typeof PAYMENT_METHODS
          )[number]
        )
      ) {
        return jsonError(
          "Invalid payment method."
        );
      }

      if (
        !Number.isFinite(
          amount
        ) ||
        amount <= 0
      ) {
        return jsonError(
          "Payment amount must be greater than zero."
        );
      }

      const {
        data: booking,
        error:
          bookingLookupError,
      } = await db
        .from("bookings")
        .select(
          "id,estimated_total,down_payment"
        )
        .eq("id", id)
        .maybeSingle();

      if (
        bookingLookupError
      ) {
        throw bookingLookupError;
      }

      if (!booking) {
        return jsonError(
          "Booking not found.",
          404
        );
      }

      const now =
        new Date().toISOString();

      const {
        data: payment,
        error:
          paymentInsertError,
      } = await db
        .from("payments")
        .insert({
          booking_id:
            id,
          method,
          amount,
          status:
            "verified",
          verified_at:
            now,
          payment_type:
            paymentType,
          gross_amount:
            amount,
          processing_fee:
            0,
          net_amount:
            amount,
          note:
            note || null,
          paid_at:
            now,
        })
        .select(
          "id,booking_id,method,amount,status,payment_type,gross_amount,processing_fee,net_amount,note,paid_at,verified_at,created_at"
        )
        .single();

      if (
        paymentInsertError
      ) {
        throw paymentInsertError;
      }

      if (
        paymentType ===
        "balance"
      ) {
        const currentDownPayment =
          Number(
            booking.down_payment ||
              0
          );

        const newDownPayment =
          Math.round(
            (
              currentDownPayment +
              amount
            ) *
              100
          ) / 100;

        const {
          error:
            downPaymentError,
        } = await db
          .from("bookings")
          .update({
            down_payment:
              newDownPayment,
          })
          .eq(
            "id",
            id
          );

        if (
          downPaymentError
        ) {
          await db
            .from("payments")
            .delete()
            .eq(
              "id",
              payment.id
            );

          throw downPaymentError;
        }
      }

      return NextResponse.json({
        ok: true,
        payment,
      });
    }

    /*
     * NORMAL BOOKING LOOKUP
     *
     * Email is included here because the
     * completed notification needs the
     * customer's email address.
     */
    const {
      data: booking,
      error: bookingError,
    } = await db
      .from("bookings")
      .select(
        "id,status,reference_code,customer_name,email,promo_name,estimated_total,discount_verified,approved_at"
      )
      .eq("id", id)
      .single();

    if (
      bookingError ||
      !booking
    ) {
      return jsonError(
        "Booking not found.",
        404
      );
    }

    const now =
      new Date();

    const nowIso =
      now.toISOString();

    /*
     * ADMIN OVERRIDE
     *
     * Emergency-only status correction.
     * This intentionally bypasses the normal
     * booking workflow transitions.
     */
    if (action === "admin_override") {
      const overrideStatus =
        String(
          body.status || ""
        )
          .trim()
          .toLowerCase();

      const ADMIN_OVERRIDE_STATUSES = [
        "pending",
        "approved",
        "payment_submitted",
        "confirmed",
        "completed",
        "cancelled",
        "rejected",
      ] as const;

      if (
        !ADMIN_OVERRIDE_STATUSES.includes(
          overrideStatus as (
            typeof ADMIN_OVERRIDE_STATUSES
          )[number]
        )
      ) {
        return jsonError(
          "Invalid admin override status."
        );
      }

      if (
        booking.status ===
        overrideStatus
      ) {
        return jsonError(
          "Booking is already in that status."
        );
      }

      const patch: Record<
        string,
        unknown
      > = {
        status:
          overrideStatus,
      };

      /*
       * If the admin forces the booking
       * back to approved, restart the
       * 3-hour payment timer from now.
       */
      if (
        overrideStatus ===
        "approved"
      ) {
        patch.approved_at =
          nowIso;
      }

      /*
       * Record the appropriate milestone
       * timestamp when forcing a booking
       * forward.
       */
      if (
        overrideStatus ===
        "confirmed"
      ) {
        patch.confirmed_at =
          nowIso;
      }

      if (
        overrideStatus ===
        "completed"
      ) {
        patch.completed_at =
          nowIso;
      }

      /*
       * A forced cancellation gets a clear
       * internal cancellation record.
       */
      if (
        overrideStatus ===
        "cancelled"
      ) {
        patch.cancelled_at =
          nowIso;

        patch.cancellation_reason =
          "Other";

        patch.cancellation_note =
          "Booking status changed by admin emergency override.";
      } else {
        /*
         * If recovering a cancelled booking,
         * remove the cancellation state.
         */
        patch.cancelled_at =
          null;

        patch.cancellation_reason =
          null;

        patch.cancellation_note =
          null;
      }

      const { error } =
        await db
          .from("bookings")
          .update(patch)
          .eq("id", id);

      if (error) {
        throw error;
      }

      /*
       * If Admin Override moves a booking
       * directly to COMPLETED, send the same
       * customer completion/review email.
       *
       * Notification failure must NOT undo
       * the successful status change.
       */
      if (
        overrideStatus ===
        "completed"
      ) {
        try {
          await notifyBookingCompleted({
            booking: {
              id:
                booking.id,
              reference_code:
                booking.reference_code,
              customer_name:
                booking.customer_name,
              email:
                booking.email,
            },
          });
        } catch (
          notificationError
        ) {
          console.error(
            "Completed booking customer email failed:",
            notificationError
          );
        }
      }

      return NextResponse.json({
        ok: true,
        status:
          overrideStatus,
      });
    }

    /*
     * APPROVE
     *
     * This is where the 3-hour payment
     * window begins.
     */
    if (
      action === "approve"
    ) {
      if (
        booking.status !==
        "pending"
      ) {
        return jsonError(
          "Only pending bookings can be approved."
        );
      }

      const approvedAt =
        nowIso;

      const paymentDeadline =
        new Date(
          now.getTime() +
            PAYMENT_DEADLINE_MS
        ).toISOString();

      const { error } =
        await db
          .from("bookings")
          .update({
            status:
              "approved",

            /*
             * This timestamp starts the
             * 3-hour payment timer.
             */
            approved_at:
              approvedAt,
          })
          .eq("id", id)
          .eq(
            "status",
            "pending"
          );

      if (error) {
        throw error;
      }

      return NextResponse.json({
        ok: true,
        status:
          "approved",
        approved_at:
          approvedAt,
        payment_deadline:
          paymentDeadline,
        payment_deadline_hours:
          PAYMENT_DEADLINE_HOURS,
      });
    }

    /*
     * REJECT
     */
    if (
      action === "reject"
    ) {
      if (
        ![
          "pending",
          "approved",
        ].includes(
          String(
            booking.status
          )
        )
      ) {
        return jsonError(
          "This booking cannot be rejected from its current status."
        );
      }

      const { error } =
        await db
          .from("bookings")
          .update({
            status:
              "rejected",
          })
          .eq("id", id)
          .in(
            "status",
            [
              "pending",
              "approved",
            ]
          );

      if (error) {
        throw error;
      }

      return NextResponse.json({
        ok: true,
        status:
          "rejected",
      });
    }

    /*
     * CANCEL
     */
    if (
      action === "cancel"
    ) {
      const reason =
        String(
          body.reason ||
            ""
        ).trim();

      const otherReason =
        String(
          body.other_reason ||
            ""
        ).trim();

      if (
        !CANCELLATION_REASONS.includes(
          reason as (
            typeof CANCELLATION_REASONS
          )[number]
        )
      ) {
        return jsonError(
          "A valid cancellation reason is required."
        );
      }

      if (
        reason === "Other" &&
        !otherReason
      ) {
        return jsonError(
          "Please provide the cancellation reason."
        );
      }

      const cancellationReason =
        reason === "Other"
          ? `Other: ${otherReason}`
          : reason;

      if (
        booking.status ===
        "cancelled"
      ) {
        return jsonError(
          "This booking is already cancelled."
        );
      }

      if (
        booking.status ===
        "completed"
      ) {
        return jsonError(
          "Completed bookings cannot be cancelled."
        );
      }

      const {
        error,
      } = await db
        .from("bookings")
        .update({
          status:
            "cancelled",
          cancellation_reason:
            cancellationReason,
          cancellation_note:
            reason ===
            "Other"
              ? otherReason
              : null,
          cancelled_at:
            nowIso,
        })
        .eq("id", id)
        .neq(
          "status",
          "cancelled"
        );

      if (error) {
        throw error;
      }

      return NextResponse.json({
        ok: true,
        status:
          "cancelled",
        cancellation_reason:
          cancellationReason,
        cancellation_note:
          reason ===
          "Other"
            ? otherReason
            : null,
        cancelled_at:
          nowIso,
      });
    }

    /*
     * RESET
     */
    if (
      action ===
      "reset"
    ) {
      const resetStatus =
        String(
          body.status ||
            ""
        )
          .trim()
          .toLowerCase();

      if (
        !RESET_STATUSES.includes(
          resetStatus as (
            typeof RESET_STATUSES
          )[number]
        )
      ) {
        return jsonError(
          "Invalid reset status."
        );
      }

      const patch: Record<
        string,
        unknown
      > = {
        status:
          resetStatus,
      };

      if (
        resetStatus !==
        "confirmed"
      ) {
        patch.confirmed_at =
          null;
      }

      patch.cancelled_at =
        null;

      patch.cancellation_reason =
        null;

      patch.cancellation_note =
        null;

      const { error } =
        await db
          .from("bookings")
          .update(patch)
          .eq("id", id);

      if (error) {
        throw error;
      }

      return NextResponse.json({
        ok: true,
        status:
          resetStatus,
      });
    }

    /*
     * VERIFY DISCOUNT
     */
    if (
      action ===
      "verify_discount"
    ) {
      if (!booking.promo_name) {
        return jsonError(
          "No discount was selected for this booking."
        );
      }

      if (
        booking.discount_verified
      ) {
        return jsonError(
          "This discount has already been verified."
        );
      }

      const {
        error,
      } = await db
        .from("bookings")
        .update({
          discount_verified:
            true,
          discount_verified_at:
            nowIso,
          discount_amount:
            Math.round(
              Number(
                booking.estimated_total ||
                  0
              ) *
                0.05 *
                100
            ) / 100,
        })
        .eq("id", id)
        .eq(
          "discount_verified",
          false
        );

      if (error) {
        throw error;
      }

      return NextResponse.json({
        ok: true,
        discount_verified:
          true,
        discount_verified_at:
          nowIso,
        discount_rate:
          5,
      });
    }

    /*
     * UNVERIFY DISCOUNT
     */
    if (
      action ===
      "unverify_discount"
    ) {
      const {
        error,
      } = await db
        .from("bookings")
        .update({
          discount_verified:
            false,
          discount_verified_at:
            null,
          discount_amount:
            0,
        })
        .eq("id", id);

      if (error) {
        throw error;
      }

      return NextResponse.json({
        ok: true,
        discount_verified:
          false,
        discount_verified_at:
          null,
        discount_amount:
          0,
      });
    }

    /*
     * VERIFY PAYMENT
     */
    if (
      action ===
      "verify_payment"
    ) {
      const paymentId =
        String(
          body.payment_id ||
            ""
        ).trim();

      if (!paymentId) {
        return jsonError(
          "Payment ID is required."
        );
      }

      const {
        data: payment,
        error:
          paymentLookupError,
      } = await db
        .from("payments")
        .select(
          "id,booking_id,amount,status,payment_type"
        )
        .eq(
          "id",
          paymentId
        )
        .eq(
          "booking_id",
          id
        )
        .maybeSingle();

      if (
        paymentLookupError
      ) {
        throw paymentLookupError;
      }

      if (!payment) {
        return jsonError(
          "Payment not found.",
          404
        );
      }

      if (
        payment.status ===
        "verified"
      ) {
        return jsonError(
          "This payment is already verified."
        );
      }

      const {
        error,
      } = await db
        .from("payments")
        .update({
          status:
            "verified",
          verified_at:
            nowIso,
        })
        .eq(
          "id",
          paymentId
        )
        .eq(
          "booking_id",
          id
        );

      if (error) {
        throw error;
      }

      return NextResponse.json({
        ok: true,
        payment_id:
          paymentId,
        status:
          "verified",
        verified_at:
          nowIso,
      });
    }

    /*
     * MARK COMPLETED
     */
    if (
      action === "complete"
    ) {
      if (
        booking.status !==
        "confirmed"
      ) {
        return jsonError(
          "Only confirmed bookings can be marked completed."
        );
      }

      const {
        error,
      } = await db
        .from("bookings")
        .update({
          status:
            "completed",
          completed_at:
            nowIso,
        })
        .eq("id", id)
        .eq(
          "status",
          "confirmed"
        );

      if (error) {
        throw error;
      }

      /*
       * Send the customer their completion
       * email with the review link.
       *
       * Notification failure must NOT cause
       * the completed status update to fail.
       */
      try {
        await notifyBookingCompleted({
          booking: {
            id:
              booking.id,
            reference_code:
              booking.reference_code,
            customer_name:
              booking.customer_name,
            email:
              booking.email,
          },
        });
      } catch (
        notificationError
      ) {
        console.error(
          "Completed booking customer email failed:",
          notificationError
        );
      }

      const reviewUrl =
        `/review?booking_id=${encodeURIComponent(
          id
        )}`;

      return NextResponse.json({
        ok: true,
        status:
          "completed",
        completed_at:
          nowIso,
        review_url:
          reviewUrl,
      });
    }

    /*
     * DELETE BOOKING
     */
    if (
      action === "delete"
    ) {
      if (
        body.confirm !==
        true
      ) {
        return jsonError(
          "Delete confirmation is required."
        );
      }

      const {
        data:
          paymentProofs,
      } = await db
        .from(
          "payment_proofs"
        )
        .select(
          "bucket,path"
        )
        .eq(
          "booking_id",
          id
        );

      const {
        data:
          bookingFiles,
      } = await db
        .from(
          "booking_files"
        )
        .select(
          "bucket,path"
        )
        .eq(
          "booking_id",
          id
        );

      const paymentProofDelete =
        await db
          .from(
            "payment_proofs"
          )
          .delete()
          .eq(
            "booking_id",
            id
          );

      if (
        paymentProofDelete.error
      ) {
        throw paymentProofDelete.error;
      }

      const bookingFilesDelete =
        await db
          .from(
            "booking_files"
          )
          .delete()
          .eq(
            "booking_id",
            id
          );

      if (
        bookingFilesDelete.error
      ) {
        throw bookingFilesDelete.error;
      }

      const bookingServicesDelete =
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
        bookingServicesDelete.error
      ) {
        throw bookingServicesDelete.error;
      }

      const paymentsDelete =
        await db
          .from("payments")
          .delete()
          .eq(
            "booking_id",
            id
          );

      if (
        paymentsDelete.error
      ) {
        throw paymentsDelete.error;
      }

      const {
        error:
          bookingDeleteError,
      } = await db
        .from("bookings")
        .delete()
        .eq("id", id);

      if (
        bookingDeleteError
      ) {
        throw bookingDeleteError;
      }

      const storageGroups =
        [
          paymentProofs ||
            [],
          bookingFiles ||
            [],
        ];

      for (
        const files of
          storageGroups
      ) {
        const grouped =
          new Map<
            string,
            string[]
          >();

        for (
          const file of
            files
        ) {
          if (
            !file?.bucket ||
            !file?.path
          ) {
            continue;
          }

          const existing =
            grouped.get(
              file.bucket
            ) || [];

          existing.push(
            file.path
          );

          grouped.set(
            file.bucket,
            existing
          );
        }

        for (
          const [
            bucket,
            paths,
          ] of grouped
        ) {
          if (
            paths.length ===
            0
          ) {
            continue;
          }

          const {
            error:
              storageError,
          } =
            await db.storage
              .from(
                bucket
              )
              .remove(
                paths
              );

          if (
            storageError
          ) {
            console.error(
              "Storage cleanup failed:",
              {
                bookingId:
                  id,
                bucket,
                storageError,
              }
            );
          }
        }
      }

      return NextResponse.json({
        ok: true,
        deleted:
          true,
        id,
      });
    }

    return jsonError(
      "Invalid booking action."
    );
  } catch (error: any) {
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