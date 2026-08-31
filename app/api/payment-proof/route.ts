import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { makeToken, sanitizeFilename } from "@/lib/utils";
import { notifyPaymentProofSubmitted } from "@/lib/notifications";

const MAX_FILE_SIZE = 8 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
]);

export async function POST(
  request: NextRequest
) {
  try {
    const formData = await request.formData();

    const token = String(
      formData.get("token") || ""
    ).trim();

    const method = String(
      formData.get("method") || ""
    ).trim();

    const amount = Number(
      formData.get("amount") || 0
    );

    const proof = formData.get("proof");

    if (
      !token ||
      !method ||
      !(proof instanceof File)
    ) {
      return NextResponse.json(
        {
          error:
            "Payment method, booking token, and proof are required.",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          error: "Invalid payment amount.",
        },
        { status: 400 }
      );
    }

    if (proof.size <= 0 || proof.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error:
            "Payment proof must be 8MB or smaller.",
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(proof.type)) {
      return NextResponse.json(
        {
          error:
            "Payment proof must be JPG, PNG, or HEIC.",
        },
        { status: 400 }
      );
    }

    const db = supabaseAdmin();

    const {
      data: booking,
      error: bookingError,
    } = await db
      .from("bookings")
      .select(
        "id,status,reference_code,customer_name,preferred_date,preferred_time,access_token"
      )
      .eq("access_token", token)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        {
          error: "Booking not found.",
        },
        { status: 404 }
      );
    }

    if (booking.status !== "approved") {
      return NextResponse.json(
        {
          error:
            "This booking is not currently awaiting payment.",
        },
        { status: 400 }
      );
    }

    const path =
      `${booking.id}/${makeToken(12)}-${sanitizeFilename(
        proof.name
      )}`;

    const upload = await db.storage
      .from("payment-proofs")
      .upload(
        path,
        await proof.arrayBuffer(),
        {
          contentType: proof.type,
          upsert: false,
        }
      );

    if (upload.error) {
      throw upload.error;
    }

    const {
      data: payment,
      error: paymentError,
    } = await db
      .from("payments")
      .insert({
        booking_id: booking.id,
        method,
        amount,
        status: "submitted",
      })
      .select("id,booking_id,method,amount,status,created_at")
      .single();

    if (paymentError || !payment) {
      // Remove the uploaded file if the payment record could not be created.
      await db.storage
        .from("payment-proofs")
        .remove([path])
        .catch(() => undefined);

      throw (
        paymentError ||
        new Error("Unable to create payment record.")
      );
    }

    const {
      error: proofError,
    } = await db
      .from("payment_proofs")
      .insert({
        booking_id: booking.id,
        bucket: "payment-proofs",
        path,
      });

    if (proofError) {
      // Roll back what we can so the booking does not look paid
      // without a corresponding proof record.
      await db
        .from("payments")
        .delete()
        .eq("id", payment.id);

      await db.storage
        .from("payment-proofs")
        .remove([path])
        .catch(() => undefined);

      throw proofError;
    }

    const {
      error: bookingUpdateError,
    } = await db
      .from("bookings")
      .update({
        status: "payment_submitted",
      })
      .eq("id", booking.id)
      .eq("status", "approved");

    if (bookingUpdateError) {
      throw bookingUpdateError;
    }

    // Email notification is intentionally non-blocking.
    // A mail problem must not make a successful payment-proof upload fail.
    try {
      await notifyPaymentProofSubmitted({
        booking: {
          id: booking.id,
          reference_code: booking.reference_code,
          customer_name: booking.customer_name,
          preferred_date: booking.preferred_date,
          preferred_time: booking.preferred_time,
        },
        method,
        amount,
      });
    } catch (notificationError) {
      console.error(
        "Payment proof notification failed:",
        notificationError
      );
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error: any) {
    console.error(
      "Payment proof error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to upload proof.",
      },
      { status: 500 }
    );
  }
}
