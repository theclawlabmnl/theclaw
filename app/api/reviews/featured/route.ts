import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const db = supabaseAdmin();

    const {
      data: reviews,
      error,
    } = await db
      .from("reviews")
      .select(
        `
        id,
        customer_name,
        rating,
        review_text,
        nail_photo_path,
        created_at
        `
      )
      .eq("status", "featured")
      .eq("public_consent", true)
      .order("created_at", {
        ascending: false,
      })
      .limit(12);

    if (error) {
      console.error(
        "Featured reviews error:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Unable to load reviews.",
        },
        {
          status: 500,
        }
      );
    }

    const output = [];

    for (const review of reviews || []) {
      let photoUrl: string | null = null;

      if (review.nail_photo_path) {
        const {
          data: signedUrl,
          error: signedUrlError,
        } = await db.storage
          .from("review-photos")
          .createSignedUrl(
            review.nail_photo_path,
            60 * 60
          );

        if (!signedUrlError) {
          photoUrl =
            signedUrl?.signedUrl ||
            null;
        }
      }

      output.push({
        id: review.id,

        customer_name:
          review.customer_name,

        rating:
          review.rating,

        review_text:
          review.review_text,

        nail_photo_url:
          photoUrl,

        created_at:
          review.created_at,
      });
    }

    return NextResponse.json({
      reviews: output,
    });
  } catch (error) {
    console.error(
      "Featured reviews API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to load reviews.",
      },
      {
        status: 500,
      }
    );
  }
}