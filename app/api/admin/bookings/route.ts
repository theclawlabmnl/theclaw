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

import {
  notifyBookingCompleted,
  notifyBookingConfirmed,
} from "@/lib/notifications";

const RESET_STATUSES = [
  "pending",
  "approved",
  "payment_submitted",
  "confirmed",
];

const CANCELLATION_REASONS = [
  "Cancelled by client",
  "No-show",
  "Cancelled by Nailtech",
  "Other",
];

const ADMIN_OVERRIDE_STATUSES = [
  "pending",
  "approved",
  "payment_submitted",
  "confirmed",
  "completed",
  "cancelled",
  "rejected",
];

const PAYMENT_DEADLINE_HOURS = 3;

const PAYMENT_DEADLINE_REASON =
  "Payment deadline expired";

const PAYMENT_DEADLINE_NOTE =
  "Booking was automatically cancelled because payment was not submitted within 3 hours of approval.";

type AdminContext = {
  db: ReturnType<typeof supabaseAdmin>;
  user: {
    id: string;
    email?: string | null;
  };
  admin: {
    id: string;
  };
};

type BookingStatus =
  | "pending"
  | "approved"
  | "payment_submitted"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "rejected";

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeTime(value: unknown) {
  const raw = String(value || "").trim();

  if (!raw) {
    return "";
  }

  const match = raw.match(
    /^(\d{1,2}):(\d{2})(?::\d{2})?$/
  );

  if (!match) {
    return raw;
  }

  return `${String(Number(match[1])).padStart(
    2,
    "0"
  )}:${match[2]}`;
}

function normalizePaymentType(value: unknown) {
  return String(value || "other")
    .trim()
    .toLowerCase();
}

function paymentNetAmount(payment: any) {
  return Number(
    payment?.net_amount ??
      payment?.amount ??
      0
  );
}

function effectiveBookingTotal(booking: any) {
  const originalTotal = Number(
    booking?.estimated_total || 0
  );

  const discount = booking?.discount_verified
    ? Number(booking?.discount_amount || 0)
    : 0;

  return Math.max(
    0,
    roundMoney(originalTotal - discount)
  );
}

async function getAdminDb(): Promise<
  AdminContext | null
> {
  const session =
    await supabaseServer();

  const {
    data: { user },
  } = await session.auth.getUser();

  if (!user) {
    return null;
  }

  const db = supabaseAdmin();

  const {
    data: admin,
    error,
  } = await db
    .from("admins")
    .select("id")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error(
      "Admin lookup error:",
      error
    );
    return null;
  }

  if (!admin) {
    return null;
  }

  return {
    db,
    user: {
      id: user.id,
      email: user.email,
    },
    admin,
  };
}

