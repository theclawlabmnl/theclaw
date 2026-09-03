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

type ReviewAction = (typeof ALLOWED_ACTIONS)[number];

async function getAdminDb() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

function errorResponse(
  message: string,
  status = 400
) {
  return NextResponse.json(
    { error: message },
    { status }
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

    /*
     * Use reviews.* instead of naming columns that
     * may not exist in the current reviews schema.
     *
     * Booking information is loaded from the related
     * bookings row.
     */
    const { data: reviews, error } = await db
      .from("reviews")
      .select(
        `
        *,
        bookings (
          id,
          reference_code,
          customer_name,
          status,
          preferred_date,
          preferred_time
        )
        `
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Admin reviews query error:",
        error
      );

      return NextResponse.json(
        {
          error:
            error.message ||
            "Unable to load reviews.",
        },
        { status: 500 }
      );
    }

    const normalizedReviews = (reviews || []).map(
      (review: any) => {
        const booking = Array.isArray(
          review.bookings
        )
          ? review.bookings[0] || null
          : review.bookings || null;

        return {
          ...review,
          bookings: booking,
          customer_name:
            review.customer_name ||
            booking?.customer_name ||
            "Customer",
          rating:
            Number(review.rating || 0),
          review_text:
            review.review_text || "",
          public_consent:
            Boolean(review.public_consent),
          status:
            review.status || "pending",
          admin_note: null,
        };
      }
    );

    return NextResponse.json({
      reviews: normalizedReviews,
    });
  } catch (error: any) {
    console.error(
      "Admin reviews GET error:",
      error
    );

    return errorResponse(
      error?.message ||
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

    const body = await request
      .json()
      .catch(() => ({}));

    const reviewId = String(
      body.id || ""
    ).trim();

    const action = String(
      body.action || ""
    )
      .trim()
      .toLowerCase() as ReviewAction;

    if (!reviewId) {
      return errorResponse(
        "Review ID is required."
      );
    }

    if (
      !ALLOWED_ACTIONS.includes(action)
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
      .select("*")
      .eq("id", reviewId)
      .maybeSingle();

    if (reviewError) {
      console.error(
        "Review lookup error:",
        reviewError
      );

      return errorResponse(
        reviewError.message ||
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

    if (action === "approve") {
      const { error } = await db
        .from("reviews")
        .update({
          status: "approved",
        })
        .eq("id", reviewId);

      if (error) {
        throw error;
      }

      return NextResponse.json({
        ok: true,
        status: "approved",
      });
    }

    if (action === "feature") {
      if (
        review.status !== "approved" &&
        review.status !== "featured"
      ) {
        return errorResponse(
          "Only approved reviews can be featured."
        );
      }

      if (!review.public_consent) {
        return errorResponse(
          "This customer did not provide public display consent."
        );
      }

      const { error } = await db
        .from("reviews")
        .update({
          status: "featured",
        })
        .eq("id", reviewId);

      if (error) {
        throw error;
      }

      return NextResponse.json({
        ok: true,
        status: "featured",
      });
    }

    if (action === "unfeature") {
      if (
        review.status !== "featured"
      ) {
        return errorResponse(
          "This review is not currently featured."
        );
      }

      const { error } = await db
        .from("reviews")
        .update({
          status: "approved",
        })
        .eq("id", reviewId);

      if (error) {
        throw error;
      }

      return NextResponse.json({
        ok: true,
        status: "approved",
      });
    }

    if (action === "hide") {
      const { error } = await db
        .from("reviews")
        .update({
          status: "hidden",
        })
        .eq("id", reviewId);

      if (error) {
        throw error;
      }

      return NextResponse.json({
        ok: true,
        status: "hidden",
      });
    }

    if (action === "delete") {
      if (body.confirm !== true) {
        return errorResponse(
          "Delete confirmation is required."
        );
      }

      const { error: deleteError } = await db
        .from("reviews")
        .delete()
        .eq("id", reviewId);

      if (deleteError) {
        throw deleteError;
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
      { status: 500 }
    );
  }
}
