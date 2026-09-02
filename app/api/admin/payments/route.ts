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

/*
 * ============================================================
 * PAYMENT CONSTANTS
 * ============================================================
 */

const BOOKING_PAYMENT_TYPE =
  "down_payment";

const BOOKING_DOWN_PAYMENT =
  200;

const QR_PH_FEE =
  5;

const PAYMENT_TYPES =
  new Set([
    "down_payment",
    "booking_payment", // legacy
    "balance",
    "tip",
    "additional_charge",
    "other",
  ]);

const PAYMENT_METHODS =
  new Set([
    "GCash",
    "QR PH",
    "Cash",
    "Bank Transfer",
    "Other",
  ]);

/*
 * ============================================================
 * ADMIN DATABASE
 * ============================================================
 */

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

  return admin
    ? db
    : null;
}

/*
 * ============================================================
 * JSON ERROR
 * ============================================================
 */

function jsonError(
  error: string,
  status = 400
) {
  return NextResponse.json(
    {
      error,
    },
    {
      status,
    }
  );
}

/*
 * ============================================================
 * PATCH
 * ============================================================
 */

export async function PATCH(
  request: NextRequest
) {
  try {
    /*
     * --------------------------------------------------------
     * ADMIN AUTHENTICATION
     * --------------------------------------------------------
     */

    const db =
      await getAdminDb();

    if (!db) {
      return jsonError(
        "Unauthorized",
        401
      );
    }

    /*
     * --------------------------------------------------------
     * READ REQUEST
     * --------------------------------------------------------
     */

    const body =
      await request
        .json()
        .catch(
          () => ({})
        );

    const action =
      String(
        body.action || ""
      )
        .trim()
        .toLowerCase();

    /*
     * ========================================================
     * VERIFY / REJECT PAYMENT
     * ========================================================
     */

    if (
      action === "status"
    ) {
      const paymentId =
        String(
          body.id || ""
        ).trim();

      const requestedStatus =
        String(
          body.status || ""
        )
          .trim()
          .toLowerCase();

      /*
       * ------------------------------------------------------
       * VALIDATE PAYMENT ID
       * ------------------------------------------------------
       */

      if (!paymentId) {
        return jsonError(
          "Payment ID is required."
        );
      }

      /*
       * ------------------------------------------------------
       * VALIDATE STATUS
       * ------------------------------------------------------
       */

      if (
        requestedStatus !==
          "verified" &&
        requestedStatus !==
          "rejected"
      ) {
        return jsonError(
          "Invalid payment status."
        );
      }

      /*
       * ------------------------------------------------------
       * LOAD PAYMENT
       * ------------------------------------------------------
       */

      const {
        data: payment,
        error: paymentError,
      } =
        await db
          .from("payments")
          .select(
            `
            id,
            booking_id,
            method,
            amount,
            gross_amount,
            processing_fee,
            net_amount,
            payment_type,
            status,
            note,
            paid_at,
            verified_at,
            created_at
            `
          )
          .eq(
            "id",
            paymentId
          )
          .single();

      if (
        paymentError ||
        !payment
      ) {
        console.error(
          "Payment lookup error:",
          paymentError
        );

        return jsonError(
          "Payment not found.",
          404
        );
      }

      /*
       * ------------------------------------------------------
       * ONLY SUBMITTED PAYMENTS
       * ------------------------------------------------------
       */

      if (
        payment.status !==
        "submitted"
      ) {
        return jsonError(
          "Only submitted payments can be updated."
        );
      }

      /*
       * ------------------------------------------------------
       * DOWN PAYMENT
       * ------------------------------------------------------
       *
       * Current value:
       *
       * down_payment
       *
       * Legacy value:
       *
       * booking_payment
       */

      const isDownPayment =
        payment.payment_type ===
          "down_payment" ||
        payment.payment_type ===
          "booking_payment";

      if (!isDownPayment) {
        return jsonError(
          "Only down payment records can be verified."
        );
      }

      /*
       * ------------------------------------------------------
       * PAYMENT AMOUNT
       * ------------------------------------------------------
       *
       * The booking receives ₱200.
       *
       * QR PH customer payment:
       *
       * ₱200 net
       * ₱5 processing fee
       * ₱205 gross
       */

      if (
        Number(
          payment.amount
        ) !==
        BOOKING_DOWN_PAYMENT
      ) {
        return jsonError(
          "The down payment must be ₱200."
        );
      }

      /*
       * ------------------------------------------------------
       * LOAD BOOKING
       * ------------------------------------------------------
       */

      const {
        data: booking,
        error: bookingError,
      } =
        await db
          .from("bookings")
          .select(
            `
            id,
            status,
            reference_code,
            customer_name,
            preferred_date,
            preferred_time,
            estimated_total,
            down_payment,
            access_token
            `
          )
          .eq(
            "id",
            payment.booking_id
          )
          .single();

      if (
        bookingError ||
        !booking
      ) {
        console.error(
          "Booking lookup error:",
          bookingError
        );

        return jsonError(
          "Booking not found.",
          404
        );
      }

      /*
       * ------------------------------------------------------
       * VALID BOOKING STATES
       * ------------------------------------------------------
       */

      if (
        booking.status !==
          "approved" &&
        booking.status !==
          "payment_submitted"
      ) {
        return jsonError(
          "This booking cannot be confirmed from this payment."
        );
      }

      /*
       * ========================================================
       * REJECT PAYMENT
       * ========================================================
       */

      if (
        requestedStatus ===
        "rejected"
      ) {
        const {
          data:
            rejectedPayment,
          error:
            rejectError,
        } =
          await db
            .from("payments")
            .update({
              status:
                "rejected",
            })
            .eq(
              "id",
              payment.id
            )
            .eq(
              "status",
              "submitted"
            )
            .select(
              `
              id,
              booking_id,
              method,
              amount,
              gross_amount,
              processing_fee,
              net_amount,
              payment_type,
              status,
              note,
              paid_at,
              verified_at,
              created_at
              `
            )
            .single();

        if (
          rejectError ||
          !rejectedPayment
        ) {
          console.error(
            "Payment rejection error:",
            rejectError
          );

          throw (
            rejectError ||
            new Error(
              "Unable to reject payment."
            )
          );
        }

        return NextResponse.json({
          ok: true,

          payment:
            rejectedPayment,

          booking: {
            id:
              booking.id,

            status:
              booking.status,
          },
        });
      }

      /*
       * ========================================================
       * VERIFY PAYMENT
       * ========================================================
       */

      const now =
        new Date().toISOString();

      /*
       * ------------------------------------------------------
       * UPDATE PAYMENT
       * ------------------------------------------------------
       */

      const {
        data:
          verifiedPayment,
        error:
          verifyError,
      } =
        await db
          .from("payments")
          .update({
            status:
              "verified",

            verified_at:
              now,

            paid_at:
              payment.paid_at ||
              now,
          })
          .eq(
            "id",
            payment.id
          )
          .eq(
            "status",
            "submitted"
          )
          .select(
            `
            id,
            booking_id,
            method,
            amount,
            gross_amount,
            processing_fee,
            net_amount,
            payment_type,
            status,
            note,
            paid_at,
            verified_at,
            created_at
            `
          )
          .single();

      if (
        verifyError ||
        !verifiedPayment
      ) {
        console.error(
          "Payment verification error:",
          verifyError
        );

        throw (
          verifyError ||
          new Error(
            "Unable to verify payment."
          )
        );
      }

      /*
       * ------------------------------------------------------
       * CONFIRM BOOKING
       * ------------------------------------------------------
       */

      const {
        data:
          updatedBooking,
        error:
          bookingUpdateError,
      } =
        await db
          .from("bookings")
          .update({
            status:
              "confirmed",

            confirmed_at:
              now,

            down_payment:
              BOOKING_DOWN_PAYMENT,
          })
          .eq(
            "id",
            booking.id
          )
          .in(
            "status",
            [
              "approved",
              "payment_submitted",
            ]
          )
          .select(
            `
            id,
            status,
            confirmed_at,
            down_payment
            `
          )
          .single();

      /*
       * ------------------------------------------------------
       * ROLLBACK PAYMENT IF BOOKING UPDATE FAILS
       * ------------------------------------------------------
       */

      if (
        bookingUpdateError ||
        !updatedBooking
      ) {
        console.error(
          "Booking confirmation error:",
          bookingUpdateError
        );

        await db
          .from("payments")
          .update({
            status:
              "submitted",

            verified_at:
              null,
          })
          .eq(
            "id",
            payment.id
          )
          .eq(
            "status",
            "verified"
          );

        throw (
          bookingUpdateError ||
          new Error(
            "Unable to confirm booking."
          )
        );
      }

      /*
       * ========================================================
       * SUCCESS
       * ========================================================
       */

      return NextResponse.json({
        ok: true,

        payment:
          verifiedPayment,

        booking: {
          id:
            updatedBooking.id,

          status:
            updatedBooking.status,

          confirmed_at:
            updatedBooking.confirmed_at,

          down_payment:
            updatedBooking.down_payment,
        },
      });
    }

    /*
     * ========================================================
     * RECORD PAYMENT
     * ========================================================
     */

    if (
      action === "record"
    ) {
      const bookingId =
        String(
          body.id || ""
        ).trim();

      const paymentType =
        String(
          body.payment_type ||
            ""
        ).trim();

      const method =
        String(
          body.method || ""
        ).trim();

      const amount =
        Number(
          body.amount
        );

      const note =
        String(
          body.note || ""
        ).trim();

      /*
       * ------------------------------------------------------
       * VALIDATE BOOKING ID
       * ------------------------------------------------------
       */

      if (!bookingId) {
        return jsonError(
          "Booking ID is required."
        );
      }

      /*
       * ------------------------------------------------------
       * VALIDATE PAYMENT TYPE
       * ------------------------------------------------------
       */

      if (
        !PAYMENT_TYPES.has(
          paymentType
        )
      ) {
        return jsonError(
          "Invalid payment type."
        );
      }

      /*
       * ------------------------------------------------------
       * VALIDATE PAYMENT METHOD
       * ------------------------------------------------------
       */

      if (
        !PAYMENT_METHODS.has(
          method
        )
      ) {
        return jsonError(
          "Invalid payment method."
        );
      }

      /*
       * ------------------------------------------------------
       * VALIDATE AMOUNT
       * ------------------------------------------------------
       */

      if (
        !Number.isFinite(
          amount
        ) ||
        amount <= 0
      ) {
        return jsonError(
          "Enter a valid payment amount."
        );
      }

      /*
       * ------------------------------------------------------
       * LOAD BOOKING
       * ------------------------------------------------------
       */

      const {
        data: booking,
        error: bookingError,
      } =
        await db
          .from("bookings")
          .select(
            `
            id,
            status,
            reference_code,
            estimated_total,
            down_payment
            `
          )
          .eq(
            "id",
            bookingId
          )
          .single();

      if (
        bookingError ||
        !booking
      ) {
        console.error(
          "Booking lookup error:",
          bookingError
        );

        return jsonError(
          "Booking not found.",
          404
        );
      }

      const now =
        new Date().toISOString();

      /*
       * ------------------------------------------------------
       * PAYMENT ACCOUNTING
       * ------------------------------------------------------
       *
       * amount = amount credited to booking
       *
       * QR PH:
       * amount          = ₱200
       * processing_fee  = ₱5
       * gross_amount    = ₱205
       * net_amount      = ₱200
       *
       * All other methods:
       * processing_fee  = ₱0
       */

      const processingFee =
        method === "QR PH"
          ? QR_PH_FEE
          : 0;

      const grossAmount =
        amount +
        processingFee;

      const netAmount =
        amount;

      /*
       * ------------------------------------------------------
       * MANUALLY RECORDED PAYMENT
       * ------------------------------------------------------
       *
       * Admin-recorded payments are
       * immediately verified.
       */

      const {
        data: payment,
        error: paymentError,
      } =
        await db
          .from("payments")
          .insert({
            booking_id:
              booking.id,

            method,

            amount,

            gross_amount:
              grossAmount,

            processing_fee:
              processingFee,

            net_amount:
              netAmount,

            payment_type:
              paymentType,

            status:
              "verified",

            note:
              note || null,

            paid_at:
              now,

            verified_at:
              now,
          })
          .select(
            `
            id,
            booking_id,
            method,
            amount,
            gross_amount,
            processing_fee,
            net_amount,
            payment_type,
            status,
            note,
            paid_at,
            verified_at,
            created_at
            `
          )
          .single();

      if (
        paymentError ||
        !payment
      ) {
        console.error(
          "Record payment error:",
          paymentError
        );

        throw (
          paymentError ||
          new Error(
            "Unable to record payment."
          )
        );
      }

      /*
       * ------------------------------------------------------
       * MANUAL DOWN PAYMENT
       * ------------------------------------------------------
       *
       * If admin manually records
       * the down payment, confirm booking.
       */

      const isDownPayment =
        paymentType ===
          BOOKING_PAYMENT_TYPE ||
        paymentType ===
          "booking_payment";

      if (
        isDownPayment &&
        (
          booking.status ===
            "approved" ||
          booking.status ===
            "payment_submitted"
        )
      ) {
        const {
          data:
            updatedBooking,
          error:
            bookingUpdateError,
        } =
          await db
            .from("bookings")
            .update({
              status:
                "confirmed",

              confirmed_at:
                now,

              down_payment:
                amount,
            })
            .eq(
              "id",
              booking.id
            )
            .in(
              "status",
              [
                "approved",
                "payment_submitted",
              ]
            )
            .select(
              `
              id,
              status,
              confirmed_at,
              down_payment
              `
            )
            .single();

        if (
          bookingUpdateError ||
          !updatedBooking
        ) {
          await db
            .from("payments")
            .delete()
            .eq(
              "id",
              payment.id
            );

          throw (
            bookingUpdateError ||
            new Error(
              "Unable to confirm booking."
            )
          );
        }

        return NextResponse.json({
          ok: true,

          payment,

          booking:
            updatedBooking,
        });
      }

      /*
       * ------------------------------------------------------
       * NORMAL MANUAL PAYMENT
       * ------------------------------------------------------
       */

      return NextResponse.json({
        ok: true,

        payment,
      });
    }

    /*
     * ========================================================
     * INVALID ACTION
     * ========================================================
     */

    return jsonError(
      "Invalid payment action."
    );
  } catch (
    error: any
  ) {
    console.error(
      "Admin payment API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to update payment.",
      },
      {
        status: 500,
      }
    );
  }
}