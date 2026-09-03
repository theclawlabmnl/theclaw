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
  {
    value: "cancelled_by_client",
    label: "Cancelled by client",
  },
  {
    value: "no_show",
    label: "No-show",
  },
  {
    value: "cancelled_by_nailtech",
    label: "Cancelled by Nailtech",
  },
  {
    value: "other",
    label: "Other",
  },
];

const resetStatuses: BookingStatus[] = [
  "pending",
  "approved",
  "payment_submitted",
  "confirmed",
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

export default function BookingActions({ id, status }: Props) {
  const [currentStatus, setCurrentStatus] =
    useState<BookingStatus>(status);

  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [overrideLoading, setOverrideLoading] = useState(false);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelNote, setCancelNote] = useState("");

  const [resetOpen, setResetOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideStatus, setOverrideStatus] =
    useState<BookingStatus>("pending");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const getActionForStatus = (
    bookingStatus: BookingStatus
  ): string | null => {
    switch (bookingStatus) {
      case "approved":
        return "approve";
      case "rejected":
        return "reject";
      case "cancelled":
        return "cancel";
      case "confirmed":
        return "verify_payment";
      case "completed":
        return "complete";
      default:
        return null;
    }
  };

  const updateStatus = async (
    action: string,
    extra: Record<string, unknown> = {}
  ) => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          action,
          ...extra,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to update booking."
        );
      }

      if (data?.booking?.status) {
        setCurrentStatus(data.booking.status);
      } else if (action === "approve") {
        setCurrentStatus("approved");
      } else if (action === "reject") {
        setCurrentStatus("rejected");
      } else if (action === "complete") {
        setCurrentStatus("completed");
      } else if (action === "verify_payment") {
        setCurrentStatus("confirmed");
      }

      setMessage(data?.message || "Booking updated.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason) {
      setError("Please select a cancellation reason.");
      return;
    }

    await updateStatus("cancel", {
      cancellation_reason: cancelReason,
      cancellation_note: cancelNote.trim() || null,
    });

    setCancelOpen(false);
    setCancelReason("");
    setCancelNote("");
  };

  const handleReset = async () => {
    setResetLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          action: "reset",
          status: "pending",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to reset booking."
        );
      }

      setCurrentStatus("pending");
      setResetOpen(false);
      setMessage("Booking reset to pending.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setResetLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this booking?"
    );

    if (!confirmed) return;

    setDeleteLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          action: "delete",
          confirm: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to delete booking."
        );
      }

      window.location.href = "/admin/bookings";
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAdminOverride = async () => {
    setOverrideLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          action: "admin_override",
          status: overrideStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to override booking status."
        );
      }

      setCurrentStatus(overrideStatus);
      setOverrideOpen(false);
      setMessage(
        `Booking status changed to ${statusLabels[overrideStatus]}.`
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
  };

  const canApprove = currentStatus === "pending";
  const canReject =
    currentStatus === "pending" ||
    currentStatus === "approved";
  const canConfirm = currentStatus === "payment_submitted";
  const canComplete = currentStatus === "confirmed";
  const canReset = resetStatuses.includes(currentStatus);

  return (
    <div className="booking-actions">
      <div className="current-status">
        <span className="status-label">Current status</span>
        <strong>{statusLabels[currentStatus]}</strong>
      </div>

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

      {/* APPROVE */}
      {canApprove && (
        <button
          type="button"
          className="action-button approve-button"
          disabled={loading}
          onClick={() => updateStatus("approve")}
        >
          {loading ? "Approving..." : "Approve booking"}
        </button>
      )}

      {/* CONFIRM PAYMENT */}
      {canConfirm && (
        <button
          type="button"
          className="action-button confirm-button"
          disabled={loading}
          onClick={() => updateStatus("verify_payment")}
        >
          {loading ? "Confirming..." : "Confirm payment"}
        </button>
      )}

      {/* COMPLETE */}
      {canComplete && (
        <button
          type="button"
          className="action-button complete-button"
          disabled={loading}
          onClick={() => updateStatus("complete")}
        >
          {loading ? "Completing..." : "Mark completed"}
        </button>
      )}

      {/* CONFIRMED BOOKING ACTIONS */}
      {currentStatus === "confirmed" && (
        <div className="confirmed-actions">
          <div className="confirmation-spacing" />

          {/* Cancel is intentionally underneath the confirmation area */}
          {!cancelOpen ? (
            <button
              type="button"
              className="action-button cancel-button"
              disabled={loading}
              onClick={() => {
                setCancelOpen(true);
                setError("");
                setMessage("");
              }}
            >
              Cancel booking
            </button>
          ) : (
            <div className="booking-cancel-box">
              <div className="cancel-title">
                Cancel booking
              </div>

              <select
                value={cancelReason}
                onChange={(e) =>
                  setCancelReason(e.target.value)
                }
                disabled={loading}
              >
                <option value="">
                  Select cancellation reason
                </option>

                {cancellationReasons.map((reason) => (
                  <option
                    key={reason.value}
                    value={reason.value}
                  >
                    {reason.label}
                  </option>
                ))}
              </select>

              <textarea
                value={cancelNote}
                onChange={(e) =>
                  setCancelNote(e.target.value)
                }
                placeholder="Optional note"
                rows={3}
                disabled={loading}
              />

              <div className="cancel-actions">
                <button
                  type="button"
                  className="action-button danger-button"
                  disabled={loading}
                  onClick={handleCancel}
                >
                  {loading
                    ? "Cancelling..."
                    : "Confirm cancellation"}
                </button>

                <button
                  type="button"
                  className="action-button secondary-button"
                  disabled={loading}
                  onClick={() => {
                    setCancelOpen(false);
                    setCancelReason("");
                    setCancelNote("");
                    setError("");
                  }}
                >
                  Keep booking
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* REJECT */}
      {canReject && (
        <button
          type="button"
          className="action-button reject-button"
          disabled={loading}
          onClick={() => updateStatus("reject")}
        >
          {loading ? "Rejecting..." : "Reject booking"}
        </button>
      )}

      {/* CANCELLATION FOR OTHER RESETTABLE STATUSES */}
      {currentStatus !== "confirmed" &&
        resetStatuses.includes(currentStatus) && (
          <div className="booking-cancel-box">
            {!cancelOpen ? (
              <button
                type="button"
                className="action-button cancel-button"
                disabled={loading}
                onClick={() => {
                  setCancelOpen(true);
                  setError("");
                  setMessage("");
                }}
              >
                Cancel booking
              </button>
            ) : (
              <>
                <div className="cancel-title">
                  Cancel booking
                </div>

                <select
                  value={cancelReason}
                  onChange={(e) =>
                    setCancelReason(e.target.value)
                  }
                  disabled={loading}
                >
                  <option value="">
                    Select cancellation reason
                  </option>

                  {cancellationReasons.map((reason) => (
                    <option
                      key={reason.value}
                      value={reason.value}
                    >
                      {reason.label}
                    </option>
                  ))}
                </select>

                <textarea
                  value={cancelNote}
                  onChange={(e) =>
                    setCancelNote(e.target.value)
                  }
                  placeholder="Optional note"
                  rows={3}
                  disabled={loading}
                />

                <div className="cancel-actions">
                  <button
                    type="button"
                    className="action-button danger-button"
                    disabled={loading}
                    onClick={handleCancel}
                  >
                    {loading
                      ? "Cancelling..."
                      : "Confirm cancellation"}
                  </button>

                  <button
                    type="button"
                    className="action-button secondary-button"
                    disabled={loading}
                    onClick={() => {
                      setCancelOpen(false);
                      setCancelReason("");
                      setCancelNote("");
                      setError("");
                    }}
                  >
                    Keep booking
                  </button>
                </div>
              </>
            )}
          </div>
        )}

      {/* RESET */}
      {canReset && (
        <div className="booking-reset-box">
          {!resetOpen ? (
            <button
              type="button"
              className="action-button secondary-button"
              onClick={() => {
                setResetOpen(true);
                setError("");
                setMessage("");
              }}
            >
              Reset booking
            </button>
          ) : (
            <div className="reset-confirmation">
              <p>
                Reset this booking back to Pending?
              </p>

              <div className="reset-actions">
                <button
                  type="button"
                  className="action-button secondary-button"
                  disabled={resetLoading}
                  onClick={() => setResetOpen(false)}
                >
                  Keep status
                </button>

                <button
                  type="button"
                  className="action-button danger-button"
                  disabled={resetLoading}
                  onClick={handleReset}
                >
                  {resetLoading
                    ? "Resetting..."
                    : "Confirm reset"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADMIN OVERRIDE */}
      {adminOverrideStatuses.includes(currentStatus) && (
        <div className="admin-override-box">
          {!overrideOpen ? (
            <button
              type="button"
              className="action-button secondary-button"
              onClick={() => {
                setOverrideOpen(true);
                setError("");
                setMessage("");
              }}
            >
              Admin override
            </button>
          ) : (
            <div className="override-form">
              <select
                value={overrideStatus}
                onChange={(e) =>
                  setOverrideStatus(
                    e.target.value as BookingStatus
                  )
                }
                disabled={overrideLoading}
              >
                {adminOverrideStatuses.map((value) => (
                  <option key={value} value={value}>
                    {statusLabels[value]}
                  </option>
                ))}
              </select>

              <div className="override-actions">
                <button
                  type="button"
                  className="action-button secondary-button"
                  disabled={overrideLoading}
                  onClick={() => setOverrideOpen(false)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="action-button approve-button"
                  disabled={overrideLoading}
                  onClick={handleAdminOverride}
                >
                  {overrideLoading
                    ? "Updating..."
                    : "Apply override"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DELETE */}
      <div className="delete-zone">
        <button
          type="button"
          className="action-button delete-button"
          disabled={deleteLoading}
          onClick={handleDelete}
        >
          {deleteLoading
            ? "Deleting..."
            : "Delete booking"}
        </button>
      </div>

      <style jsx>{`
        .booking-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .current-status {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 4px;
        }

        .status-label {
          font-size: 12px;
          color: #777;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .current-status strong {
          font-size: 15px;
        }

        .action-button {
          width: 100%;
          border: 0;
          border-radius: 8px;
          padding: 11px 14px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .action-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .approve-button {
          background: #111;
          color: #fff;
        }

        .confirm-button {
          background: #111;
          color: #fff;
        }

        .complete-button {
          background: #111;
          color: #fff;
        }

        .reject-button {
          background: #f3f3f3;
          color: #111;
        }

        .cancel-button {
          background: #fff;
          color: #b42318;
          border: 1px solid #f0b8b3;
        }

        .danger-button {
          background: #b42318;
          color: #fff;
        }

        .secondary-button {
          background: #f3f3f3;
          color: #111;
        }

        .delete-button {
          background: #fff;
          color: #b42318;
          border: 1px solid #e3a6a1;
        }

        /*
         * Confirmed booking:
         *
         * The confirmation action is above this section.
         * This creates a clear visual gap before Cancel booking.
         */
        .confirmed-actions {
          display: flex;
          flex-direction: column;
          gap: 0;
          margin-top: 4px;
        }

        .confirmation-spacing {
          height: 8px;
        }

        .booking-cancel-box {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 12px;
          padding-top: 4px;
        }

        .booking-cancel-box select,
        .booking-cancel-box textarea,
        .override-form select {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 10px;
          font: inherit;
          background: #fff;
        }

        .cancel-title {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 2px;
        }

        .cancel-actions,
        .reset-actions,
        .override-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .booking-reset-box {
          margin-top: 4px;
        }

        .reset-confirmation {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 10px;
          border-radius: 8px;
          background: #f7f7f7;
        }

        .reset-confirmation p {
          margin: 0;
          font-size: 13px;
        }

        .admin-override-box {
          margin-top: 4px;
        }

        .override-form {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .delete-zone {
          margin-top: 18px;
          padding-top: 18px;
          border-top: 1px solid #e5e5e5;
        }

        .booking-message {
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 13px;
        }

        .booking-message.success {
          background: #edf8f0;
          color: #176b2c;
        }

        .booking-message.error {
          background: #fff0ef;
          color: #a61b13;
        }
      `}</style>
    </div>
  );
}