async function recordActivity(
  db: ReturnType<typeof supabaseAdmin>,
  {
    bookingId,
    action,
    description,
    oldValue,
    newValue,
    actorId,
    actorEmail,
  }: {
    bookingId: string;
    action: string;
    description: string;
    oldValue?: unknown;
    newValue?: unknown;
    actorId?: string | null;
    actorEmail?: string | null;
  }
) {
  try {
    const { error } = await db
      .from("booking_activity_logs")
      .insert({
        booking_id: bookingId,
        action,
        description,
        old_value:
          oldValue == null
            ? null
            : typeof oldValue === "string"
            ? oldValue
            : JSON.stringify(oldValue),
        new_value:
          newValue == null
            ? null
            : typeof newValue === "string"
            ? newValue
            : JSON.stringify(newValue),
        actor_id: actorId || null,
        actor_email: actorEmail || null,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error(
        "Booking activity log error:",
        error
      );
    }
  } catch (error) {
    console.error(
      "Booking activity log exception:",
      error
    );
  }
}

function getPaymentDeadline(
  approvedAt: string
) {
  return new Date(
    new Date(approvedAt).getTime() +
      PAYMENT_DEADLINE_HOURS *
        60 *
        60 *
        1000
  );
}

async function expireOverdueApprovedBookings(
  db: ReturnType<typeof supabaseAdmin>
) {
  const { data: bookings, error } =
    await db
      .from("bookings")
      .select("id,status,approved_at")
      .eq("status", "approved")
      .not("approved_at", "is", null);

  if (error) {
    console.error(
      "Unable to check payment deadlines:",
      error
    );
    return;
  }

  const now = new Date();

  for (const booking of bookings || []) {
    if (!booking.approved_at) {
      continue;
    }

    const deadline = getPaymentDeadline(
      booking.approved_at
    );

    if (now <= deadline) {
      continue;
    }

    const { error: updateError } =
      await db
        .from("bookings")
        .update({
          status: "cancelled",
          cancelled_at: now.toISOString(),
          cancellation_reason:
            PAYMENT_DEADLINE_REASON,
          cancellation_note:
            PAYMENT_DEADLINE_NOTE,
        })
        .eq("id", booking.id)
        .eq("status", "approved");

    if (updateError) {
      console.error(
        "Unable to expire booking:",
        updateError
      );
      continue;
    }

    await recordActivity(db, {
      bookingId: booking.id,
      action: "automatic_cancellation",
      description:
        PAYMENT_DEADLINE_NOTE,
      oldValue: "approved",
      newValue: "cancelled",
      actorId: null,
      actorEmail: null,
    });
  }
}

async function calculateServicesTotal(
  db: ReturnType<typeof supabaseAdmin>,
  services: Array<{
    service_id: string;
    variation_id?: string | null;
  }>
) {
  if (!services.length) {
    throw new Error(
      "At least one service is required."
    );
  }

  const serviceIds = services.map(
    (service) => service.service_id
  );

  const variationIds = services
    .map((service) => service.variation_id)
    .filter(
      (id): id is string => Boolean(id)
    );

  const {
    data: serviceRows,
    error: serviceError,
  } = await db
    .from("services")
    .select(
      "id,name,price,duration_minutes"
    )
    .in("id", serviceIds)
    .eq("active", true);

  if (serviceError) {
    throw serviceError;
  }

  const {
    data: variationRows,
    error: variationError,
  } = variationIds.length
    ? await db
        .from("service_variations")
        .select(
          "id,service_id,name,price_delta,duration_delta_minutes"
        )
        .in("id", variationIds)
        .eq("active", true)
    : {
        data: [],
        error: null,
      };

  if (variationError) {
    throw variationError;
  }

  const serviceMap = new Map(
    (serviceRows || []).map((service) => [
      String(service.id),
      service,
    ])
  );

  const variationMap = new Map(
    (variationRows || []).map(
      (variation) => [
        String(variation.id),
        variation,
      ]
    )
  );

  let total = 0;
  let duration = 0;

  const resolved = services.map(
    (service) => {
      const baseService = serviceMap.get(
        service.service_id
      );

      if (!baseService) {
        throw new Error(
          "One or more selected services are unavailable."
        );
      }

      const variation = service.variation_id
        ? variationMap.get(
            service.variation_id
          )
        : null;

      if (
        variation &&
        String(variation.service_id) !==
          String(service.service_id)
      ) {
        throw new Error(
          "Invalid service variation."
        );
      }

      const price =
        Number(baseService.price || 0) +
        Number(
          variation?.price_delta || 0
        );

      const durationMinutes =
        Number(
          baseService.duration_minutes || 0
        ) +
        Number(
          variation?.duration_delta_minutes ||
            0
        );

      total += price;
      duration += durationMinutes;

      return {
        service_id: String(baseService.id),
        variation_id: variation
          ? String(variation.id)
          : null,
        service_name: String(
          baseService.name
        ),
        variation_name: variation
          ? String(variation.name)
          : null,
        price: roundMoney(price),
        duration_minutes:
          durationMinutes,
      };
    }
  );

  return {
    total: roundMoney(total),
    duration: Math.max(30, duration),
    services: resolved,
  };
}

async function validateAvailability(
  db: ReturnType<typeof supabaseAdmin>,
  {
    bookingId,
    preferredDate,
    preferredTime,
    durationMinutes,
  }: {
    bookingId?: string;
    preferredDate: string;
    preferredTime: string;
    durationMinutes: number;
  }
) {
  const { data: override } = await db
    .from("availability_overrides")
    .select("id,available")
    .eq("date", preferredDate)
    .maybeSingle();

  if (
    override &&
    override.available === false
  ) {
    throw new Error(
      "The selected date is unavailable."
    );
  }

  const { data: bookings, error } =
    await db
      .from("bookings")
      .select(
        `
          id,
          preferred_date,
          preferred_time,
          status,
          booking_services(
            duration_minutes
          )
        `
      )
      .eq("preferred_date", preferredDate)
      .in("status", [
        "pending",
        "approved",
        "payment_submitted",
        "confirmed",
      ]);

  if (error) {
    throw error;
  }

  const newStart = new Date(
    `${preferredDate}T${preferredTime}`
  ).getTime();

  const newEnd =
    newStart +
    durationMinutes * 60 * 1000;

  for (const booking of bookings || []) {
    if (
      bookingId &&
      booking.id === bookingId
    ) {
      continue;
    }

    if (!booking.preferred_time) {
      continue;
    }

    const existingDuration = (
      booking.booking_services || []
    ).reduce(
      (sum: number, service: any) =>
        sum +
        Number(
          service.duration_minutes || 0
        ),
      0
    );

    const existingStart = new Date(
      `${preferredDate}T${booking.preferred_time}`
    ).getTime();

    const existingEnd =
      existingStart +
      existingDuration * 60 * 1000;

    if (
      newStart < existingEnd &&
      newEnd > existingStart
    ) {
      throw new Error(
        "The selected time is no longer available."
      );
    }
  }
}

async function calculatePromoSelection(
  db: ReturnType<typeof supabaseAdmin>,
  {
    promoChoice,
    discountCategory,
    referralName,
    manualDiscountAmount,
    baseTotal,
  }: {
    promoChoice: string;
    discountCategory: string;
    referralName: string;
    manualDiscountAmount: number;
    baseTotal: number;
  }
) {
  let promoId: string | null = null;
  let promoName = "Not Applicable";
  let discountAmount = 0;
  let category: string | null = null;
  let referral: string | null = null;

  if (!promoChoice || promoChoice === "none") {
    return {
      promoId,
      promoName,
      discountAmount,
      discountCategory: category,
      referralName: referral,
    };
  }

  if (promoChoice === "first_time") {
    promoName =
      "First-time Booking Discount";
    discountAmount = baseTotal * 0.05;
  } else if (
    promoChoice === "student_pwd_sc"
  ) {
    const normalizedCategory =
      discountCategory.toLowerCase();

    if (
      ![
        "student",
        "pwd",
        "senior_citizen",
      ].includes(normalizedCategory)
    ) {
      throw new Error(
        "Please select whether the discount is for a Student, PWD, or Senior Citizen."
      );
    }

    category = normalizedCategory;
    discountAmount = baseTotal * 0.05;

    if (category === "student") {
      promoName =
        "Student / PWD / SC Discount — Student";
    } else if (category === "pwd") {
      promoName =
        "Student / PWD / SC Discount — PWD";
    } else {
      promoName =
        "Student / PWD / SC Discount — Senior Citizen";
    }
  } else if (promoChoice === "referral") {
    referral = referralName.trim();

    if (!referral) {
      throw new Error(
        "Please enter the name of the person who referred the client."
      );
    }

    promoName = `Referral Program — Referred by: ${referral.slice(
      0,
      120
    )}`;

    // The customer booking flow stores the referral name
    // but does not currently calculate an automatic referral discount.
    discountAmount = 0;
  } else if (
    promoChoice === "other_amount"
  ) {
    if (
      !Number.isFinite(
        manualDiscountAmount
      ) ||
      manualDiscountAmount <= 0
    ) {
      throw new Error(
        "Please enter a valid manual discount amount."
      );
    }

    if (
      manualDiscountAmount >
      baseTotal
    ) {
      throw new Error(
        "The discount amount cannot be greater than the booking total."
      );
    }

    promoName =
      "Admin Manual Discount";
    discountAmount =
      manualDiscountAmount;
  } else if (
    promoChoice.startsWith("promo:")
  ) {
    promoId = promoChoice.slice(6).trim();

    if (!promoId) {
      throw new Error(
        "Invalid promo selection."
      );
    }

    const { data: promo, error } =
      await db
        .from("promos")
        .select(
          "id,name,discount_type,discount_value,active"
        )
        .eq("id", promoId)
        .eq("active", true)
        .single();

    if (error || !promo) {
      throw new Error(
        "That current promo is no longer available."
      );
    }

    promoName = String(promo.name);

    const value = Number(
      promo.discount_value || 0
    );

    const type = String(
      promo.discount_type || ""
    )
      .trim()
      .toLowerCase();

    if (
      type === "fixed" ||
      type === "amount"
    ) {
      discountAmount = value;
    } else {
      discountAmount =
        baseTotal * (value / 100);
    }
  } else {
    throw new Error(
      "Invalid promo or discount selection."
    );
  }

  discountAmount = roundMoney(
    Math.max(
      0,
      Math.min(
        Number(discountAmount || 0),
        baseTotal
      )
    )
  );

  return {
    promoId,
    promoName,
    discountAmount,
    discountCategory: category,
    referralName: referral,
  };
}

async function getBookingWithFinancials(
  db: ReturnType<typeof supabaseAdmin>,
  bookingId: string
) {
  const { data: booking, error } =
    await db
      .from("bookings")
      .select(
        `
          id,
          reference_code,
          customer_name,
          email,
          access_token,
          mobile_number,
          social_handle,
          preferred_date,
          preferred_time,
          removal,
          notes,
          promo_id,
          promo_name,
          discount_category,
          referral_name,
          discount_amount,
          discount_verified,
          discount_verified_at,
          estimated_total,
          down_payment,
          status,
          approved_at,
          confirmed_at,
          completed_at,
          cancelled_at,
          cancellation_reason,
          cancellation_note
        `
      )
      .eq("id", bookingId)
      .single();

  if (error || !booking) {
    throw (
      error ||
      new Error("Booking not found.")
    );
  }

  return booking;
}


async function sendCompletedBookingEmail(
  db: ReturnType<typeof supabaseAdmin>,
  booking: any
) {
  const {
    data: bookingServices,
    error: servicesError,
  } = await db
    .from("booking_services")
    .select(
      "service_name,variation_name,price"
    )
    .eq("booking_id", booking.id);

  if (servicesError) {
    console.error(
      "Unable to load booking services for completion email:",
      servicesError
    );
  }

  await notifyBookingCompleted({
    booking: {
      id: booking.id,
      reference_code:
        booking.reference_code,
      access_token:
        booking.access_token,
      customer_name:
        booking.customer_name,
      email: booking.email,
      preferred_date:
        booking.preferred_date,
      preferred_time:
        booking.preferred_time,
      estimated_total:
        booking.estimated_total,
      discount_amount:
        booking.discount_amount,
      removal:
        booking.removal,
      notes:
        booking.notes,
    },
    services: bookingServices || [],
  });
}

async function completeBooking(
  db: ReturnType<typeof supabaseAdmin>,
  bookingId: string,
  actorId: string,
  actorEmail?: string | null
) {
  const booking =
    await getBookingWithFinancials(
      db,
      bookingId
    );

  if (booking.status !== "confirmed") {
    throw new Error(
      "Only confirmed bookings can be completed."
    );
  }

  const now = new Date().toISOString();

  const { error } = await db
    .from("bookings")
    .update({
      status: "completed",
      completed_at: now,
    })
    .eq("id", bookingId)
    .eq("status", "confirmed");

  if (error) {
    throw error;
  }

  await recordActivity(db, {
    bookingId,
    action: "status_changed",
    description:
      "Booking marked as completed.",
    oldValue: "confirmed",
    newValue: "completed",
    actorId,
    actorEmail: actorEmail || null,
  });

  try {
    await sendCompletedBookingEmail(
      db,
      booking
    );
  } catch (error) {
    console.error(
      "Booking completion notification failed:",
      error
    );
  }

  return {
    ok: true,
    booking: {
      status: "completed",
      discount_verified:
        Boolean(
          booking.discount_verified
        ),
    },
  };
}

async function handleApprove(
  db: ReturnType<typeof supabaseAdmin>,
  booking: any,
  body: any,
  user: {
    id: string;
    email?: string | null;
  }
) {
  if (booking.status !== "pending") {
    throw new Error(
      "Only pending bookings can be approved."
    );
  }

  const { data: bookingServices, error } =
    await db
      .from("booking_services")
      .select(
        "service_id,variation_id,duration_minutes"
      )
      .eq("booking_id", booking.id);

  if (error) {
    throw error;
  }

  const duration = Math.max(
    30,
    (bookingServices || []).reduce(
      (sum, service) =>
        sum +
        Number(
          service.duration_minutes || 0
        ),
      0
    )
  );

  await validateAvailability(db, {
    bookingId: booking.id,
    preferredDate:
      booking.preferred_date,
    preferredTime:
      booking.preferred_time,
    durationMinutes: duration,
  });

  const promoName = String(
    booking.promo_name || ""
  ).trim();

  const hasDiscountRequest =
    promoName.length > 0 &&
    ![
      "not applicable",
      "none",
      "no discount",
    ].includes(promoName.toLowerCase());

  let discountDecision = String(
    body.discount_decision || "none"
  )
    .trim()
    .toLowerCase();

  if (!hasDiscountRequest) {
    discountDecision = "none";
  }

  if (
    hasDiscountRequest &&
    !["approve", "reject"].includes(
      discountDecision
    )
  ) {
    throw new Error(
      "Choose whether the client's discount should be approved or rejected."
    );
  }

  const now = new Date().toISOString();

  const patch: Record<string, unknown> = {
    status: "approved",
    approved_at: now,
  };

  if (hasDiscountRequest) {
    if (discountDecision === "approve") {
      patch.discount_verified = true;
      patch.discount_verified_at = now;
    } else {
      /*
       * Reject the application of the discount without deleting the
       * client's original requested amount. effectiveBookingTotal()
       * only subtracts discount_amount when discount_verified is true,
       * so keeping the amount is safe and lets a reset-to-pending
       * booking be reviewed again correctly.
       */
      patch.discount_verified = false;
      patch.discount_verified_at = null;
    }
  } else {
    patch.discount_verified = false;
    patch.discount_verified_at = null;
    patch.discount_amount = 0;
  }

  const { data: updated, error: updateError } =
    await db
      .from("bookings")
      .update(patch)
      .eq("id", booking.id)
      .eq("status", "pending")
      .select(
        "status,discount_verified,discount_amount,discount_verified_at"
      )
      .single();

  if (updateError) {
    throw updateError;
  }

  if (hasDiscountRequest) {
    await recordActivity(db, {
      bookingId: booking.id,
      action:
        discountDecision === "approve"
          ? "discount_verified"
          : "discount_rejected",
      description:
        discountDecision === "approve"
          ? `Discount approved and applied: ${promoName}.`
          : `Discount rejected: ${promoName}.`,
      oldValue: {
        promo_name: promoName,
        discount_verified:
          Boolean(
            booking.discount_verified
          ),
        discount_amount: Number(
          booking.discount_amount || 0
        ),
      },
      newValue: {
        promo_name: promoName,
        discount_verified:
          Boolean(
            updated.discount_verified
          ),
        discount_amount: Number(
          updated.discount_amount || 0
        ),
      },
      actorId: user.id,
      actorEmail: user.email || null,
    });
  }

  await recordActivity(db, {
    bookingId: booking.id,
    action: "status_changed",
    description:
      hasDiscountRequest
        ? discountDecision === "approve"
          ? "Booking approved. Client discount was also approved and applied."
          : "Booking approved. Client discount was rejected and will not be applied."
        : "Booking approved.",
    oldValue: "pending",
    newValue: "approved",
    actorId: user.id,
    actorEmail: user.email || null,
  });

  return {
    ok: true,
    message:
      hasDiscountRequest
        ? discountDecision === "approve"
          ? "Booking approved and discount applied."
          : "Booking approved and discount rejected."
        : "Booking approved.",
    booking: updated,
    payment_deadline:
      getPaymentDeadline(now).toISOString(),
  };
}

async function handleVerifyPayment(
  db: ReturnType<typeof supabaseAdmin>,
  booking: any,
  body: any,
  user: {
    id: string;
    email?: string | null;
  }
) {
  let paymentId = String(
    body.payment_id || ""
  ).trim();

  if (!paymentId) {
    const {
      data: latestPayment,
      error: latestPaymentError,
    } = await db
      .from("payments")
      .select("id")
      .eq("booking_id", booking.id)
      .eq("status", "submitted")
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (latestPaymentError) {
      throw latestPaymentError;
    }

    paymentId = latestPayment?.id || "";
  }

  if (!paymentId) {
    throw new Error(
      "No submitted payment was found for this booking."
    );
  }

  const { data: payment, error } =
    await db
      .from("payments")
      .select(
        `
          id,
          booking_id,
          amount,
          gross_amount,
          processing_fee,
          net_amount,
          payment_type,
          method,
          status,
          verified_at,
          paid_at
        `
      )
      .eq("id", paymentId)
      .eq("booking_id", booking.id)
      .single();

  if (error || !payment) {
    throw (
      error ||
      new Error("Payment not found.")
    );
  }

  if (payment.status !== "submitted") {
    throw new Error(
      "This payment has already been processed."
    );
  }

  const now = new Date().toISOString();
  const netAmount = Math.max(
    0,
    Number(
      payment.net_amount ??
        Number(payment.amount || 0) -
          Number(
            payment.processing_fee || 0
          )
    )
  );

  const { error: paymentUpdateError } =
    await db
      .from("payments")
      .update({
        status: "verified",
        verified_at: now,
        paid_at: now,
        gross_amount:
          payment.gross_amount ??
          Number(payment.amount || 0),
        net_amount: netAmount,
      })
      .eq("id", paymentId)
      .eq("status", "submitted");

  if (paymentUpdateError) {
    throw paymentUpdateError;
  }

  const paymentType =
    normalizePaymentType(
      payment.payment_type
    );

  await recordActivity(db, {
    bookingId: booking.id,
    action: "payment_verified",
    description: `Payment verified: ₱${Number(
      payment.amount || 0
    ).toFixed(2)} via ${
      payment.method || "Unknown"
    }.`,
    oldValue: {
      payment_status: "submitted",
    },
    newValue: {
      payment_status: "verified",
      payment_id: payment.id,
      amount: Number(
        payment.amount || 0
      ),
      net_amount: netAmount,
      method: payment.method || null,
      payment_type: paymentType,
    },
    actorId: user.id,
    actorEmail: user.email || null,
  });

  if (
    ![
      "down_payment",
      "booking_payment",
      "balance",
    ].includes(paymentType)
  ) {
    return {
      ok: true,
      message: "Payment verified.",
      booking: {
        status: booking.status,
        discount_verified:
          Boolean(
            booking.discount_verified
          ),
      },
      payment_status: "verified",
    };
  }

  const {
    data: verifiedPayments,
    error: verifiedPaymentsError,
  } = await db
    .from("payments")
    .select(
      "id,amount,net_amount,payment_type"
    )
    .eq("booking_id", booking.id)
    .eq("status", "verified");

  if (verifiedPaymentsError) {
    throw verifiedPaymentsError;
  }

  const paidTowardBooking =
    (verifiedPayments || [])
      .filter((item) =>
        [
          "down_payment",
          "booking_payment",
          "balance",
        ].includes(
          normalizePaymentType(
            item.payment_type
          )
        )
      )
      .reduce(
        (sum, item) =>
          sum + paymentNetAmount(item),
        0
      );

  const oldStatus = String(
    booking.status
  );

  const bookingTotal =
    effectiveBookingTotal(booking);

  const patch: Record<string, unknown> = {
    down_payment:
      roundMoney(paidTowardBooking),
  };

  if (
    [
      "down_payment",
      "booking_payment",
    ].includes(paymentType) &&
    ![
      "confirmed",
      "completed",
      "cancelled",
      "rejected",
    ].includes(oldStatus)
  ) {
    patch.status = "confirmed";
    patch.confirmed_at =
      booking.confirmed_at || now;
  }

  if (
    bookingTotal > 0 &&
    paidTowardBooking >= bookingTotal &&
    ![
      "cancelled",
      "rejected",
      "completed",
    ].includes(oldStatus)
  ) {
    patch.status = "confirmed";
    patch.confirmed_at =
      booking.confirmed_at || now;
  }

  const { data: updated, error: bookingUpdateError } =
    await db
      .from("bookings")
      .update(patch)
      .eq("id", booking.id)
      .select(
        "status,confirmed_at,down_payment,discount_verified"
      )
      .single();

  if (bookingUpdateError) {
    throw bookingUpdateError;
  }

  const newStatus = String(
    updated.status || oldStatus
  );

  if (newStatus !== oldStatus) {
    await recordActivity(db, {
      bookingId: booking.id,
      action: "status_changed",
      description: `Booking status changed from ${oldStatus} to ${newStatus} after payment verification.`,
      oldValue: oldStatus,
      newValue: newStatus,
      actorId: user.id,
      actorEmail: user.email || null,
    });
  }

  if (
    newStatus === "confirmed" &&
    oldStatus !== "confirmed" &&
    oldStatus !== "completed"
  ) {
    try {
      const {
        data: bookingServices,
        error: servicesError,
      } = await db
        .from("booking_services")
        .select(
          "service_id,variation_id,service_name,variation_name,price,duration_minutes"
        )
        .eq("booking_id", booking.id);

      if (servicesError) {
        console.error(
          "Unable to load booking services for confirmation email:",
          servicesError
        );
      }

      await notifyBookingConfirmed({
        booking: {
          id: booking.id,
          reference_code:
            booking.reference_code,
          access_token:
            booking.access_token,
          customer_name:
            booking.customer_name,
          email: booking.email,
          preferred_date:
            booking.preferred_date,
          preferred_time:
            booking.preferred_time,
          estimated_total:
            booking.estimated_total,
          discount_amount:
            booking.discount_verified
              ? booking.discount_amount
              : 0,
          down_payment:
            roundMoney(
              paidTowardBooking
            ),
          confirmed_at:
            updated.confirmed_at || now,
          removal:
            booking.removal,
          notes:
            booking.notes,
        },
        services: bookingServices || [],
      });
    } catch (error) {
      console.error(
        "Booking confirmation notification failed:",
        error
      );
    }
  }

  return {
    ok: true,
    message: "Payment verified.",
    booking: updated,
    payment_status: "verified",
  };
}

async function handleBookingAction(
  db: ReturnType<typeof supabaseAdmin>,
  body: any,
  user: {
    id: string;
    email?: string | null;
  }
) {
  const bookingId = String(
    body.id || ""
  ).trim();

  const action = String(
    body.action || ""
  )
    .trim()
    .toLowerCase();

  if (!bookingId) {
    throw new Error(
      "Booking ID is required."
    );
  }

  const booking =
    await getBookingWithFinancials(
      db,
      bookingId
    );

  if (booking.status === "draft") {
    throw new Error(
      "Draft bookings cannot be processed from the admin booking workflow."
    );
  }

  if (action === "approve") {
    return handleApprove(
      db,
      booking,
      body,
      user
    );
  }

  if (action === "reject") {
    if (
      ![
        "pending",
        "approved",
      ].includes(String(booking.status))
    ) {
      throw new Error(
        "This booking cannot be rejected."
      );
    }

    const oldStatus = String(
      booking.status
    );

    const { data: updated, error } =
      await db
        .from("bookings")
        .update({
          status: "rejected",
        })
        .eq("id", bookingId)
        .select(
          "status,discount_verified"
        )
        .single();

    if (error) {
      throw error;
    }

    await recordActivity(db, {
      bookingId,
      action: "status_changed",
      description: "Booking rejected.",
      oldValue: oldStatus,
      newValue: "rejected",
      actorId: user.id,
      actorEmail: user.email || null,
    });

    return {
      ok: true,
      message: "Booking rejected.",
      booking: updated,
    };
  }

  if (action === "cancel") {
    if (
      [
        "completed",
        "cancelled",
      ].includes(String(booking.status))
    ) {
      throw new Error(
        "This booking has already been completed or cancelled."
      );
    }

    const reason = String(
      body.cancellation_reason ??
        body.reason ??
        ""
    ).trim();

    const note = String(
      body.cancellation_note ??
        body.other_reason ??
        ""
    )
      .trim()
      .slice(0, 2000);

    if (
      !CANCELLATION_REASONS.includes(
        reason
      )
    ) {
      throw new Error(
        "Please select a valid cancellation reason."
      );
    }

    if (reason === "Other" && !note) {
      throw new Error(
        "Please provide a cancellation reason."
      );
    }

    const oldStatus = String(
      booking.status
    );
    const now = new Date().toISOString();

    const { data: updated, error } =
      await db
        .from("bookings")
        .update({
          status: "cancelled",
          cancelled_at: now,
          cancellation_reason: reason,
          cancellation_note:
            note || null,
        })
        .eq("id", bookingId)
        .select(
          "status,discount_verified,cancelled_at,cancellation_reason,cancellation_note"
        )
        .single();

    if (error) {
      throw error;
    }

    await recordActivity(db, {
      bookingId,
      action: "booking_cancelled",
      description: `Booking cancelled: ${
        reason === "Other"
          ? note
          : reason
      }.`,
      oldValue: {
        status: oldStatus,
      },
      newValue: {
        status: "cancelled",
        reason,
        note: note || null,
      },
      actorId: user.id,
      actorEmail: user.email || null,
    });

    return {
      ok: true,
      message: "Booking cancelled.",
      booking: updated,
    };
  }

  if (action === "verify_discount") {
    const discount = Number(
      body.discount_amount ??
        booking.discount_amount ??
        0
    );

    if (
      !Number.isFinite(discount) ||
      discount <= 0
    ) {
      throw new Error(
        "Invalid discount amount."
      );
    }

    const now = new Date().toISOString();

    const { data: updated, error } =
      await db
        .from("bookings")
        .update({
          discount_verified: true,
          discount_verified_at: now,
          discount_amount:
            roundMoney(discount),
        })
        .eq("id", bookingId)
        .select(
          "status,discount_verified,discount_verified_at,discount_amount"
        )
        .single();

    if (error) {
      throw error;
    }

    await recordActivity(db, {
      bookingId,
      action: "discount_verified",
      description: `Discount approved and applied: ₱${roundMoney(
        discount
      ).toFixed(2)}.`,
      oldValue: {
        discount_verified:
          Boolean(
            booking.discount_verified
          ),
        discount_amount: Number(
          booking.discount_amount || 0
        ),
      },
      newValue: {
        discount_verified: true,
        discount_amount:
          roundMoney(discount),
      },
      actorId: user.id,
      actorEmail: user.email || null,
    });

    return {
      ok: true,
      message:
        "Discount approved and applied.",
      booking: updated,
    };
  }

  if (
    action === "reject_discount" ||
    action === "unverify_discount"
  ) {
    const { data: updated, error } =
      await db
        .from("bookings")
        .update({
          discount_verified: false,
          discount_verified_at: null,
          discount_amount: 0,
        })
        .eq("id", bookingId)
        .select(
          "status,discount_verified,discount_verified_at,discount_amount"
        )
        .single();

    if (error) {
      throw error;
    }

    await recordActivity(db, {
      bookingId,
      action: "discount_rejected",
      description:
        "Booking discount was rejected and will not be applied.",
      oldValue: {
        discount_verified:
          Boolean(
            booking.discount_verified
          ),
        discount_amount: Number(
          booking.discount_amount || 0
        ),
      },
      newValue: {
        discount_verified: false,
        discount_amount: 0,
      },
      actorId: user.id,
      actorEmail: user.email || null,
    });

    return {
      ok: true,
      message: "Discount rejected.",
      booking: updated,
    };
  }

  if (action === "verify_payment") {
    return handleVerifyPayment(
      db,
      booking,
      body,
      user
    );
  }

  if (action === "complete") {
    return completeBooking(
      db,
      bookingId,
      user.id,
      user.email
    );
  }

  if (action === "admin_override") {
    const targetStatus = String(
      body.status || ""
    )
      .trim()
      .toLowerCase();

    if (
      !ADMIN_OVERRIDE_STATUSES.includes(
        targetStatus
      )
    ) {
      throw new Error(
        "Invalid booking status."
      );
    }

    const oldStatus = String(
      booking.status
    );
    const now = new Date().toISOString();

    const patch: Record<string, unknown> = {
      status: targetStatus,
      approved_at: null,
      confirmed_at: null,
      completed_at: null,
      cancelled_at: null,
      cancellation_reason: null,
      cancellation_note: null,
    };

    if (targetStatus === "approved") {
      patch.approved_at = now;
    }

    if (targetStatus === "confirmed") {
      patch.confirmed_at = now;
    }

    if (targetStatus === "completed") {
      patch.completed_at = now;
    }

    if (targetStatus === "cancelled") {
      patch.cancelled_at = now;
      patch.cancellation_reason = "Other";
      patch.cancellation_note =
        String(body.note || "").trim() ||
        "Admin override cancellation.";
    }

    const { data: updated, error } =
      await db
        .from("bookings")
        .update(patch)
        .eq("id", bookingId)
        .select(
          "status,approved_at,confirmed_at,completed_at,cancelled_at,discount_verified"
        )
        .single();

    if (error) {
      throw error;
    }

    await recordActivity(db, {
      bookingId,
      action: "admin_override",
      description: `Admin manually changed booking status from ${oldStatus} to ${targetStatus}.`,
      oldValue: {
        status: oldStatus,
        approved_at:
          booking.approved_at,
        confirmed_at:
          booking.confirmed_at,
        completed_at:
          booking.completed_at,
        cancelled_at:
          booking.cancelled_at,
      },
      newValue: updated,
      actorId: user.id,
      actorEmail: user.email || null,
    });

    if (targetStatus === "completed") {
      try {
        await sendCompletedBookingEmail(
          db,
          booking
        );
      } catch (error) {
        console.error(
          "Admin override completion notification failed:",
          error
        );
      }
    }

    return {
      ok: true,
      message: `Booking status changed to ${targetStatus}.`,
      booking: updated,
    };
  }

  throw new Error(
    "Invalid booking action."
  );
}

async function handleEdit(
  db: ReturnType<typeof supabaseAdmin>,
  body: any,
  user: {
    id: string;
    email?: string | null;
  }
) {
  const bookingId = String(
    body.id || ""
  ).trim();

  if (!bookingId) {
    throw new Error(
      "Booking ID is required."
    );
  }

  const booking =
    await getBookingWithFinancials(
      db,
      bookingId
    );

  if (booking.status === "draft") {
    throw new Error(
      "Draft bookings should be edited through the customer booking flow."
    );
  }

  const customerName = String(
    body.customer_name || ""
  ).trim();

  const email = String(
    body.email || ""
  )
    .trim()
    .toLowerCase();

  const mobileNumber = String(
    body.mobile_number ??
      body.mobile ??
      ""
  ).trim();

  const socialHandle = String(
    body.social_handle || ""
  ).trim();

  const preferredDate = String(
    body.preferred_date || ""
  ).trim();

  const preferredTime = normalizeTime(
    body.preferred_time
  );

  const removal = String(
    body.removal || "None"
  )
    .trim()
    .slice(0, 120);

  const notes = String(
    body.notes || ""
  )
    .trim()
    .slice(0, 3000);

  if (
    !customerName ||
    !email ||
    !mobileNumber ||
    !preferredDate ||
    !preferredTime
  ) {
    throw new Error(
      "Customer name, email, mobile number, date, and time are required."
    );
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  ) {
    throw new Error(
      "Enter a valid email address."
    );
  }

  const rawServices = Array.isArray(
    body.services
  )
    ? body.services
    : [];

  const services = rawServices.map(
    (service: any) => ({
      service_id: String(
        service.service_id || ""
      ).trim(),
      variation_id:
        service.variation_id
          ? String(
              service.variation_id
            ).trim()
          : null,
    })
  );

  const calculated =
    await calculateServicesTotal(
      db,
      services
    );

  await validateAvailability(db, {
    bookingId,
    preferredDate,
    preferredTime,
    durationMinutes:
      calculated.duration,
  });

  const promoChoice = String(
    body.promo_choice || "none"
  )
    .trim()
    .toLowerCase();

  const discountCategory = String(
    body.discount_category || ""
  )
    .trim()
    .toLowerCase();

  const referralName = String(
    body.referral_name || ""
  ).trim();

  const manualDiscountAmount =
    Number(
      body.manual_discount_amount ||
        0
    );

  const promoSelection =
    await calculatePromoSelection(db, {
      promoChoice,
      discountCategory,
      referralName,
      manualDiscountAmount,
      baseTotal: calculated.total,
    });

  const previousDiscountSignature = {
    promo_id: booking.promo_id || null,
    promo_name:
      booking.promo_name ||
      "Not Applicable",
    discount_category:
      booking.discount_category || null,
    referral_name:
      booking.referral_name || null,
    discount_amount: Number(
      booking.discount_amount || 0
    ),
  };

  const nextDiscountSignature = {
    promo_id: promoSelection.promoId,
    promo_name:
      promoSelection.promoName,
    discount_category:
      promoSelection.discountCategory,
    referral_name:
      promoSelection.referralName,
    discount_amount:
      promoSelection.discountAmount,
  };

  const discountChanged =
    JSON.stringify(
      previousDiscountSignature
    ) !==
    JSON.stringify(
      nextDiscountSignature
    );

  const hasAdminAppliedDiscount =
    promoSelection.discountAmount > 0;

  const nextDiscountVerified =
    hasAdminAppliedDiscount;

  const nextDiscountVerifiedAt =
    hasAdminAppliedDiscount
      ? new Date().toISOString()
      : null;

  const { data: oldServices, error } =
    await db
      .from("booking_services")
      .select(
        "service_id,variation_id,service_name,variation_name,price,duration_minutes"
      )
      .eq("booking_id", bookingId);

  if (error) {
    throw error;
  }

  const bookingPatch = {
    customer_name:
      customerName.slice(0, 120),
    email: email.slice(0, 254),
    mobile_number:
      mobileNumber.slice(0, 40),
    social_handle:
      socialHandle.slice(0, 120),
    preferred_date: preferredDate,
    preferred_time: preferredTime,
    removal,
    notes,
    promo_id: promoSelection.promoId,
    promo_name:
      promoSelection.promoName,
    discount_category:
      promoSelection.discountCategory,
    referral_name:
      promoSelection.referralName,
    discount_amount:
      promoSelection.discountAmount,
    discount_verified:
      nextDiscountVerified,
    discount_verified_at:
      nextDiscountVerifiedAt,
    estimated_total:
      calculated.total,
  };

  const { error: bookingUpdateError } =
    await db
      .from("bookings")
      .update(bookingPatch)
      .eq("id", bookingId);

  if (bookingUpdateError) {
    throw bookingUpdateError;
  }

  const { error: deleteServicesError } =
    await db
      .from("booking_services")
      .delete()
      .eq("booking_id", bookingId);

  if (deleteServicesError) {
    throw deleteServicesError;
  }

  if (calculated.services.length) {
    const { error: insertServicesError } =
      await db
        .from("booking_services")
        .insert(
          calculated.services.map(
            (service) => ({
              booking_id: bookingId,
              service_id:
                service.service_id,
              variation_id:
                service.variation_id,
              service_name:
                service.service_name,
              variation_name:
                service.variation_name,
              price: service.price,
              duration_minutes:
                service.duration_minutes,
            })
          )
        );

    if (insertServicesError) {
      throw insertServicesError;
    }
  }

  await recordActivity(db, {
    bookingId,
    action: "booking_edited",
    description:
      discountChanged &&
      promoSelection.discountAmount > 0
        ? "Booking details were edited by an admin. The selected discount was applied immediately as an admin override."
        : discountChanged
        ? "Booking details were edited by an admin. The discount selection was updated."
        : "Booking details were edited by an admin.",
    oldValue: {
      customer_name:
        booking.customer_name,
      email: booking.email,
      mobile_number:
        booking.mobile_number,
      social_handle:
        booking.social_handle,
      preferred_date:
        booking.preferred_date,
      preferred_time:
        booking.preferred_time,
      removal: booking.removal,
      notes: booking.notes,
      estimated_total:
        booking.estimated_total,
      promo_id: booking.promo_id,
      promo_name: booking.promo_name,
      discount_category:
        booking.discount_category,
      referral_name:
        booking.referral_name,
      discount_amount:
        booking.discount_amount,
      discount_verified:
        booking.discount_verified,
      services: oldServices || [],
    },
    newValue: {
      ...bookingPatch,
      services: calculated.services,
    },
    actorId: user.id,
    actorEmail: user.email || null,
  });

  return {
    ok: true,
    message: "Booking updated.",
    booking: {
      status: booking.status,
      discount_verified:
        nextDiscountVerified,
      discount_amount:
        promoSelection.discountAmount,
      promo_name:
        promoSelection.promoName,
    },
    estimated_total:
      calculated.total,
    discount_amount:
      promoSelection.discountAmount,
    duration_minutes:
      calculated.duration,
  };
}

async function handleRecordPayment(
  db: ReturnType<typeof supabaseAdmin>,
  body: any,
  user: {
    id: string;
    email?: string | null;
  }
) {
  const bookingId = String(
    body.id ??
      body.booking_id ??
      ""
  ).trim();

  if (!bookingId) {
    throw new Error(
      "Booking ID is required."
    );
  }

  const amount = Number(body.amount);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "Enter a valid payment amount."
    );
  }

  const paymentType =
    normalizePaymentType(
      body.payment_type
    );

  if (
    ![
      "down_payment",
      "booking_payment",
      "balance",
      "tip",
      "additional_charge",
      "other",
    ].includes(paymentType)
  ) {
    throw new Error(
      "Invalid payment type."
    );
  }

  const method = String(
    body.method || ""
  ).trim();

  if (!method) {
    throw new Error(
      "Payment method is required."
    );
  }

  const note = String(
    body.note || ""
  )
    .trim()
    .slice(0, 2000);

  const booking =
    await getBookingWithFinancials(
      db,
      bookingId
    );

  if (booking.status === "draft") {
    throw new Error(
      "Draft bookings cannot have payments recorded."
    );
  }

  const now = new Date().toISOString();

  const { data: payment, error } =
    await db
      .from("payments")
      .insert({
        booking_id: bookingId,
        method,
        amount: roundMoney(amount),
        gross_amount:
          roundMoney(amount),
        processing_fee: 0,
        net_amount:
          roundMoney(amount),
        payment_type: paymentType,
        status: "verified",
        verified_at: now,
        paid_at: now,
        note: note || null,
        created_at: now,
      })
      .select("id")
      .single();

  if (error || !payment) {
    throw (
      error ||
      new Error(
        "Unable to record payment."
      )
    );
  }

  await recordActivity(db, {
    bookingId,
    action: "payment_recorded",
    description: `Manual payment recorded: ₱${roundMoney(
      amount
    ).toFixed(2)} via ${method}.`,
    oldValue: null,
    newValue: {
      payment_id: payment.id,
      amount: roundMoney(amount),
      method,
      payment_type: paymentType,
      note: note || null,
    },
    actorId: user.id,
    actorEmail: user.email || null,
  });

  if (
    [
      "down_payment",
      "booking_payment",
      "balance",
    ].includes(paymentType)
  ) {
    const {
      data: verifiedPayments,
      error: paymentsError,
    } = await db
      .from("payments")
      .select(
        "amount,net_amount,payment_type,status"
      )
      .eq("booking_id", bookingId)
      .eq("status", "verified");

    if (paymentsError) {
      throw paymentsError;
    }

    const totalPaid =
      (verifiedPayments || [])
        .filter((item) =>
          [
            "down_payment",
            "booking_payment",
            "balance",
          ].includes(
            normalizePaymentType(
              item.payment_type
            )
          )
        )
        .reduce(
          (sum, item) =>
            sum + paymentNetAmount(item),
          0
        );

    const patch: Record<string, unknown> = {
      down_payment:
        roundMoney(totalPaid),
    };

    const total =
      effectiveBookingTotal(booking);

    if (
      total > 0 &&
      totalPaid >= total &&
      ![
        "completed",
        "cancelled",
        "rejected",
      ].includes(String(booking.status))
    ) {
      patch.status = "confirmed";
      patch.confirmed_at =
        booking.confirmed_at || now;
    }

    const { error: updateError } =
      await db
        .from("bookings")
        .update(patch)
        .eq("id", bookingId);

    if (updateError) {
      throw updateError;
    }
  }

  return {
    ok: true,
    message: "Payment recorded.",
    payment_id: payment.id,
  };
}

