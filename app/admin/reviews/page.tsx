"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type ReviewStatus =
  | "pending"
  | "approved"
  | "featured"
  | "hidden";

type Review = {
  id: string;
  booking_id: string;
  customer_name: string;
  rating: number;
  review_text: string;
  nail_photo_path:
    | string
    | null;
  public_consent: boolean;
  status: ReviewStatus;
  admin_note:
    | string
    | null;
  created_at: string;
  approved_at:
    | string
    | null;
  featured_at:
    | string
    | null;

  bookings:
    | {
        id: string;
        reference_code:
          | string
          | null;
        status: string;
        appointment_date:
          | string
          | null;
        appointment_time:
          | string
          | null;
      }
    | null;
};

const tabs = [
  {
    value: "pending",
    label: "Pending",
  },
  {
    value: "approved",
    label: "Approved",
  },
  {
    value: "featured",
    label: "Featured",
  },
  {
    value: "hidden",
    label: "Hidden",
  },
] as const;

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

function formatDate(
  value: string
) {
  try {
    return new Intl.DateTimeFormat(
      "en-PH",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    ).format(
      new Date(value)
    );
  } catch {
    return value;
  }
}

export default function AdminReviewsPage() {
  const [
    reviews,
    setReviews,
  ] = useState<Review[]>(
    []
  );

  const [
    activeTab,
    setActiveTab,
  ] = useState<
    ReviewStatus
  >("pending");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    actionLoading,
    setActionLoading,
  ] = useState<
    string | null
  >(null);

  const [
    error,
    setError,
  ] = useState("");

  const [
    notes,
    setNotes,
  ] = useState<
    Record<string, string>
  >({});

  async function loadReviews() {
    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/admin/reviews",
          {
            cache: "no-store",
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
            "Unable to load reviews."
        );
      }

      setReviews(
        data.reviews ||
          []
      );
    } catch (
      loadError: any
    ) {
      setError(
        loadError?.message ||
          "Unable to load reviews."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReviews();
  }, []);

  async function performAction(
    review: Review,
    action:
      | "approve"
      | "feature"
      | "hide"
      | "unfeature"
      | "delete"
  ) {
    if (
      action ===
        "delete" &&
      !window.confirm(
        "Permanently delete this review?"
      )
    ) {
      return;
    }

    if (
      action ===
        "feature" &&
      !review.public_consent
    ) {
      setError(
        "This customer did not provide public display consent."
      );

      return;
    }

    setActionLoading(
      review.id
    );

    setError("");

    try {
      const response =
        await fetch(
          "/api/admin/reviews",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              id: review.id,

              action,

              confirm:
                action ===
                "delete"
                  ? true
                  : undefined,

              admin_note:
                notes[
                  review.id
                ] ||
                "",
            }),
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
            "Unable to update review."
        );
      }

      await loadReviews();
    } catch (
      actionError: any
    ) {
      setError(
        actionError?.message ||
          "Unable to update review."
      );
    } finally {
      setActionLoading(
        null
      );
    }
  }

  const visibleReviews =
    useMemo(
      () =>
        reviews.filter(
          (review) =>
            review.status ===
            activeTab
        ),
      [
        reviews,
        activeTab,
      ]
    );

  const pendingCount =
    reviews.filter(
      (review) =>
        review.status ===
        "pending"
    ).length;

  return (
    <main className="min-h-screen bg-[#faf7f4] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-black/40">
            Admin
          </p>

          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl">
                Reviews
              </h1>

              <p className="mt-2 text-sm text-black/50">
                Moderate customer
                reviews before they
                appear publicly.
              </p>
            </div>

            {pendingCount >
              0 && (
              <div className="rounded-full bg-black px-4 py-2 text-xs font-medium text-white">
                {pendingCount}{" "}
                pending
              </div>
            )}
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {tabs.map(
            (tab) => {
              const count =
                reviews.filter(
                  (review) =>
                    review.status ===
                    tab.value
                ).length;

              return (
                <button
                  key={
                    tab.value
                  }
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      tab.value
                    )
                  }
                  className={`shrink-0 rounded-full px-4 py-2 text-sm ${
                    activeTab ===
                    tab.value
                      ? "bg-black text-white"
                      : "border border-black/10 bg-white"
                  }`}
                >
                  {tab.label}

                  <span className="ml-2 opacity-60">
                    {count}
                  </span>
                </button>
              );
            }
          )}
        </div>

        {loading ? (
          <div className="rounded-3xl border border-black/10 bg-white p-10 text-center text-sm text-black/50">
            Loading reviews…
          </div>
        ) : visibleReviews.length ===
          0 ? (
          <div className="rounded-3xl border border-black/10 bg-white p-10 text-center">
            <div className="text-3xl">
              ♡
            </div>

            <h2 className="mt-3 font-serif text-2xl">
              No{" "}
              {activeTab}{" "}
              reviews
            </h2>

            <p className="mt-2 text-sm text-black/50">
              You’re all caught up.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {visibleReviews.map(
              (review) => (
                <article
                  key={
                    review.id
                  }
                  className="rounded-3xl border border-black/10 bg-white p-5 sm:p-7"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="font-serif text-2xl">
                          {
                            review.customer_name
                          }
                        </h2>

                        <Stars
                          rating={
                            review.rating
                          }
                        />
                      </div>

                      <p className="mt-1 text-xs text-black/40">
                        Submitted{" "}
                        {formatDate(
                          review.created_at
                        )}
                      </p>

                      {review
                        .bookings
                        ?.reference_code && (
                        <p className="mt-2 text-xs uppercase tracking-[0.12em] text-black/40">
                          Booking{" "}
                          {
                            review
                              .bookings
                              .reference_code
                          }
                        </p>
                      )}
                    </div>

                    <div className="shrink-0">
                      <span className="rounded-full border border-black/10 px-3 py-1.5 text-xs capitalize">
                        {
                          review.status
                        }
                      </span>
                    </div>
                  </div>

                  <blockquote className="mt-6 rounded-2xl bg-[#faf7f4] p-5 text-sm leading-7 text-black/75">
                    “
                    {
                      review.review_text
                    }
                    ”
                  </blockquote>

                  <div className="mt-5 flex flex-wrap gap-3 text-xs text-black/50">
                    <span>
                      Public consent:{" "}
                      <strong className="font-medium text-black">
                        {review.public_consent
                          ? "Yes"
                          : "No"}
                      </strong>
                    </span>
                  </div>

                  <div className="mt-5">
                    <label
                      htmlFor={`note-${review.id}`}
                      className="block text-xs font-medium uppercase tracking-[0.12em] text-black/40"
                    >
                      Admin note
                    </label>

                    <textarea
                      id={`note-${review.id}`}
                      rows={2}
                      value={
                        notes[
                          review.id
                        ] ??
                        review.admin_note ??
                        ""
                      }
                      onChange={(
                        event
                      ) =>
                        setNotes(
                          (
                            current
                          ) => ({
                            ...current,

                            [review.id]:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                      placeholder="Internal note..."
                      className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black/30"
                    />
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {review.status ===
                      "pending" && (
                      <>
                        <button
                          type="button"
                          disabled={
                            actionLoading ===
                            review.id
                          }
                          onClick={() =>
                            performAction(
                              review,
                              "approve"
                            )
                          }
                          className="rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                        >
                          Approve
                        </button>

                        <button
                          type="button"
                          disabled={
                            actionLoading ===
                            review.id
                          }
                          onClick={() =>
                            performAction(
                              review,
                              "hide"
                            )
                          }
                          className="rounded-xl border border-black/10 px-4 py-2.5 text-sm disabled:opacity-50"
                        >
                          Hide
                        </button>
                      </>
                    )}

                    {review.status ===
                      "approved" && (
                      <>
                        {review.public_consent && (
                          <button
                            type="button"
                            disabled={
                              actionLoading ===
                              review.id
                            }
                            onClick={() =>
                              performAction(
                                review,
                                "feature"
                              )
                            }
                            className="rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                          >
                            Feature
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={
                            actionLoading ===
                            review.id
                          }
                          onClick={() =>
                            performAction(
                              review,
                              "hide"
                            )
                          }
                          className="rounded-xl border border-black/10 px-4 py-2.5 text-sm disabled:opacity-50"
                        >
                          Hide
                        </button>
                      </>
                    )}

                    {review.status ===
                      "featured" && (
                      <>
                        <button
                          type="button"
                          disabled={
                            actionLoading ===
                            review.id
                          }
                          onClick={() =>
                            performAction(
                              review,
                              "unfeature"
                            )
                          }
                          className="rounded-xl border border-black/10 px-4 py-2.5 text-sm disabled:opacity-50"
                        >
                          Remove from Homepage
                        </button>

                        <button
                          type="button"
                          disabled={
                            actionLoading ===
                            review.id
                          }
                          onClick={() =>
                            performAction(
                              review,
                              "hide"
                            )
                          }
                          className="rounded-xl border border-red-200 px-4 py-2.5 text-sm text-red-700 disabled:opacity-50"
                        >
                          Hide
                        </button>
                      </>
                    )}

                    {review.status ===
                      "hidden" && (
                      <button
                        type="button"
                        disabled={
                          actionLoading ===
                          review.id
                        }
                        onClick={() =>
                          performAction(
                            review,
                            "approve"
                          )
                        }
                        className="rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                      >
                        Restore & Approve
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={
                        actionLoading ===
                        review.id
                      }
                      onClick={() =>
                        performAction(
                          review,
                          "delete"
                        )
                      }
                      className="rounded-xl border border-red-200 px-4 py-2.5 text-sm text-red-700 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </div>
    </main>
  );
}