import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const ALLOWED_ACTIONS = [
  "approve",
  "feature",
  "hide",
  "unfeature",
  "delete",
] as const;

type ReviewAction =
  (typeof ALLOWED_ACTIONS)[number];

async function getAdminDb() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

export async function GET() {
  try {
    const db = await getAdminDb();

    if (!db) {
      return errorResponse(
        "Unauthorized",
        401
      );
    }

    const {
      data: reviews,
      error,
    } = await db
      .from("reviews")
      .select(
        `
        id,
        booking_id,
        customer_name,
        rating,
        review_text,
        nail_photo_path,
        public_consent,
        status,
        admin_note,
        created_at,
        approved_at,
        featured_at,
        bookings (
          id,
          reference_code,
          status,
          appointment_date,
          appointment_time
        )
        `
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (error) {
      console.error(
        "Admin reviews query error:",
        error
      );

      return errorResponse(
        "Unable to load reviews.",
        500
      );
    }

    return NextResponse.json({
      reviews:
        reviews || [],
    });
  } catch (error) {
    console.error(
      "Admin reviews GET error:",
      error
    );

    return errorResponse(
      "Unable to load reviews.",
      500
    );
  }
}

export async function PATCH(
  request: NextRequest
) {
  try {
    const db = await getAdminDb();

    if (!db) {
      return errorResponse(
        "Unauthorized",
        401
      );
    }

    const body =
      await request
        .json()
        .catch(() => ({}));

    const reviewId =
      String(
        body.id || ""
      ).trim();

    const action =
      String(
        body.action || ""
      )
        .trim()
        .toLowerCase() as ReviewAction;

    const adminNote =
      String(
        body.admin_note || ""
      )
        .trim()
        .slice(0, 1000);

    if (!reviewId) {
      return errorResponse(
        "Review ID is required."
      );
    }

    if (
      !ALLOWED_ACTIONS.includes(
        action
      )
    ) {
      return errorResponse(
        "Invalid review action."
      );
    }

    const {
      data: review,
      error: reviewError,
    } = await db
      .from("reviews")
      .select(
        `
        id,
        booking_id,
        status,
        public_consent
        `
      )
      .eq("id", reviewId)
      .maybeSingle();

    if (
      reviewError
    ) {
      console.error(
        reviewError
      );

      return errorResponse(
        "Unable to find review.",
        500
      );
    }

    if (!review) {
      return errorResponse(
        "Review not found.",
        404
      );
    }

    const now =
      new Date().toISOString();

    /*
     * =========================================================
     * APPROVE
     * =========================================================
     *
     * Approval means the review has passed moderation.
     *
     * It does NOT automatically feature the review.
     */

    if (
      action === "approve"
    ) {
      if (
        review.status ===
        "hidden"
      ) {
        return errorResponse(
          "A hidden review must be restored before it can be approved."
        );
      }

      const {
        error,
      } = await db
        .from("reviews")
        .update({
          status:
            "approved",

          approved_at:
            now,

          admin_note:
            adminNote ||
            null,
        })
        .eq(
          "id",
          reviewId
        );

      if (error) {
        throw error;
      }

      return NextResponse.json({
        ok: true,
        status:
          "approved",
      });
    }

    /*
     * =========================================================
     * FEATURE
     * =========================================================
     *
     * Only reviews that have been approved AND have
     * public consent can be featured publicly.
     */

    if (
      action === "feature"
    ) {
      if (
        review.status !==
          "approved" &&
        review.status !==
          "featured"
      ) {
        return errorResponse(
          "Only approved reviews can be featured."
        );
      }

      if (
        !review.public_consent
      ) {
        return errorResponse(
          "This customer did not provide public display consent."
        );
      }

      const {
        error,
      } = await db
        .from("reviews")
        .update({
          status:
            "featured",

          featured_at:
            now,

          admin_note:
            adminNote ||
            null,
        })
        .eq(
          "id",
          reviewId
        );

      if (error) {
        throw error;
      }

      return NextResponse.json({
        ok: true,
        status:
          "featured",
      });
    }

    /*
     * =========================================================
     * UNFEATURE
     * =========================================================
     *
     * Keeps the review approved but removes it from
     * the homepage/featured collection.
     */

    if (
      action ===
      "unfeature"
    ) {
      if (
        review.status !==
        "featured"
      ) {
        return errorResponse(
          "This review is not currently featured."
        );
      }

      const {
        error,
      } = await db
        .from("reviews")
        .update({
          status:
            "approved",

          featured_at:
            null,

          admin_note:
            adminNote ||
            null,
        })
        .eq(
          "id",
          reviewId
        );

      if (error) {
        throw error;
      }

      return NextResponse.json({
        ok: true,
        status:
          "approved",
      });
    }

    /*
     * =========================================================
     * HIDE
     * =========================================================
     */

    if (
      action === "hide"
    ) {
      const {
        error,
      } = await db
        .from("reviews")
        .update({
          status:
            "hidden",

          admin_note:
            adminNote ||
            null,
        })
        .eq(
          "id",
          reviewId
        );

      if (error) {
        throw error;
      }

      return NextResponse.json({
        ok: true,
        status:
          "hidden",
      });
    }

    /*
     * =========================================================
     * DELETE
     * =========================================================
     */

    if (
      action === "delete"
    ) {
      if (
        body.confirm !== true
      ) {
        return errorResponse(
          "Delete confirmation is required."
        );
      }

      /*
       * Capture the photo path before deleting the row.
       */

      const {
        data: photoReview,
      } = await db
        .from("reviews")
        .select(
          "nail_photo_path"
        )
        .eq(
          "id",
          reviewId
        )
        .maybeSingle();

      const {
        error: deleteError,
      } = await db
        .from("reviews")
        .delete()
        .eq(
          "id",
          reviewId
        );

      if (
        deleteError
      ) {
        throw deleteError;
      }

      /*
       * Storage cleanup is best-effort.
       */

      if (
        photoReview
          ?.nail_photo_path
      ) {
        const {
          error:
            storageError,
        } = await db.storage
          .from(
            "review-photos"
          )
          .remove([
            photoReview.nail_photo_path,
          ]);

        if (
          storageError
        ) {
          console.error(
            "Review photo cleanup failed:",
            storageError
          );
        }
      }

      return NextResponse.json({
        ok: true,
        deleted: true,
      });
    }

    return errorResponse(
      "Invalid review action."
    );
  } catch (error: any) {
    console.error(
      "Admin review action error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to update review.",
      },
      {
        status: 500,
      }
    );
  }
}