async function handleDelete(
  db: ReturnType<typeof supabaseAdmin>,
  bookingId: string,
  user: {
    id: string;
    email?: string | null;
  }
) {
  if (!bookingId) {
    throw new Error(
      "Booking ID is required."
    );
  }

  const { data: booking, error } =
    await db
      .from("bookings")
      .select(
        "id,reference_code,customer_name,status"
      )
      .eq("id", bookingId)
      .single();

  if (error || !booking) {
    throw (
      error ||
      new Error("Booking not found.")
    );
  }

  await db
    .from("payment_proofs")
    .delete()
    .eq("booking_id", bookingId);

  await db
    .from("booking_files")
    .delete()
    .eq("booking_id", bookingId);

  await db
    .from("payments")
    .delete()
    .eq("booking_id", bookingId);

  await db
    .from("booking_services")
    .delete()
    .eq("booking_id", bookingId);

  const { error: deleteError } =
    await db
      .from("bookings")
      .delete()
      .eq("id", bookingId);

  if (deleteError) {
    throw deleteError;
  }

  console.log(
    "Booking deleted by admin:",
    {
      bookingId,
      referenceCode:
        booking.reference_code,
      customerName:
        booking.customer_name,
      previousStatus:
        booking.status,
      actorId: user.id,
      actorEmail: user.email || null,
    }
  );

  return {
    ok: true,
    message: "Booking deleted.",
  };
}

