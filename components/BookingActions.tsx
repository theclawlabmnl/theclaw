"use client";

import { useState } from "react";

type BookingStatus =
  | "pending"
  | "approved"
  | "payment_submitted"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "rejected";

type Props = {
  id: string;
  status: BookingStatus;
  confirmationHref?: string | null;
  promoName?: string | null;
  discountAmount?: number | null;
  discountVerified?: boolean;
};

const statusLabels: Record<BookingStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  payment_submitted: "Payment Submitted",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

const cancellationReasons = [
  "Cancelled by client",
  "No-show",
  "Cancelled by Nailtech",
  "Other",
];

const resetStatuses: BookingStatus[] = [
  "approved",
  "payment_submitted",
  "confirmed",
  "completed",
  "cancelled",
  "rejected",
];

const adminOverrideStatuses: BookingStatus[] = [
  "pending",
  "approved",
  "payment_submitted",
  "confirmed",
  "completed",
  "cancelled",
  "rejected",
];

function peso(value: number) {
  return `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function BookingActions({
  id,
  status,
  confirmationHref = null,
  promoName = null,
  discountAmount = 0,
  discountVerified = false,
}: Props) {
  const [currentStatus, setCurrentStatus] =
    useState<BookingStatus>(status);

  const [currentDiscountVerified, setCurrentDiscountVerified] =
    useState(Boolean(discountVerified));

  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [overrideLoading, setOverrideLoading] = useState(false);

  const [moreOpen, setMoreOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelNote, setCancelNote] = useState("");

  const [resetOpen, setResetOpen] = useState(false);

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideStatus, setOverrideStatus] =
    useState<BookingStatus>(status);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const requestedDiscount = Number(discountAmount || 0);

  const normalizedPromoName =
    String(promoName || "").trim().toLowerCase();

  /*
   * A discount request is determined by the promo request itself,
   * not by discount_amount.
   *
   * This matters after a booking is reset to Pending. Older records
   * may have discount_amount = 0 after a previous rejection, but the
   * client still originally requested a discount and the admin must
   * be shown the Approve / Reject decision again.
   */
  const hasDiscountRequest =
    Boolean(normalizedPromoName) &&
    ![
      "not applicable",
      "none",
      "no discount",
    ].includes(normalizedPromoName);

  function clearMessages() {
    setError("");
    setMessage("");
  }

  async function updateStatus(
    action: string,
    extra: Record<string, unknown> = {}
  ) {
    setLoading(true);
    clearMessages();

    try {
      const response = await fetch(
        "/api/admin/bookings",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id,
            action,
            ...extra,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to update booking."
        );
      }

      const returnedStatus =
        data?.booking?.status || data?.status;

      if (
        returnedStatus &&
        returnedStatus in statusLabels
      ) {
        setCurrentStatus(
          returnedStatus as BookingStatus
        );
      }

      if (
        typeof data?.booking?.discount_verified ===
        "boolean"
      ) {
        setCurrentDiscountVerified(
          data.booking.discount_verified
        );
      }

      setMessage(
        data?.message || "Booking updated."
      );

      setApproveOpen(false);
      setMoreOpen(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(
    decision: "approve" | "reject" | "none"
  ) {
    await updateStatus("approve", {
      discount_decision: decision,
    });
  }

  async function handleCancel() {
    if (!cancelReason) {
      setError(
        "Please select a cancellation reason."
      );
      return;
    }

    await updateStatus("cancel", {
      cancellation_reason: cancelReason,
      cancellation_note:
        cancelNote.trim() || null,
      reason: cancelReason,
      other_reason:
        cancelReason === "Other"
          ? cancelNote.trim()
          : "",
    });

    setCancelOpen(false);
    setCancelReason("");
    setCancelNote("");
  }

  async function handleReset() {
    setResetLoading(true);
    clearMessages();

    try {
      const response = await fetch(
        "/api/admin/bookings",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id,
            action: "reset",
            status: "pending",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to reset booking."
        );
      }

      const returnedStatus =
        data?.booking?.status ||
        data?.status ||
        "pending";

      setCurrentStatus(
        returnedStatus as BookingStatus
      );

      if (
        typeof data?.booking?.discount_verified ===
        "boolean"
      ) {
        setCurrentDiscountVerified(
          data.booking.discount_verified
        );
      }

      /*
       * Resetting to Pending starts a fresh approval decision.
       * The original discount request stays visible, but the old
       * approval/rejection decision must not carry over.
       */
      if (returnedStatus === "pending") {
        setCurrentDiscountVerified(false);
        setApproveOpen(false);
      }

      setResetOpen(false);
      setMoreOpen(false);

      setMessage(
        data?.message ||
          "Booking reset to pending."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setResetLoading(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this booking?"
    );

    if (!confirmed) {
      return;
    }

    setDeleteLoading(true);
    clearMessages();

    try {
      const response = await fetch(
        "/api/admin/bookings",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id,
            action: "delete",
            confirm: true,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to delete booking."
        );
      }

      window.location.href =
        "/admin/bookings";
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleAdminOverride() {
    setOverrideLoading(true);
    clearMessages();

    try {
      const response = await fetch(
        "/api/admin/bookings",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id,
            action: "admin_override",
            status: overrideStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to override booking status."
        );
      }

      const returnedStatus =
        data?.booking?.status ||
        data?.status ||
        overrideStatus;

      setCurrentStatus(
        returnedStatus as BookingStatus
      );

      setOverrideOpen(false);
      setMoreOpen(false);

      setMessage(
        data?.message ||
          `Booking status changed to ${
            statusLabels[
              returnedStatus as BookingStatus
            ]
          }.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setOverrideLoading(false);
    }
  }

  const canApprove =
    currentStatus === "pending";

  const canComplete =
    currentStatus === "confirmed";

  const showComplete =
    ![
      "completed",
      "cancelled",
      "rejected",
    ].includes(currentStatus);

  const canReject =
    currentStatus === "pending" ||
    currentStatus === "approved";

  const canCancel = [
    "pending",
    "approved",
    "payment_submitted",
    "confirmed",
  ].includes(currentStatus);

  const canReset =
    resetStatuses.includes(currentStatus);

  const canOverride =
    adminOverrideStatuses.includes(
      currentStatus
    );

  return (
    <div className="booking-actions">
      <div className="current-status">
        <span className="status-label">
          Current Status
        </span>

        <strong>
          {statusLabels[currentStatus]}
        </strong>
      </div>

      {hasDiscountRequest && (
        <div className="discount-summary">
          <div>
            <span>
              Discount Request
            </span>

            <strong>
              {promoName}
            </strong>
          </div>

          <div>
            <span>
              Requested Amount
            </span>

            <strong>
              {peso(
                requestedDiscount
              )}
            </strong>
          </div>

          <div>
            <span>
              Current Decision
            </span>

            <strong>
              {currentDiscountVerified
                ? "Approved / Applied"
                : "Not Approved"}
            </strong>
          </div>
        </div>
      )}

      {message && (
        <div className="booking-message success">
          {message}
        </div>
      )}

      {error && (
        <div className="booking-message error">
          {error}
        </div>
      )}

      {/* EDIT BOOKING — same exact button system */}
      <a
        href={`/admin/bookings/${id}/edit`}
        className="action-button secondary-button"
      >
        Edit Booking
      </a>

      {/* APPROVE */}
      {canApprove && (
        <>
          {!hasDiscountRequest && (
            <button
              type="button"
              className="action-button primary-button"
              disabled={loading}
              onClick={() => {
                clearMessages();
                void handleApprove("none");
              }}
            >
              {loading
                ? "Approving..."
                : "Approve Booking"}
            </button>
          )}

          {hasDiscountRequest && (
            <div className="confirmation-box">
              <div className="section-title">
                Approve Booking
              </div>

              <p>
                The client requested{" "}
                <strong>
                  {promoName}
                </strong>{" "}
                for{" "}
                <strong>
                  {peso(
                    requestedDiscount
                  )}
                </strong>
                . Choose whether the discount
                should be applied.
              </p>

              <div className="form-actions">
                <button
                  type="button"
                  className="action-button primary-button"
                  disabled={loading}
                  onClick={() =>
                    void handleApprove(
                      "approve"
                    )
                  }
                >
                  {loading
                    ? "Approving..."
                    : "Approve & Apply Discount"}
                </button>

                <button
                  type="button"
                  className="action-button secondary-button"
                  disabled={loading}
                  onClick={() =>
                    void handleApprove(
                      "reject"
                    )
                  }
                >
                  {loading
                    ? "Approving..."
                    : "Approve Booking but Reject Discount"}
                </button>

              </div>
            </div>
          )}
        </>
      )}

      {showComplete && (
        <button
          type="button"
          className="action-button primary-button"
          disabled={
            loading ||
            !canComplete
          }
          title={
            canComplete
              ? "Mark this confirmed booking as complete."
              : "The booking must be confirmed before it can be completed."
          }
          onClick={() =>
            updateStatus("complete")
          }
        >
          {loading
            ? "Completing..."
            : canComplete
              ? "Mark as Complete"
              : "Mark as Complete — Confirm First"}
        </button>
      )}

      {currentStatus === "confirmed" &&
        confirmationHref && (
          <a
            href={confirmationHref}
            className="action-button confirmation-button"
          >
            View Confirmation
          </a>
        )}

      {cancelOpen && (
        <div className="cancel-box">
          <div className="section-title">
            Cancel Booking
          </div>

          <select
            value={cancelReason}
            onChange={(event) =>
              setCancelReason(
                event.target.value
              )
            }
            disabled={loading}
          >
            <option value="">
              Select cancellation reason
            </option>

            {cancellationReasons.map(
              (reason) => (
                <option
                  key={reason}
                  value={reason}
                >
                  {reason}
                </option>
              )
            )}
          </select>

          <textarea
            value={cancelNote}
            onChange={(event) =>
              setCancelNote(
                event.target.value
              )
            }
            placeholder={
              cancelReason === "Other"
                ? "Enter cancellation reason"
                : "Optional note"
            }
            rows={3}
            disabled={loading}
          />

          <div className="form-actions">
            <button
              type="button"
              className="action-button danger-button"
              disabled={loading}
              onClick={handleCancel}
            >
              {loading
                ? "Cancelling..."
                : "Confirm Cancellation"}
            </button>

            <button
              type="button"
              className="action-button secondary-button"
              disabled={loading}
              onClick={() => {
                setCancelOpen(false);
                setCancelReason("");
                setCancelNote("");
                clearMessages();
              }}
            >
              Keep Booking
            </button>
          </div>
        </div>
      )}

      <div className="more-actions">
        <button
          type="button"
          className="more-button"
          onClick={() => {
            setMoreOpen(
              (previous) => !previous
            );
            clearMessages();
          }}
        >
          <span>
            {moreOpen
              ? "Hide More Actions"
              : "More Actions"}
          </span>

          <span>
            {moreOpen ? "↑" : "↓"}
          </span>
        </button>

        {moreOpen && (
          <div className="more-panel">
            {canReject && (
              <button
                type="button"
                className="action-button secondary-button"
                disabled={loading}
                onClick={() =>
                  updateStatus("reject")
                }
              >
                {loading
                  ? "Rejecting..."
                  : "Reject Booking"}
              </button>
            )}

            {canCancel &&
              !cancelOpen && (
                <button
                  type="button"
                  className="action-button cancel-button"
                  disabled={loading}
                  onClick={() => {
                    setCancelOpen(true);
                    clearMessages();
                  }}
                >
                  Cancel Booking
                </button>
              )}

            {canReset && (
              <div className="action-section">
                {!resetOpen ? (
                  <button
                    type="button"
                    className="action-button secondary-button"
                    disabled={resetLoading}
                    onClick={() => {
                      setResetOpen(true);
                      setOverrideOpen(false);
                      clearMessages();
                    }}
                  >
                    Reset to Pending
                  </button>
                ) : (
                  <div className="confirmation-box">
                    <p>
                      Reset this booking back
                      to Pending?
                    </p>

                    <div className="form-actions">
                      <button
                        type="button"
                        className="action-button secondary-button"
                        disabled={resetLoading}
                        onClick={() =>
                          setResetOpen(false)
                        }
                      >
                        Keep Status
                      </button>

                      <button
                        type="button"
                        className="action-button danger-button"
                        disabled={resetLoading}
                        onClick={handleReset}
                      >
                        {resetLoading
                          ? "Resetting..."
                          : "Confirm Reset"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {canOverride && (
              <div className="action-section">
                {!overrideOpen ? (
                  <button
                    type="button"
                    className="action-button secondary-button"
                    disabled={overrideLoading}
                    onClick={() => {
                      setOverrideStatus(
                        currentStatus
                      );
                      setResetOpen(false);
                      setOverrideOpen(true);
                      clearMessages();
                    }}
                  >
                    Admin Override
                  </button>
                ) : (
                  <div className="override-box">
                    <div className="section-title">
                      Change Status
                    </div>

                    <select
                      value={overrideStatus}
                      onChange={(event) =>
                        setOverrideStatus(
                          event.target
                            .value as BookingStatus
                        )
                      }
                      disabled={overrideLoading}
                    >
                      {adminOverrideStatuses.map(
                        (value) => (
                          <option
                            key={value}
                            value={value}
                          >
                            {
                              statusLabels[
                                value
                              ]
                            }
                          </option>
                        )
                      )}
                    </select>

                    <div className="form-actions">
                      <button
                        type="button"
                        className="action-button secondary-button"
                        disabled={overrideLoading}
                        onClick={() =>
                          setOverrideOpen(false)
                        }
                      >
                        Keep Status
                      </button>

                      <button
                        type="button"
                        className="action-button primary-button"
                        disabled={overrideLoading}
                        onClick={
                          handleAdminOverride
                        }
                      >
                        {overrideLoading
                          ? "Updating..."
                          : "Apply Override"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="delete-zone">
              <button
                type="button"
                className="action-button delete-button"
                disabled={deleteLoading}
                onClick={handleDelete}
              >
                {deleteLoading
                  ? "Deleting..."
                  : "Delete Booking"}
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .booking-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          min-width: 0;
        }

        .current-status {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 4px;
        }

        .status-label,
        .discount-summary span {
          color: #777;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .current-status strong {
          font-size: 15px;
        }

        .discount-summary {
          display: grid;
          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );
          gap: 10px;
          padding: 12px;
          border-radius: 10px;
          background: #f7f6f5;
        }

        .discount-summary > div {
          min-width: 0;
        }

        .discount-summary span {
          display: block;
          margin-bottom: 4px;
        }

        .discount-summary strong {
          display: block;
          font-size: 13px;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .action-button,
        .more-button {
          width: 100%;
          min-height: 42px;
          box-sizing: border-box;
          border-radius: 8px;
          padding: 10px 14px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 600;
          line-height: 1.2;
          cursor: pointer;
          text-align: center;
          text-decoration: none;
        }

        .action-button {
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
        }

        .action-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .primary-button {
          background: #111;
          color: #fff;
          border: 1px solid #111;
        }

        .secondary-button {
          background: #f3f3f3;
          color: #111;
          border: 1px solid #f3f3f3;
        }

        .outline-button,
        .more-button {
          background: #fff;
          color: #555;
          border: 1px solid #ddd;
        }

        .confirmation-button {
          background: #f3d6dc;
          color: #111;
          border: 1px solid #e7c2ca;
        }

        .cancel-button,
        .delete-button {
          background: #fff;
          color: #b42318;
          border: 1px solid #f0b8b3;
        }

        .danger-button {
          background: #b42318;
          color: #fff;
          border: 1px solid #b42318;
        }

        .more-actions {
          margin-top: 4px;
          width: 100%;
        }

        .more-button {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .more-panel {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 8px;
          padding: 10px;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          background: #fafafa;
        }

        .cancel-box,
        .override-box,
        .confirmation-box {
          display: flex;
          flex-direction: column;
          gap: 9px;
          padding: 11px;
          border-radius: 8px;
          background: #f7f7f7;
        }

        .confirmation-box p {
          margin: 0;
          color: #444;
          font-size: 13px;
          line-height: 1.5;
        }

        .section-title {
          font-size: 14px;
          font-weight: 700;
        }

        .cancel-box select,
        .cancel-box textarea,
        .override-box select {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 10px;
          background: #fff;
          font: inherit;
        }

        .cancel-box textarea {
          resize: vertical;
        }

        .form-actions,
        .action-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
        }

        .delete-zone {
          margin-top: 6px;
          padding-top: 12px;
          border-top: 1px solid #e5e5e5;
        }

        .booking-message {
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 13px;
          line-height: 1.45;
        }

        .booking-message.success {
          background: #edf8f0;
          color: #176b2c;
        }

        .booking-message.error {
          background: #fff0ef;
          color: #a61b13;
        }

        @media (max-width: 600px) {
          .discount-summary {
            grid-template-columns: 1fr;
          }

          .cancel-box select,
          .cancel-box textarea,
          .override-box select {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
}
