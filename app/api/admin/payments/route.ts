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
  const session = await supabaseServer();

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

  return admin ? db : null;
}

function normalizeMethod(
  value: unknown
) {
  const method = String(
    value || ""
  ).trim();

  switch (
    method.toLowerCase()
  ) {
    case "gcash":
      return "GCash";

    case "qr ph":
    case "qrph":
      return "QR PH";

    case "cash":
      return "Cash";

    case "bank transfer":
    case "bank_transfer":
      return "Bank Transfer";

    case "maya":
      return "Maya";

    case "card":
      return "Card";

    case "other":
      return "Other";

    default:
      return method.slice(0, 40);
  }
}

function normalizePaymentType(
  value: unknown
) {
  return String(
    value || "other"
  )
    .trim()
    .toLowerCase();
}

function currency(
  amount: number
) {
  return new Intl.NumberFormat(
    "en-PH",
    {
      style: "currency",
      currency: "PHP",
    }
  ).format(amount);
}

async function getVerifiedBookingPayments(
  db: ReturnType<
    typeof supabaseAdmin
  >,
  bookingId: string
) {
  const {
    data,
    error,
  } = await db
    .from("payments")
    .select(
      "id,amount,status,payment_type"
    )
    .eq(
      "booking_id",
      bookingId
    )
    .eq(
      "status",
      "verified"
    );

  if (error) {
    throw error;
  }

  return (
    data || []
  ) as Array<{
    id: string;
    amount:
      | number
      | string
      | null;
    status:
      | string
      | null;
    payment_type:
      | string
      | null;
  }>;
}

