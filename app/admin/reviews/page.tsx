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
  public_consent: boolean;
  status: ReviewStatus;
  created_at: string;
  bookings:
    | {
        id: string;
        reference_code:
          | string
          | null;
        status: string;
        preferred_date:
          | string
          | null;
        preferred_time:
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

function Stars({ rating }: { rating: number }) {
  return (
    <div
      className="review-stars"
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`review-star ${
            star <= rating ? "is-filled" : ""
          }`}
        >
          ★
        </span>
      ))}
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

  async function loadReviews() {
    setLoading(true);

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

      if (!response.ok) {
        setReviews([]);
        return;
      }

      setReviews(
        Array.isArray(data?.reviews)
          ? data.reviews
          : []
      );
    } catch {
      setReviews([]);
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
      return;
    }

    setActionLoading(
      review.id
    );

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

            }),
          }
        );

      const data =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (!response.ok) {
        return;
      }

      await loadReviews();
    } catch {
      return;
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
    <div className="admin-page reviews-admin-page">
      <header className="reviews-page-head">
        <div>
          <div className="kicker">CUSTOMER FEEDBACK</div>
          <h1 className="serif">Reviews</h1>
          <p className="muted reviews-lead">
            Moderate customer reviews before they appear publicly.
          </p>
        </div>

        {pendingCount > 0 && (
          <div className="reviews-pending-badge">
            {pendingCount} pending
          </div>
        )}
      </header>

      <div className="reviews-tabs">
        {tabs.map((tab) => {
          const count = reviews.filter(
            (review) => review.status === tab.value
          ).length;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`reviews-tab ${
                activeTab === tab.value ? "is-active" : ""
              }`}
            >
              {tab.label}
              <span>{count}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="card reviews-empty">Loading reviews…</div>
      ) : visibleReviews.length === 0 ? (
        <div className="card reviews-empty">
          <div className="reviews-caught-up-icon">✓</div>
          <h2 className="serif reviews-caught-up-title">
            You’re all caught up
          </h2>
          <p className="muted reviews-caught-up-copy">
            No {activeTab.toLowerCase()} reviews right now.
          </p>
        </div>
      ) : (
        <div className="reviews-list">
          {visibleReviews.map((review) => (
            <article key={review.id} className="card review-card">
              <div className="review-card-head">
                <div className="review-card-person">
                  <div className="review-name-row">
                    <h2 className="serif">{review.customer_name}</h2>
                    <Stars rating={review.rating} />
                  </div>

                  <p className="muted review-submitted">
                    Submitted {formatDate(review.created_at)}
                  </p>

                  {review.bookings?.reference_code && (
                    <p className="review-reference">
                      Booking {review.bookings.reference_code}
                    </p>
                  )}
                </div>

                <span className={`review-status status-${review.status}`}>
                  {review.status}
                </span>
              </div>

              <div className="review-copy">
                “{review.review_text}”
              </div>

              <div className="review-meta">
                <span>
                  Public consent:{" "}
                  <strong>
                    {review.public_consent ? "Yes" : "No"}
                  </strong>
                </span>
              </div>

              <div className="review-actions">
                {review.status === "pending" && (
                  <>
                    <button
                      type="button"
                      className="btn primary"
                      disabled={actionLoading === review.id}
                      onClick={() => performAction(review, "approve")}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="btn secondary"
                      disabled={actionLoading === review.id}
                      onClick={() => performAction(review, "hide")}
                    >
                      Hide
                    </button>
                  </>
                )}

                {review.status === "approved" && (
                  <>
                    {review.public_consent && (
                      <button
                        type="button"
                        className="btn primary"
                        disabled={actionLoading === review.id}
                        onClick={() => performAction(review, "feature")}
                      >
                        Feature
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn secondary"
                      disabled={actionLoading === review.id}
                      onClick={() => performAction(review, "hide")}
                    >
                      Hide
                    </button>
                  </>
                )}

                {review.status === "featured" && (
                  <>
                    <button
                      type="button"
                      className="btn secondary"
                      disabled={actionLoading === review.id}
                      onClick={() => performAction(review, "unfeature")}
                    >
                      Remove from Homepage
                    </button>
                    <button
                      type="button"
                      className="btn danger"
                      disabled={actionLoading === review.id}
                      onClick={() => performAction(review, "hide")}
                    >
                      Hide
                    </button>
                  </>
                )}

                {review.status === "hidden" && (
                  <button
                    type="button"
                    className="btn primary"
                    disabled={actionLoading === review.id}
                    onClick={() => performAction(review, "approve")}
                  >
                    Restore & Approve
                  </button>
                )}

                <button
                  type="button"
                  className="btn danger"
                  disabled={actionLoading === review.id}
                  onClick={() => performAction(review, "delete")}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <style>{`
        .reviews-page-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
        }
        .reviews-page-head h1 { margin: 4px 0 0; }
        .reviews-lead { margin: 7px 0 0; max-width: 620px; }
        .reviews-pending-badge {
          flex: 0 0 auto;
          padding: 8px 13px;
          border-radius: 999px;
          background: #111;
          color: #fff;
          font-size: 11px;
          font-weight: 700;
        }
        .reviews-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          overflow-x: auto;
          padding-bottom: 2px;
        }
        .reviews-tab {
          flex: 0 0 auto;
          border: 1px solid #ded8d3;
          border-radius: 9px;
          background: #fff;
          padding: 9px 12px;
          font-size: 12px;
          cursor: pointer;
        }
        .reviews-tab span { margin-left: 7px; opacity: .55; }
        .reviews-tab.is-active {
          border-color: #111;
          background: #111;
          color: #fff;
        }
        .reviews-empty {
          min-height: 220px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 32px 20px;
        }

        .reviews-caught-up-icon {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          margin-bottom: 12px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 50%;
          font-size: 18px;
          line-height: 1;
        }

        .reviews-caught-up-title {
          margin: 0;
          font-size: 22px;
        }

        .reviews-caught-up-copy {
          margin: 6px 0 0;
          font-size: 13px;
        }

        .reviews-list { display: grid; gap: 12px; }
        .review-card { padding: 20px; border-radius: 12px; }
        .review-card-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }
        .review-name-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        .review-name-row h2 { margin: 0; font-size: 20px; }
        .review-stars { display: flex; gap: 2px; font-size: 13px; }
        .review-star { opacity: .15; }
        .review-star.is-filled { opacity: 1; }
        .review-submitted { margin: 5px 0 0; font-size: 11px; }
        .review-reference {
          margin: 7px 0 0;
          color: #8a8581;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
        }
        .review-status {
          flex: 0 0 auto;
          border-radius: 999px;
          padding: 5px 9px;
          background: #f0efed;
          font-size: 10px;
          font-weight: 700;
          text-transform: capitalize;
        }
        .status-featured { background: #f5eadf; }
        .status-approved { background: #eaf2ec; }
        .status-hidden { background: #eee; color: #777; }
        .review-copy {
          margin-top: 16px;
          padding: 14px 16px;
          border-radius: 10px;
          background: #faf7f4;
          color: #4f4b48;
          font-size: 13px;
          line-height: 1.55;
        }
        .review-meta {
          margin-top: 12px;
          color: #777;
          font-size: 11px;
        }
        .review-meta strong { color: #222; font-weight: 700; }
        .review-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
        }
        .review-actions .btn {
          min-height: 36px;
          padding: 8px 12px;
          font-size: 11px;
        }
        .review-actions .danger {
          border: 1px solid #e5baba;
          background: #fff;
          color: #a33636;
        }
        .reviews-empty {
          padding: 44px 20px;
          text-align: center;
        }
        .reviews-empty-icon { font-size: 28px; }
        .reviews-empty h2 { margin: 8px 0 0; font-size: 21px; }
        .reviews-empty p { margin: 6px 0 0; }

        @media (max-width: 700px) {
          .reviews-page-head {
            flex-direction: column;
            gap: 12px;
          }
          .reviews-pending-badge { align-self: flex-start; }
          .review-card { padding: 15px; }
          .review-card-head { gap: 10px; }
          .review-name-row h2 { font-size: 18px; }
          .review-copy { padding: 12px; font-size: 12px; }
          .review-actions {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .review-actions .btn { width: 100%; }
        }
      `}</style>
    </div>
  );
}