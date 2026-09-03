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
  notifyPaymentProofSubmitted,
} from "@/lib/notifications";

const MAX_FILE_SIZE =
  8 * 1024 * 1024;

const DEFAULT_DOWN_PAYMENT =
  200;

const DEFAULT_QRPH_FEE =
  5;

const ALLOWED_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/heic",
    "image/heif",
  ]);

type PaymentMethod =
  | "gcash"
  | "qrph";

export async function POST(
  request: NextRequest
) {
  try {
    const formData =
      await request.formData();

    const token =
      String(
        formData.get("token") || ""
      ).trim();

    const methodValue =
      String(
        formData.get("method") || ""
      )
        .trim()
        .toLowerCase();

    const proof =
      formData.get("proof");

    if (!token) {
      return NextResponse.json(
        {
          error:
            "Booking token is required.",
        },
        { status: 400 }
      );
    }

    if (
      methodValue !== "gcash" &&
      methodValue !== "qrph"
    ) {
      return NextResponse.json(
        {
          error:
            "Please select a valid payment method.",
        },
        { status: 400 }
      );
    }

    const method =
      methodValue as PaymentMethod;

    if (!(proof instanceof File)) {
      return NextResponse.json(
        {
          error:
            "Please upload your payment proof.",
        },
        { status: 400 }
      );
    }

    if (
      proof.size <= 0 ||
      proof.size > MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        {
          error:
            "Payment proof must be 8MB or smaller.",
        },
        { status: 400 }
      );
    }

    if (
      !ALLOWED_TYPES.has(
        proof.type
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Payment proof must be JPG, PNG, or HEIC.",
        },
        { status: 400 }
      );
    }

    const db =
      supabaseAdmin();

    /*
     * Load the booking.
     */
    const {
      data: booking,
      error: bookingError,
    } = await db
      .from("bookings")
      .select(
        "id,status,reference_code,customer_name,preferred_date,preferred_time,estimated_total,down_payment"
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
            "Booking could not be found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Only approved bookings can
     * submit payment.
     */
    if (
      booking.status !==
      "approved"
    ) {
      return NextResponse.json(
        {
          error:
            "Payment is not currently available for this booking.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * The actual booking payment is
     * always the down payment amount.
     */
    const amount =
      Number(
        booking.down_payment ?? 0
      ) > 0
        ? Number(
            booking.down_payment
          )
        : DEFAULT_DOWN_PAYMENT;

    /*
     * Read QR PH fee from admin settings.
     * The client is never trusted for this amount.
     */
    let qrphFee =
      DEFAULT_QRPH_FEE;

    const {
      data: feeSetting,
    } =
      await db
        .from("site_settings")
        .select("value")
        .eq(
          "key",
          "qrph_fee"
        )
        .maybeSingle();

    if (
      feeSetting?.value !==
        null &&
      feeSetting?.value !==
        undefined
    ) {
      const configuredFee =
        Number(
          feeSetting.value
        );

      if (
        Number.isFinite(
          configuredFee
        ) &&
        configuredFee >= 0
      ) {
        qrphFee =
          configuredFee;
      }
    }

    const processingFee =
      method === "qrph"
        ? qrphFee
        : 0;

    const grossAmount =
      amount +
      processingFee;

    const netAmount =
      amount;

    /*
     * Prevent accidental duplicate
     * submissions while the booking
     * is awaiting review.
     */
    const {
      data: existingPayment,
    } =
      await db
        .from("payments")
        .select(
          "id,status"
        )
        .eq(
          "booking_id",
          booking.id
        )
        .eq(
          "status",
          "submitted"
        )
        .limit(1)
        .maybeSingle();

    if (existingPayment) {
      return NextResponse.json(
        {
          error:
            "A payment proof has already been submitted for this booking and is awaiting review.",
        },
        { status: 409 }
      );
    }

    const path =
      `${booking.id}/${makeToken(
        12
      )}-${sanitizeFilename(
        proof.name
      )}`;

    /*
     * Upload payment proof first.
     */
    const upload =
      await db.storage
        .from(
          "payment-proofs"
        )
        .upload(
          path,
          await proof.arrayBuffer(),
          {
            contentType:
              proof.type,
            upsert: false,
          }
        );

    if (upload.error) {
      throw upload.error;
    }

    /*
     * Create payment record.
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
            "booking_payment",

          status:
            "submitted",

          created_at:
            new Date().toISOString(),
        })
        .select(
          "id"
        )
        .single();

    if (
      paymentError ||
      !payment
    ) {
      await db.storage
        .from(
          "payment-proofs"
        )
        .remove([
          path,
        ])
        .catch(
          () => undefined
        );

      throw (
        paymentError ||
        new Error(
          "Unable to create payment record."
        )
      );
    }

    /*
     * Link the uploaded proof
     * to the booking.
     */
    const {
      error: proofError,
    } =
      await db
        .from(
          "payment_proofs"
        )
        .insert({
          booking_id:
            booking.id,

          bucket:
            "payment-proofs",

          path,
        });

    if (proofError) {
      await db
        .from("payments")
        .delete()
        .eq(
          "id",
          payment.id
        );

      await db.storage
        .from(
          "payment-proofs"
        )
        .remove([
          path,
        ])
        .catch(
          () => undefined
        );

      throw proofError;
    }

    /*
     * Move booking into payment review.
     *
     * Only update if the booking is
     * still approved.
     */
    const {
      error:
        bookingUpdateError,
    } =
      await db
        .from("bookings")
        .update({
          status:
            "payment_submitted",
        })
        .eq(
          "id",
          booking.id
        )
        .eq(
          "status",
          "approved"
        );

    if (
      bookingUpdateError
    ) {
      await db
        .from(
          "payment_proofs"
        )
        .delete()
        .eq(
          "booking_id",
          booking.id
        )
        .eq(
          "path",
          path
        );

      await db
        .from("payments")
        .delete()
        .eq(
          "id",
          payment.id
        );

      await db.storage
        .from(
          "payment-proofs"
        )
        .remove([
          path,
        ])
        .catch(
          () => undefined
        );

      throw bookingUpdateError;
    }

    /*
     * PAYMENT SUBMITTED NOTIFICATION
     *
     * This runs only after:
     * 1. Payment record was created
     * 2. Payment proof was linked
     * 3. Booking was successfully changed
     *    from approved -> payment_submitted
     *
     * A failed email must NOT make the
     * customer's payment submission fail.
     */
    try {
      await notifyPaymentProofSubmitted({
        booking: {
          id:
            booking.id,

          reference_code:
            booking.reference_code,

          customer_name:
            booking.customer_name,

          preferred_date:
            booking.preferred_date,

          preferred_time:
            booking.preferred_time,
        },

        method,

        amount,
      });
    } catch (notificationError) {
      console.error(
        "Payment submitted notification failed:",
        notificationError
      );
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error: unknown) {
    console.error(
      "Payment proof error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to submit payment proof.",
      },
      { status: 500 }
    );
  }
}