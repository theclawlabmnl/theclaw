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

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const DEFAULT_DOWN_PAYMENT = 200;
const DEFAULT_QRPH_FEE = 5;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
]);

type PaymentMethod = {
  id: string;
  name: string;
  processing_fee: number;
  active: boolean;
};

function legacyMethods(
  qrphFee: number
): PaymentMethod[] {
  return [
    {
      id: "gcash",
      name: "GCash",
      processing_fee: 0,
      active: true,
    },
    {
      id: "qrph",
      name: "QR PH",
      processing_fee: qrphFee,
      active: true,
    },
  ];
}

function parseMethods(
  raw: string | null | undefined,
  qrphFee: number
): PaymentMethod[] {
  try {
    const parsed = JSON.parse(raw || "[]");

    if (Array.isArray(parsed) && parsed.length) {
      return parsed
        .map((item: any) => ({
          id: String(item?.id || "").trim(),
          name: String(item?.name || "").trim(),
          processing_fee: Math.max(
            0,
            Number(item?.processing_fee || 0)
          ),
          active: item?.active !== false,
        }))
        .filter(
          (item: PaymentMethod) =>
            item.id && item.name
        );
    }
  } catch {}

  return legacyMethods(qrphFee);
}

export async function POST(
  request: NextRequest
) {
  try {
    const formData = await request.formData();

    const token = String(
      formData.get("token") || ""
    ).trim();

    const methodId = String(
      formData.get("method") || ""
    )
      .trim()
      .toLowerCase();

    const proof = formData.get("proof");

    if (!token) {
      return NextResponse.json(
        { error: "Booking token is required." },
        { status: 400 }
      );
    }

    if (!methodId) {
      return NextResponse.json(
        { error: "Please select a valid payment method." },
        { status: 400 }
      );
    }

    if (!(proof instanceof File)) {
      return NextResponse.json(
        { error: "Please upload your payment proof." },
        { status: 400 }
      );
    }

    if (
      proof.size <= 0 ||
      proof.size > MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        { error: "Payment proof must be 8MB or smaller." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(proof.type)) {
      return NextResponse.json(
        { error: "Payment proof must be JPG, PNG, or HEIC." },
        { status: 400 }
      );
    }

    const db = supabaseAdmin();

    const [
      { data: booking, error: bookingError },
      { data: settingsRows },
    ] = await Promise.all([
      db
        .from("bookings")
        .select(
          "id,status,reference_code,customer_name,preferred_date,preferred_time,estimated_total,down_payment"
        )
        .eq("access_token", token)
        .single(),

      db
        .from("site_settings")
        .select("key,value")
        .in("key", [
          "payment_methods",
          "qrph_fee",
        ]),
    ]);

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Booking could not be found." },
        { status: 404 }
      );
    }

    if (booking.status !== "approved") {
      return NextResponse.json(
        {
          error:
            "Payment is not currently available for this booking.",
        },
        { status: 400 }
      );
    }

    const settings = Object.fromEntries(
      (settingsRows || []).map((row) => [
        row.key,
        String(row.value ?? ""),
      ])
    );

    const configuredQrphFee =
      Number(settings.qrph_fee);

    const qrphFee =
      Number.isFinite(configuredQrphFee) &&
      configuredQrphFee >= 0
        ? configuredQrphFee
        : DEFAULT_QRPH_FEE;

    const paymentMethods = parseMethods(
      settings.payment_methods,
      qrphFee
    );

    const selectedMethod =
      paymentMethods.find(
        (item) =>
          item.id.toLowerCase() === methodId &&
          item.active
      );

    if (!selectedMethod) {
      return NextResponse.json(
        {
          error:
            "This payment method is no longer available. Please refresh the payment page and choose another method.",
        },
        { status: 400 }
      );
    }

    const amount =
      Number(booking.down_payment ?? 0) > 0
        ? Number(booking.down_payment)
        : DEFAULT_DOWN_PAYMENT;

    const processingFee = Math.max(
      0,
      Number(selectedMethod.processing_fee || 0)
    );

    const grossAmount =
      amount + processingFee;

    const netAmount = amount;

    const { data: existingPayment } =
      await db
        .from("payments")
        .select("id,status")
        .eq("booking_id", booking.id)
        .eq("status", "submitted")
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
      `${booking.id}/${makeToken(12)}-${sanitizeFilename(
        proof.name
      )}`;

    const upload =
      await db.storage
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

        // Store the human-readable name so Booking Details
        // and Admin Payments automatically show the actual
        // method the customer used.
        method: selectedMethod.name,

        amount,
        gross_amount: grossAmount,
        processing_fee: processingFee,
        net_amount: netAmount,
        payment_type: "booking_payment",
        status: "submitted",
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (paymentError || !payment) {
      await db.storage
        .from("payment-proofs")
        .remove([path])
        .catch(() => undefined);

      throw (
        paymentError ||
        new Error("Unable to create payment record.")
      );
    }

    const { error: proofError } =
      await db
        .from("payment_proofs")
        .insert({
          booking_id: booking.id,
          bucket: "payment-proofs",
          path,
        });

    if (proofError) {
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

    const { error: bookingUpdateError } =
      await db
        .from("bookings")
        .update({
          status: "payment_submitted",
        })
        .eq("id", booking.id)
        .eq("status", "approved");

    if (bookingUpdateError) {
      await db
        .from("payment_proofs")
        .delete()
        .eq("booking_id", booking.id)
        .eq("path", path);

      await db
        .from("payments")
        .delete()
        .eq("id", payment.id);

      await db.storage
        .from("payment-proofs")
        .remove([path])
        .catch(() => undefined);

      throw bookingUpdateError;
    }

    try {
      await notifyPaymentProofSubmitted({
        booking: {
          id: booking.id,
          reference_code: booking.reference_code,
          customer_name: booking.customer_name,
          preferred_date: booking.preferred_date,
          preferred_time: booking.preferred_time,
        },
        method: selectedMethod.name,
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
    console.error("Payment proof error:", error);

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