function calculatePaidTowardBooking(
  payments: Array<{
    amount:
      | number
      | string
      | null;
    payment_type:
      | string
      | null;
  }>
) {
  return payments
    .filter(
      (payment) =>
        [
          "down_payment",
          "booking_payment",
          "balance",
        ].includes(
          normalizePaymentType(
            payment.payment_type
          )
        )
    )
    .reduce(
      (
        sum,
        payment
      ) =>
        sum +
        Number(
          payment.amount || 0
        ),
      0
    );
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

    const id =
      String(
        body.id || ""
      ).trim();

    /*
     * =========================================================
     * VERIFY / REJECT SUBMITTED PAYMENT
     * =========================================================
     */

    if (
      action === "status"
    ) {
      const status =
        String(
          body.status || ""
        )
          .trim()
          .toLowerCase();

      if (
        ![
          "verified",
          "rejected",
        ].includes(status)
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid payment status.",
          },
          {
            status: 400,
          }
        );
      }

      if (!id) {
        return NextResponse.json(
          {
            error:
              "Payment ID is required.",
          },
          {
            status: 400,
          }
        );
      }

      const {
        data: payment,
        error:
          paymentError,
      } = await db
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
        .eq("id", id)
        .single();

      if (
        paymentError ||
        !payment
      ) {
        return NextResponse.json(
          {
            error:
              paymentError?.message ||
              "Payment not found.",
          },
          {
            status: 404,
          }
        );
      }

      if (
        payment.status !==
        "submitted"
      ) {
        return NextResponse.json(
          {
            error:
              "This payment has already been processed.",
          },
          {
            status: 400,
          }
        );
      }

      const now =
        new Date().toISOString();

      const paymentPatch: Record<
        string,
        unknown
      > = {
        status,

        verified_at:
          status === "verified"
            ? now
            : null,

        paid_at:
          status === "verified"
            ? now
            : null,
      };

      if (
        payment.gross_amount ===
          null ||
        payment.gross_amount ===
          undefined
      ) {
        paymentPatch.gross_amount =
          Number(
            payment.amount || 0
          );
      }

      if (
        payment.net_amount ===
          null ||
        payment.net_amount ===
          undefined
      ) {
        paymentPatch.net_amount =
          Math.max(
            0,
            Number(
              payment.amount || 0
            ) -
              Number(
                payment.processing_fee ||
                  0
              )
          );
      }

      const {
        error:
          updateError,
      } = await db
        .from("payments")
        .update(
          paymentPatch
        )
        .eq(
          "id",
          id
        );

      if (updateError) {
        throw updateError;
      }

      /*
       * VERIFIED PAYMENT
       */

      if (
        status === "verified"
      ) {
        const paymentType =
          normalizePaymentType(
            payment.payment_type
          );

        if (
          [
            "down_payment",
            "booking_payment",
            "balance",
          ].includes(
            paymentType
          )
        ) {
          const verifiedPayments =
            await getVerifiedBookingPayments(
              db,
              payment.booking_id
            );

          const paidTowardBooking =
            calculatePaidTowardBooking(
              verifiedPayments
            );

          const {
            data: booking,
            error:
              bookingError,
          } = await db
            .from("bookings")
            .select(
              `
                id,
                estimated_total,
                status,
                down_payment
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
            throw (
              bookingError ||
              new Error(
                "Booking not found."
              )
            );
          }

          const bookingTotal =
            Number(
              booking.estimated_total ||
                0
            );

          const bookingPatch: Record<
            string,
            unknown
          > = {
            down_payment:
              paidTowardBooking,
          };

          /*
           * A verified initial payment
           * confirms the appointment.
           */
          if (
            [
              "down_payment",
              "booking_payment",
            ].includes(
              paymentType
            ) &&
            booking.status !==
              "confirmed" &&
            booking.status !==
              "completed"
          ) {
            bookingPatch.status =
              "confirmed";

            bookingPatch.confirmed_at =
              now;
          }

          /*
           * Fully paid booking.
           */
          if (
            paidTowardBooking >=
              bookingTotal &&
            bookingTotal > 0 &&
            ![
              "cancelled",
              "rejected",
            ].includes(
              String(
                booking.status
              )
            )
          ) {
            bookingPatch.down_payment =
              paidTowardBooking;

            if (
              booking.status !==
              "completed"
            ) {
              bookingPatch.status =
                "confirmed";

              bookingPatch.confirmed_at =
                now;
            }
          }

          const {
            error:
              bookingUpdateError,
          } = await db
            .from("bookings")
            .update(
              bookingPatch
            )
            .eq(
              "id",
              payment.booking_id
            );

          if (
            bookingUpdateError
          ) {
            throw bookingUpdateError;
          }
        }
      }

      /*
       * REJECTED INITIAL PAYMENT
       */

      if (
        status === "rejected"
      ) {
        const paymentType =
          normalizePaymentType(
            payment.payment_type
          );

        if (
          [
            "down_payment",
            "booking_payment",
          ].includes(
            paymentType
          )
        ) {
          const {
            error:
              bookingUpdateError,
          } = await db
            .from("bookings")
            .update({
              status:
                "approved",
            })
            .eq(
              "id",
              payment.booking_id
            )
            .eq(
              "status",
              "payment_submitted"
            );

          if (
            bookingUpdateError
          ) {
            throw bookingUpdateError;
          }
        }
      }

      return NextResponse.json({
        ok: true,
        status,
      });
    }

    /*
     * =========================================================
     * RECORD MANUAL PAYMENT
     * =========================================================
     *
     * Supports:
     * - Down payment
     * - Booking payment
     * - Balance
     * - Tip
     * - Additional charge
     * - Other
     */

    if (
      action === "record"
    ) {
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

      const amount =
        Number(
          body.amount
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
              "Enter a valid amount.",
          },
          {
            status: 400,
          }
        );
      }

      const paymentType =
        normalizePaymentType(
          body.payment_type
        );

      const allowedPaymentTypes =
        [
          "down_payment",
          "booking_payment",
          "balance",
          "tip",
          "additional_charge",
          "other",
        ];

      if (
        !allowedPaymentTypes.includes(
          paymentType
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid payment type.",
          },
          {
            status: 400,
          }
        );
      }

      const method =
        normalizeMethod(
          body.method
        );

      if (!method) {
        return NextResponse.json(
          {
            error:
              "Payment method is required.",
          },
          {
            status: 400,
          }
        );
      }

      const note =
        String(
          body.note || ""
        )
          .trim()
          .slice(
            0,
            2000
          );

      const {
        data: booking,
        error:
          bookingError,
      } = await db
        .from("bookings")
        .select(
          `
            id,
            estimated_total,
            down_payment,
            status
          `
        )
        .eq(
          "id",
          id
        )
        .single();

      if (
        bookingError ||
        !booking
      ) {
        return NextResponse.json(
          {
            error:
              bookingError?.message ||
              "Booking not found.",
          },
          {
            status: 404,
          }
        );
      }

      const bookingTotal =
        Number(
          booking.estimated_total ||
            0
        );

      const verifiedPayments =
        await getVerifiedBookingPayments(
          db,
          id
        );

      const paidTowardBooking =
        calculatePaidTowardBooking(
          verifiedPayments
        );

      /*
       * Balance-related payments cannot
       * exceed the remaining booking balance.
       */
      if (
        [
          "down_payment",
          "booking_payment",
          "balance",
        ].includes(
          paymentType
        )
      ) {
        const remainingBalance =
          Math.max(
            0,
            bookingTotal -
              paidTowardBooking
          );

        if (
          amount >
          remainingBalance
        ) {
          return NextResponse.json(
            {
              error:
                `Only ${currency(
                  remainingBalance
                )} remains on the booking balance.`,
            },
            {
              status: 400,
            }
          );
        }
      }

      const now =
        new Date().toISOString();

      const {
        data:
          insertedPayment,
        error:
          insertError,
      } = await db
        .from("payments")
        .insert({
          booking_id:
            id,

          method,

          amount,

          gross_amount:
            amount,

          processing_fee:
            0,

          net_amount:
            amount,

          payment_type:
            paymentType,

          note:
            note || null,

          status:
            "verified",

          verified_at:
            now,

          paid_at:
            now,

          created_at:
            now,
        })
        .select("id")
        .single();

      if (insertError) {
        throw insertError;
      }

      /*
       * Balance-related payments update
       * the booking's down_payment total.
       */
      if (
        [
          "down_payment",
          "booking_payment",
          "balance",
        ].includes(
          paymentType
        )
      ) {
        const newPaid =
          paidTowardBooking +
          amount;

        const bookingPatch: Record<
          string,
          unknown
        > = {
          down_payment:
            newPaid,
        };

        if (
          newPaid >=
            bookingTotal &&
          bookingTotal > 0 &&
          ![
            "cancelled",
            "rejected",
            "completed",
          ].includes(
            String(
              booking.status
            )
          )
        ) {
          bookingPatch.status =
            "confirmed";

          bookingPatch.confirmed_at =
            now;
        }

        const {
          error:
            bookingUpdateError,
        } = await db
          .from("bookings")
          .update(
            bookingPatch
          )
          .eq(
            "id",
            id
          );

        if (
          bookingUpdateError
        ) {
          throw bookingUpdateError;
        }

        return NextResponse.json({
          ok: true,

          payment_id:
            insertedPayment?.id ||
            null,

          down_payment:
            newPaid,

          remaining:
            Math.max(
              0,
              bookingTotal -
                newPaid
            ),
        });
      }

      /*
       * Tips, additional charges,
       * and other payments do not
       * modify down_payment.
       */
      return NextResponse.json({
        ok: true,

        payment_id:
          insertedPayment?.id ||
          null,
      });
    }

    return NextResponse.json(
      {
        error:
          "Invalid payment action.",
      },
      {
        status: 400,
      }
    );
  } catch (
    error: any
  ) {
    console.error(
      "Admin payments API error:",
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