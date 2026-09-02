import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

const MAX_REVIEW_LENGTH = 2000;
const MAX_NAME_LENGTH = 120;
const MAX_FILE_SIZE = 8 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function errorResponse(
  message: string,
  status = 400
) {
  return NextResponse.json(
    {
      error: message,
    },
    {
      status,
    }
  );
}

function cleanText(
  value: unknown,
  maxLength: number
) {
  return String(value || "")
    .trim()
    .slice(0, maxLength);
}

export async function GET(
  request: NextRequest
) {
  try {
    const bookingId =
      request.nextUrl.searchParams.get(
        "booking_id"
      );

    if (!bookingId) {
      return errorResponse(
        "Booking ID is required."
      );
    }

    const db =
      supabaseAdmin();

    const {
      data: booking,
      error: bookingError,
    } = await db
      .from("bookings")
      .select(
        `
        id,
        reference_code,
        status,
        customer_name
        `
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (
      bookingError
    ) {
      console.error(
        bookingError
      );

      return errorResponse(
        "Unable to check booking.",
        500
      );
    }

    if (!booking) {
      return errorResponse(
        "Booking not found.",
        404
      );
    }

    if (
      booking.status !==
      "completed"
    ) {
      return errorResponse(
        "This booking is not yet eligible for a review.",
        400
      );
    }

    const {
      data: existingReview,
      error: reviewError,
    } = await db
      .from("reviews")
      .select(
        `
        id,
        rating,
        review_text,
        status,
        created_at
        `
      )
      .eq(
        "booking_id",
        bookingId
      )
      .maybeSingle();

    if (
      reviewError
    ) {
      console.error(
        reviewError
      );

      return errorResponse(
        "Unable to check review.",
        500
      );
    }

    return NextResponse.json({
      eligible: true,

      booking: {
        id: booking.id,
        reference_code:
          booking.reference_code,
        customer_name:
          booking.customer_name,
      },

      already_reviewed:
        Boolean(
          existingReview
        ),

      review:
        existingReview ||
        null,
    });
  } catch (error) {
    console.error(
      "Review eligibility error:",
      error
    );

    return errorResponse(
      "Unable to check review eligibility.",
      500
    );
  }
}


export async function POST(
  request: NextRequest
) {
  try {
    const formData =
      await request.formData();

    const bookingId =
      cleanText(
        formData.get(
          "booking_id"
        ),
        100
      );

    const customerName =
      cleanText(
        formData.get(
          "customer_name"
        ),
        MAX_NAME_LENGTH
      );

    const reviewText =
      cleanText(
        formData.get(
          "review_text"
        ),
        MAX_REVIEW_LENGTH
      );

    const ratingRaw =
      cleanText(
        formData.get(
          "rating"
        ),
        10
      );

    const consentRaw =
      formData.get(
        "public_consent"
      );

    const publicConsent =
      consentRaw ===
        "true" ||
      consentRaw ===
        "on" ||
      consentRaw ===
        "1";

    if (!bookingId) {
      return errorResponse(
        "Booking ID is required."
      );
    }

    if (!customerName) {
      return errorResponse(
        "Customer name is required."
      );
    }

    if (!reviewText) {
      return errorResponse(
        "Please tell us about your experience."
      );
    }

    if (
      reviewText.length >
      MAX_REVIEW_LENGTH
    ) {
      return errorResponse(
        `Review must be ${MAX_REVIEW_LENGTH} characters or less.`
      );
    }

    const rating =
      Number(
        ratingRaw
      );

    if (
      !Number.isInteger(
        rating
      ) ||
      rating < 1 ||
      rating > 5
    ) {
      return errorResponse(
        "Please select a rating from 1 to 5."
      );
    }

    const db =
      supabaseAdmin();

    /*
     * ----------------------------------------------------------
     * Confirm booking
     * ----------------------------------------------------------
     */

    const {
      data: booking,
      error: bookingError,
    } = await db
      .from("bookings")
      .select(
        `
        id,
        status,
        customer_name,
        reference_code
        `
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (
      bookingError
    ) {
      console.error(
        bookingError
      );

      return errorResponse(
        "Unable to verify booking.",
        500
      );
    }

    if (!booking) {
      return errorResponse(
        "Booking not found.",
        404
      );
    }

    /*
     * Only completed appointments may leave reviews.
     */

    if (
      booking.status !==
      "completed"
    ) {
      return errorResponse(
        "Reviews are only available after the appointment has been completed."
      );
    }

    /*
     * ----------------------------------------------------------
     * Prevent duplicate review
     * ----------------------------------------------------------
     */

    const {
      data: existingReview,
      error: existingError,
    } = await db
      .from("reviews")
      .select("id")
      .eq(
        "booking_id",
        bookingId
      )
      .maybeSingle();

    if (
      existingError
    ) {
      console.error(
        existingError
      );

      return errorResponse(
        "Unable to check existing review.",
        500
      );
    }

    if (
      existingReview
    ) {
      return errorResponse(
        "A review has already been submitted for this appointment."
      );
    }

    /*
     * ----------------------------------------------------------
     * Optional nail photo
     * ----------------------------------------------------------
     */

    const photo =
      formData.get(
        "nail_photo"
      );

    let photoPath:
      | string
      | null = null;

    if (
      photo instanceof File &&
      photo.size > 0
    ) {
      if (
        photo.size >
        MAX_FILE_SIZE
      ) {
        return errorResponse(
          "The nail photo must be 8MB or smaller."
        );
      }

      if (
        !ALLOWED_IMAGE_TYPES.includes(
          photo.type
        )
      ) {
        return errorResponse(
          "Please upload a JPG, PNG, or WebP image."
        );
      }

      const extensionMap: Record<
        string,
        string
      > = {
        "image/jpeg":
          "jpg",
        "image/png":
          "png",
        "image/webp":
          "webp",
      };

      const extension =
        extensionMap[
          photo.type
        ];

      const randomPart =
        crypto.randomUUID();

      photoPath =
        `${bookingId}/${randomPart}.${extension}`;

      const buffer =
        Buffer.from(
          await photo.arrayBuffer()
        );

      const {
        error:
          uploadError,
      } = await db.storage
        .from(
          "review-photos"
        )
        .upload(
          photoPath,
          buffer,
          {
            contentType:
              photo.type,
            upsert: false,
          }
        );

      if (
        uploadError
      ) {
        console.error(
          "Review photo upload error:",
          uploadError
        );

        return errorResponse(
          "Unable to upload the nail photo.",
          500
        );
      }
    }

    /*
     * ----------------------------------------------------------
     * Create pending review
     * ----------------------------------------------------------
     *
     * IMPORTANT:
     * New reviews ALWAYS start as pending.
     *
     * public_consent does NOT automatically publish a review.
     */

    const {
      data: review,
      error: insertError,
    } = await db
      .from("reviews")
      .insert({
        booking_id:
          bookingId,

        customer_name:
          customerName,

        rating,

        review_text:
          reviewText,

        nail_photo_path:
          photoPath,

        public_consent:
          publicConsent,

        status:
          "pending",
      })
      .select(
        `
        id,
        booking_id,
        customer_name,
        rating,
        review_text,
        public_consent,
        status,
        created_at
        `
      )
      .single();

    if (
      insertError
    ) {
      /*
       * If DB insertion fails after photo upload,
       * clean up the uploaded file.
       */

      if (
        photoPath
      ) {
        await db.storage
          .from(
            "review-photos"
          )
          .remove([
            photoPath,
          ])
          .catch(
            () => undefined
          );
      }

      console.error(
        "Review insert error:",
        insertError
      );

      if (
        insertError.code ===
        "23505"
      ) {
        return errorResponse(
          "A review has already been submitted for this appointment."
        );
      }

      return errorResponse(
        "Unable to submit your review.",
        500
      );
    }

    return NextResponse.json(
      {
        ok: true,

        message:
          "Thank you! Your review has been submitted and is awaiting approval.",

        review,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Create review error:",
      error
    );

    return errorResponse(
      "Unable to submit your review.",
      500
    );
  }
}