async function handleReset(
  db: ReturnType<typeof supabaseAdmin>,
  body: any,
  user: {
    id: string;
    email?: string | null;
  }
) {
  const bookingId = String(
    body.id || ""
  ).trim();

  const targetStatus = String(
    body.status || ""
  )
    .trim()
    .toLowerCase();

  if (!bookingId) {
    throw new Error(
      "Booking ID is required."
    );
  }

  if (
    !RESET_STATUSES.includes(
      targetStatus
    )
  ) {
    throw new Error(
      "Invalid reset status."
    );
  }

  const booking =
    await getBookingWithFinancials(
      db,
      bookingId
    );

  if (booking.status === "draft") {
    throw new Error(
      "Draft bookings cannot be reset from the admin booking workflow."
    );
  }

  const oldStatus = String(
    booking.status
  );
  const now = new Date().toISOString();

  const patch: Record<string, unknown> = {
    status: targetStatus,
    approved_at: null,
    confirmed_at: null,
    completed_at: null,
    cancelled_at: null,
    cancellation_reason: null,
    cancellation_note: null,
  };

  /*
   * Returning a booking to Pending means the admin must make the
   * discount decision again. Keep promo_name / discount_amount as the
   * original client request, but clear the previous decision.
   */
  if (targetStatus === "pending") {
    patch.discount_verified = false;
    patch.discount_verified_at = null;
  }

  if (targetStatus === "approved") {
    patch.approved_at = now;
  }

  if (targetStatus === "confirmed") {
    patch.confirmed_at = now;
  }

  const { data: updated, error } =
    await db
      .from("bookings")
      .update(patch)
      .eq("id", bookingId)
      .select(
        "status,approved_at,confirmed_at,completed_at,cancelled_at,discount_verified"
      )
      .single();

  if (error) {
    throw error;
  }

  await recordActivity(db, {
    bookingId,
    action: "status_reset",
    description: `Booking status reset from ${oldStatus} to ${targetStatus}.`,
    oldValue: {
      status: oldStatus,
      approved_at:
        booking.approved_at,
      confirmed_at:
        booking.confirmed_at,
      completed_at:
        booking.completed_at,
      cancelled_at:
        booking.cancelled_at,
    },
    newValue: updated,
    actorId: user.id,
    actorEmail: user.email || null,
  });

  return {
    ok: true,
    message: `Booking reset to ${targetStatus}.`,
    booking: updated,
  };
}

