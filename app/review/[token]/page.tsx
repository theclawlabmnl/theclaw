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
  access_token: string;
};

type ExistingReview = {
  id: string;
  rating: number;
  review_text: string;
  status: string;
  created_at: string;
};

export default function ReviewPage() {
  const searchParams = useSearchParams();

  const bookingId = searchParams.get(
    "booking_id"
  );

  const [booking, setBooking] =
    useState<Booking | null>(null);

  const [existingReview, setExistingReview] =
    useState<ExistingReview | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [submitted, setSubmitted] =
    useState(false);

  const [error, setError] =
    useState("");

  const [rating, setRating] =
    useState(0);

  const [hoverRating, setHoverRating] =
    useState(0);

  const [reviewText, setReviewText] =
    useState("");

  const [publicConsent, setPublicConsent] =
    useState(false);

  const [photo, setPhoto] =
    useState<File | null>(null);

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
          `/api/reviews?booking_id=${encodeURIComponent(
            validBookingId
          )}`
        );

        const data = await response
          .json()
          .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Unable to load review."
          );
        }

        setBooking(data.booking);

        if (data.already_reviewed) {
          setExistingReview(data.review);
        }
      } catch (loadError: any) {
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
    const file = event.target.files?.[0];

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
      const formData = new FormData();

      formData.append(
        "booking_id",
        bookingId
      );

      formData.append(
        "customer_name",
        booking?.customer_name || ""
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
        String(publicConsent)
      );

      if (photo) {
        formData.append(
          "nail_photo",
          photo
        );
      }

      const response = await fetch(
        "/api/reviews",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to submit review."
        );
      }

      setSubmitted(true);
    } catch (submitError: any) {
      setError(
        submitError?.message ||
          "Unable to submit review."
      );
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * LOADING
   */
  if (loading) {
    return (
      <main className="status-page">
        <div className="status-page-inner">
          <div className="status-card">

            <div className="status-brand">
              The Claw Lab MNL
            </div>

            <div className="status-header">
              <h1>
                Review
              </h1>
            </div>

            <div className="status-pill status-pill-pending">
              <span className="status-pill-dot" />
              Loading
            </div>

            <div className="status-message">
              <h2>
                Loading your review form…
              </h2>

              <p>
                Please wait a moment.
              </p>
            </div>

          </div>
        </div>
      </main>
    );
  }

  /*
   * ERROR
   */
  if (error && !booking) {
    return (
      <main className="status-page">
        <div className="status-page-inner">
          <div className="status-card">

            <div className="status-brand">
              The Claw Lab MNL
            </div>

            <div className="status-header">
              <h1>
                Review
              </h1>
            </div>

            <div className="status-pill status-pill-cancelled">
              <span className="status-pill-dot" />
              Unable to Continue
            </div>

            <div className="status-message">
              <h2>
                Oops ♡
              </h2>

              <p>
                {error}
              </p>
            </div>

            <div className="status-action">
              <a
                href="/status"
                className="status-primary-button"
              >
                Check Booking Status
              </a>
            </div>

            <div className="status-contact">
              <p>
                Need help? Message us.
              </p>

              <div className="status-contact-links">

                <a
                  href="https://instagram.com/theclawlabmnl"
                  target="_blank"
                  rel="noreferrer"
                >
                  Instagram
                </a>

                <a
                  href="https://m.me/theclawlabmnl"
                  target="_blank"
                  rel="noreferrer"
                >
                  Messenger
                </a>

              </div>
            </div>

          </div>
        </div>
      </main>
    );
  }

  /*
   * ALREADY REVIEWED / JUST SUBMITTED
   */
  if (
    existingReview ||
    submitted
  ) {
    return (
      <main className="status-page">
        <div className="status-page-inner">
          <div className="status-card">

            <div className="status-brand">
              The Claw Lab MNL
            </div>

            <div className="status-header">
              <h1>
                Review
              </h1>
            </div>

            <div className="status-pill status-pill-completed">
              <span className="status-pill-dot" />
              Thank You
            </div>

            <div className="status-message">
              <h2>
                Thank you! ♡
              </h2>

              <p>
                Your review has been submitted
                and is now awaiting approval.
                We truly appreciate you taking
                the time to share your experience
                with The Claw Lab MNL.
              </p>
            </div>

            {booking && (
              <section className="status-summary">

                <div className="status-summary-title">
                  Booking Summary
                </div>

                <div className="status-summary-grid">

                  <div className="status-summary-item">
                    <span>
                      Client
                    </span>

                    <strong>
                      {booking.customer_name || "—"}
                    </strong>
                  </div>

                  <div className="status-summary-item">
                    <span>
                      Reference
                    </span>

                    <strong>
                      {booking.reference_code || "—"}
                    </strong>
                  </div>

                </div>

              </section>
            )}

            <div className="status-action">

              <a
                href={
                  booking
                    ? `/status/${booking.access_token}`
                    : "/status"
                }
                className="status-primary-button"
              >
                Back to Booking Status
              </a>

            </div>

            <div className="status-contact">
              <p>
                Thank you for supporting
                The Claw Lab MNL. ♡
              </p>
            </div>

          </div>
        </div>
      </main>
    );
  }

  /*
   * REVIEW FORM
   */
  return (
    <main className="status-page">
      <div className="status-page-inner">

        <div className="status-card">

          {/* BRAND */}
          <div className="status-brand">
            The Claw Lab MNL
          </div>

          {/* HEADER */}
          <div className="status-header">
            <h1>
              Leave a Review
            </h1>
          </div>

          {/* STATUS */}
          <div className="status-pill status-pill-completed">
            <span className="status-pill-dot" />
            Appointment Completed
          </div>

          {/* MESSAGE */}
          <div className="status-message">

            <h2>
              Hi <strong>{booking?.customer_name}!</strong> How was your Claw Lab
              experience? ♡
            </h2>

          </div>

          {/* BOOKING SUMMARY */}
          {booking && (
            <section className="status-summary">

              <div className="status-summary-title">
                Booking Summary
              </div>

              <div className="status-summary-grid">

                <div className="status-summary-item">
                  <span>
                    Client
                  </span>

                  <strong>
                    {booking.customer_name || "—"}
                  </strong>
                </div>

                <div className="status-summary-item">
                  <span>
                    Reference
                  </span>

                  <strong>
                    {booking.reference_code || "—"}
                  </strong>
                </div>

              </div>

            </section>
          )}

          {/* FORM */}
          <form
            onSubmit={submit}
            style={{
              marginTop: "24px",
            }}
          >

            {/* ERROR */}
            {error && (
              <div
                style={{
                  marginBottom: "18px",
                  padding: "11px 13px",
                  borderRadius: "8px",
                  border:
                    "1px solid rgba(190, 50, 50, 0.35)",
                  background:
                    "rgba(190, 50, 50, 0.07)",
                  color: "#000",
                  fontSize: "12px",
                  lineHeight: 1.5,
                }}
              >
                {error}
              </div>
            )}

            {/* RATING */}
            <section
              style={{
                paddingBottom: "22px",
                borderBottom:
                  "1px solid var(--line)",
              }}
            >

              <div
                className="status-summary-title"
              >
                Your Rating
              </div>

              <p
                className="muted"
                style={{
                  marginTop: "5px",
                  marginBottom: "10px",
                  fontSize: "13px",
                }}
              >
                Tap the stars to rate your
                experience.
              </p>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                onMouseLeave={() =>
                  setHoverRating(0)
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
                        style={{
                          border: "none",
                          background:
                            "transparent",
                          padding:
                            "2px 3px",
                          margin: 0,
                          cursor:
                            "pointer",
                          fontSize:
                            "32px",
                          lineHeight: 1,
                          color: active
                            ? "#000"
                            : "rgba(0,0,0,0.15)",
                          transition:
                            "transform 0.15s ease",
                        }}
                      >
                        ★
                      </button>
                    );
                  }
                )}
              </div>

              {rating > 0 && (
                <p
                  className="muted"
                  style={{
                    marginTop: "7px",
                    fontSize: "12px",
                  }}
                >
                  {rating === 5
                    ? "We’re so glad you loved it! ♡"
                    : rating === 4
                    ? "Thank you for the lovely feedback. ♡"
                    : rating === 3
                    ? "Thank you for sharing your experience."
                    : rating === 2
                    ? "Thank you. We’d love to improve."
                    : "Thank you for being honest with us."}
                </p>
              )}

            </section>

            {/* REVIEW TEXT */}
            <section
              style={{
                padding:
                  "22px 0",
                borderBottom:
                  "1px solid var(--line)",
              }}
            >

              <div className="status-summary-title">
                Your Experience
              </div>

              <label
                htmlFor="review"
                style={{
                  display: "block",
                  marginTop: "6px",
                  marginBottom: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                Tell us about your
                experience
              </label>

              <textarea
                id="review"
                value={reviewText}
                onChange={(event) =>
                  setReviewText(
                    event.target.value
                  )
                }
                maxLength={2000}
                rows={6}
                placeholder="What did you love about your appointment?"
                style={{
                  display: "block",
                  width: "100%",
                  maxWidth: "100%",
                  minHeight: "140px",
                  boxSizing:
                    "border-box",
                  resize: "vertical",
                  border:
                    "1px solid var(--line)",
                  borderRadius: "8px",
                  padding:
                    "12px 13px",
                  background:
                    "#fff",
                  color: "#000",
                  fontSize:
                    "13px",
                  lineHeight:
                    1.55,
                  outline:
                    "none",
                }}
              />

              <p
                className="muted"
                style={{
                  marginTop: "5px",
                  textAlign: "right",
                  fontSize: "11px",
                }}
              >
                {reviewText.length}/2000
              </p>

            </section>

            {/* PHOTO */}
            <section
              style={{
                padding:
                  "22px 0",
                borderBottom:
                  "1px solid var(--line)",
              }}
            >

              <div className="status-summary-title">
                Nail Photo
              </div>

              <p
                className="muted"
                style={{
                  marginTop: "5px",
                  marginBottom: "10px",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                Have a photo of your nails?
                You can share it with us.
                <span
                  style={{
                    marginLeft: "5px",
                    opacity: 0.55,
                  }}
                >
                  Optional
                </span>
              </p>

              <label
                htmlFor="nail-photo"
                style={{
                  display: "block",
                  width: "100%",
                  boxSizing:
                    "border-box",
                  padding:
                    "12px 13px",
                  border:
                    "1px solid var(--line)",
                  borderRadius: "8px",
                  background:
                    "var(--soft)",
                  cursor:
                    "pointer",
                  fontSize: "13px",
                }}
              >
                Choose Photo
              </label>

              <input
                id="nail-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhoto}
                style={{
                  display: "none",
                }}
              />

              {photo && (
                <div
                  style={{
                    marginTop: "8px",
                    padding:
                      "9px 11px",
                    border:
                      "1px solid var(--line)",
                    borderRadius:
                      "7px",
                    fontSize: "11px",
                    color:
                      "rgba(0,0,0,0.6)",
                    overflow:
                      "hidden",
                    textOverflow:
                      "ellipsis",
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  {photo.name}
                </div>
              )}

            </section>

            {/* PUBLIC CONSENT */}
            <section
              style={{
                padding:
                  "22px 0",
              }}
            >

              <label
                style={{
                  display: "flex",
                  alignItems:
                    "flex-start",
                  gap: "10px",
                  padding:
                    "12px 13px",
                  border:
                    "1px solid var(--line)",
                  borderRadius: "8px",
                  background:
                    "var(--soft)",
                  cursor:
                    "pointer",
                }}
              >

                <input
                  type="checkbox"
                  checked={
                    publicConsent
                  }
                  onChange={(event) =>
                    setPublicConsent(
                      event.target.checked
                    )
                  }
                  style={{
                    marginTop:
                      "2px",
                    flexShrink: 0,
                  }}
                />

                <span
                  style={{
                    fontSize: "12px",
                    lineHeight: 1.5,
                  }}
                >
                  I agree that The Claw
                  Lab MNL may feature my
                  review and/or photo
                  publicly.
                </span>

              </label>

            </section>

            {/* SUBMIT */}
            <div className="status-action">

              <button
                type="submit"
                disabled={submitting}
                className="status-primary-button"
                style={{
                  width: "100%",
                  border: "none",
                  cursor: submitting
                    ? "not-allowed"
                    : "pointer",
                  opacity: submitting
                    ? 0.55
                    : 1,
                }}
              >
                {submitting
                  ? "Submitting…"
                  : "Submit Review ♡"}
              </button>

            </div>

          </form>

          {/* CONTACT */}
          <div className="status-contact">

            <p>
              Thank you for supporting
              The Claw Lab MNL. ♡
            </p>

            <div className="status-contact-links">

              <a
                href="https://instagram.com/theclawlabmnl"
                target="_blank"
                rel="noreferrer"
              >
                Instagram
              </a>

              <a
                href="https://m.me/theclawlabmnl"
                target="_blank"
                rel="noreferrer"
              >
                Messenger
              </a>

            </div>

          </div>

          {/* FOOTER */}
          <div className="status-footer">

            <a
              href={
                booking
                  ? `/status/${booking.access_token}`
                  : "/status"
              }
            >
              ← Back to Booking Status
            </a>

          </div>

        </div>

      </div>
    </main>
  );
}