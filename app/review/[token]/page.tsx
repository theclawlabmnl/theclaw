"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  useSearchParams,
} from "next/navigation";

type Booking = {
  id: string;
  reference_code: string;
  customer_name: string;
};

type ExistingReview = {
  id: string;
  rating: number;
  review_text: string;
  status: string;
  created_at: string;
};

export default function ReviewPage() {
  const searchParams =
    useSearchParams();

  const bookingId =
    searchParams.get(
      "booking_id"
    );

  const [
    booking,
    setBooking,
  ] = useState<Booking | null>(
    null
  );

  const [
    existingReview,
    setExistingReview,
  ] =
    useState<ExistingReview | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    submitted,
    setSubmitted,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    rating,
    setRating,
  ] = useState(0);

  const [
    hoverRating,
    setHoverRating,
  ] = useState(0);

  const [
    reviewText,
    setReviewText,
  ] = useState("");

  const [
    publicConsent,
    setPublicConsent,
  ] = useState(false);

  const [
    photo,
    setPhoto,
  ] = useState<File | null>(
    null
  );

  useEffect(() => {
    if (!bookingId) {
      setError("No booking was specified.");
       setLoading(false);
       return;
}
const validBookingId = bookingId;

    async function load() {
      try {
        const response = await fetch(
            `/api/reviews?booking_id=${encodeURIComponent(validBookingId)}`
    );


        const data =
          await response
            .json()
            .catch(
              () => ({})
            );

        if (
          !response.ok
        ) {
          throw new Error(
            data?.error ||
              "Unable to load review."
          );
        }

        setBooking(
          data.booking
        );

        if (
          data.already_reviewed
        ) {
          setExistingReview(
            data.review
          );
        }
      } catch (
        loadError: any
      ) {
        setError(
          loadError?.message ||
            "Unable to load review."
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [bookingId]);

  function handlePhoto(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      setPhoto(null);
      return;
    }

    setPhoto(file);
  }

  async function submit(
    event: FormEvent
  ) {
    event.preventDefault();

    setError("");

    if (!bookingId) {
      setError(
        "No booking was specified."
      );

      return;
    }

    if (rating < 1) {
      setError(
        "Please select a star rating."
      );

      return;
    }

    if (!reviewText.trim()) {
      setError(
        "Please tell us about your experience."
      );

      return;
    }

    setSubmitting(true);

    try {
      const formData =
        new FormData();

      formData.append(
        "booking_id",
        bookingId
      );

      formData.append(
        "customer_name",
        booking?.customer_name ||
          ""
      );

      formData.append(
        "rating",
        String(rating)
      );

      formData.append(
        "review_text",
        reviewText.trim()
      );

      formData.append(
        "public_consent",
        String(
          publicConsent
        )
      );

      if (photo) {
        formData.append(
          "nail_photo",
          photo
        );
      }

      const response =
        await fetch(
          "/api/reviews",
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (
        !response.ok
      ) {
        throw new Error(
          data?.error ||
            "Unable to submit review."
        );
      }

      setSubmitted(true);
    } catch (
      submitError: any
    ) {
      setError(
        submitError?.message ||
          "Unable to submit review."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#faf7f4] px-4 py-12">
        <div className="mx-auto max-w-xl">
          <div className="rounded-3xl border border-black/10 bg-white p-8 text-center">
            Loading…
          </div>
        </div>
      </main>
    );
  }

  if (error && !booking) {
    return (
      <main className="min-h-screen bg-[#faf7f4] px-4 py-12">
        <div className="mx-auto max-w-xl">
          <div className="rounded-3xl border border-red-200 bg-white p-8 text-center">
            <h1 className="font-serif text-2xl">
              Oops ♡
            </h1>

            <p className="mt-3 text-sm text-red-700">
              {error}
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (
    existingReview ||
    submitted
  ) {
    return (
      <main className="min-h-screen bg-[#faf7f4] px-4 py-12">
        <div className="mx-auto max-w-xl">
          <div className="rounded-3xl border border-black/10 bg-white p-8 text-center sm:p-10">
            <div className="text-4xl">
              ♡
            </div>

            <h1 className="mt-4 font-serif text-3xl">
              Thank you!
            </h1>

            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-black/60">
              Your review has been
              submitted and is now
              awaiting approval.
            </p>

            <p className="mt-6 text-xs uppercase tracking-[0.18em] text-black/40">
              {booking?.reference_code}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf7f4] px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-xl">
        <div className="rounded-3xl border border-black/10 bg-white p-5 sm:p-8">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-black/40">
              The Claw Lab
            </p>

            <h1 className="mt-3 font-serif text-3xl sm:text-4xl">
              How was your Claw Lab
              experience? ♡
            </h1>

            {booking && (
              <p className="mt-3 text-sm text-black/50">
                Hi{" "}
                {booking.customer_name}.
                We’d love to hear
                from you.
              </p>
            )}
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form
            onSubmit={submit}
            className="mt-8 space-y-7"
          >
            <div>
              <label className="block text-sm font-medium">
                Your rating
              </label>

              <div
                className="mt-3 flex justify-center gap-1 sm:justify-start"
                onMouseLeave={() =>
                  setHoverRating(
                    0
                  )
                }
              >
                {[1, 2, 3, 4, 5].map(
                  (star) => {
                    const active =
                      star <=
                      (hoverRating ||
                        rating);

                    return (
                      <button
                        key={star}
                        type="button"
                        aria-label={`${star} star${
                          star > 1
                            ? "s"
                            : ""
                        }`}
                        onMouseEnter={() =>
                          setHoverRating(
                            star
                          )
                        }
                        onClick={() =>
                          setRating(
                            star
                          )
                        }
                        className={`text-4xl leading-none transition-transform hover:scale-110 ${
                          active
                            ? "text-black"
                            : "text-black/15"
                        }`}
                      >
                        ★
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="review"
                className="block text-sm font-medium"
              >
                Tell us about your
                experience
              </label>

              <textarea
                id="review"
                value={reviewText}
                onChange={(event) =>
                  setReviewText(
                    event.target
                      .value
                  )
                }
                maxLength={
                  2000
                }
                rows={6}
                placeholder="What did you love about your appointment?"
                className="mt-2 w-full max-w-full resize-y rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-black/30"
              />

              <p className="mt-1 text-right text-xs text-black/40">
                {
                  reviewText.length
                }
                /2000
              </p>
            </div>

            <div>
              <label
                htmlFor="nail-photo"
                className="block text-sm font-medium"
              >
                Upload a photo of
                your nails
                <span className="ml-1 font-normal text-black/40">
                  optional
                </span>
              </label>

              <input
                id="nail-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={
                  handlePhoto
                }
                className="mt-2 block w-full max-w-full rounded-2xl border border-black/10 p-3 text-sm"
              />

              {photo && (
                <p className="mt-2 text-xs text-black/50">
                  {photo.name}
                </p>
              )}
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-[#faf7f4] p-4">
              <input
                type="checkbox"
                checked={
                  publicConsent
                }
                onChange={(
                  event
                ) =>
                  setPublicConsent(
                    event.target
                      .checked
                  )
                }
                className="mt-0.5"
              />

              <span className="text-sm leading-5 text-black/70">
                I agree that The
                Claw Lab may feature
                my review/photo
                publicly.
              </span>
            </label>

            <button
              type="submit"
              disabled={
                submitting
              }
              className="w-full rounded-2xl bg-black px-5 py-3.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Submitting…"
                : "Submit Review"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}