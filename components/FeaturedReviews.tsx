"use client";

import { useEffect, useState } from "react";

type Review = {
  id: string;
  customer_name: string;
  rating: number;
  review_text: string;
  nail_photo_url: string | null;
  created_at: string;
};

function Stars({
  rating,
}: {
  rating: number;
}) {
  return (
    <div
      className="flex gap-0.5"
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map(
        (star) => (
          <span
            key={star}
            className={
              star <= rating
                ? "text-black"
                : "text-black/15"
            }
          >
            ★
          </span>
        )
      )}
    </div>
  );
}

export default function FeaturedReviews() {
  const [
    reviews,
    setReviews,
  ] = useState<Review[]>(
    []
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const response =
          await fetch(
            "/api/reviews/featured",
            {
              cache: "no-store",
            }
          );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        setReviews(
          data.reviews || []
        );
      } catch (error) {
        console.error(
          "Unable to load featured reviews:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (
    loading ||
    reviews.length === 0
  ) {
    return null;
  }

  return (
    <section
      id="reviews"
      className="px-4 py-16 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-black/40">
            Client love
          </p>

          <h2 className="mt-3 font-serif text-3xl sm:text-4xl">
            What our clients say
          </h2>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map(
            (review) => (
              <article
                key={review.id}
                className="overflow-hidden rounded-3xl border border-black/10 bg-white"
              >
                {review.nail_photo_url && (
                  <div className="aspect-[4/3] overflow-hidden bg-[#faf7f4]">
                    <img
                      src={
                        review.nail_photo_url
                      }
                      alt={`Nails by ${review.customer_name}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                <div className="p-6">
                  <Stars
                    rating={
                      review.rating
                    }
                  />

                  <blockquote className="mt-4 text-sm leading-7 text-black/70">
                    “
                    {
                      review.review_text
                    }
                    ”
                  </blockquote>

                  <p className="mt-5 text-sm font-medium">
                    {
                      review.customer_name
                    }
                  </p>
                </div>
              </article>
            )
          )}
        </div>
      </div>
    </section>
  );
}