export async function PATCH(
  request: NextRequest
) {
  try {
    const adminContext =
      await getAdminDb();

    if (!adminContext) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const { db, user } =
      adminContext;

    await expireOverdueApprovedBookings(
      db
    );

    let body: any = {};

    const contentType =
      request.headers.get(
        "content-type"
      ) || "";

    if (
      contentType.includes(
        "multipart/form-data"
      ) ||
      contentType.includes(
        "application/x-www-form-urlencoded"
      )
    ) {
      const formData =
        await request.formData();

      body = Object.fromEntries(
        formData.entries()
      );

      if (
        typeof body.services === "string"
      ) {
        try {
          body.services = JSON.parse(
            body.services
          );
        } catch {
          body.services = [];
        }
      }
    } else {
      body = await request
        .json()
        .catch(() => ({}));
    }

    const action = String(
      body.action || ""
    )
      .trim()
      .toLowerCase();

    if (action === "edit") {
      const result = await handleEdit(
        db,
        body,
        user
      );

      return NextResponse.json(result);
    }

    if (
      action === "record_payment" ||
      action === "record"
    ) {
      const result =
        await handleRecordPayment(
          db,
          body,
          user
        );

      return NextResponse.json(result);
    }

    if (action === "delete") {
      const bookingId = String(
        body.id || ""
      ).trim();

      const result = await handleDelete(
        db,
        bookingId,
        user
      );

      return NextResponse.json(result);
    }

    if (action === "reset") {
      const result = await handleReset(
        db,
        body,
        user
      );

      return NextResponse.json(result);
    }

    const result =
      await handleBookingAction(
        db,
        body,
        user
      );

    return NextResponse.json(result);
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
