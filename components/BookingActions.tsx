"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BookingStatus =
  | "pending"
  | "approved"
  | "payment_submitted"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "rejected";

const statusLabels: Record<BookingStatus, string> = {
  pending: "Pending",
  approved: "Approved · Payment Required",
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
    label: "Cancelled by nail tech",
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

export default function BookingActions({
  id,
  status,
}: {
  id: string;
  status: BookingStatus;
}) {
  const router = useRouter();

  const [currentStatus, setCurrentStatus] =
    useState<BookingStatus>(status);

  const [loading, setLoading] = useState(false);
  const [overrideLoading, setOverrideLoading] =
    useState(false);
  const [resetLoading, setResetLoading] =
    useState(false);
  const [deleteLoading, setDeleteLoading] =
    useState(false);

  const [cancellationReason, setCancellationReason] =
    useState("cancelled_by_client");

  const [cancellationNote, setCancellationNote] =
    useState("");

  const [overrideOpen, setOverrideOpen] =
    useState(false);

  const [overrideStatus, setOverrideStatus] =
    useState<BookingStatus>(status);

  const [resetOpen, setResetOpen] =
    useState(false);

  const [resetStatus, setResetStatus] =
    useState<BookingStatus>("pending");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function getActionForStatus(
    nextStatus: BookingStatus
  ): string | null {
    switch (nextStatus) {
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
  }

  async function updateStatus(
    nextStatus: BookingStatus,
    extra: Record<string, unknown> = {}
  ) {
    if (
      loading ||
      resetLoading ||
      deleteLoading ||
      overrideLoading
    ) {
      return;
    }

    const action = getActionForStatus(nextStatus);

    if (!action) {
      setError(
        `Unable to change booking to ${statusLabels[nextStatus]}.`
      );
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

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
          data?.error ||
            "Unable to update booking status."
        );
      }

      setCurrentStatus(nextStatus);

      setMessage(
        `Booking marked as ${statusLabels[nextStatus]}.`
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update booking status."
      );
    } finally {
      setLoading(false);
    }
  }

  async function resetBooking() {
    if (
      resetLoading ||
      deleteLoading ||
      loading ||
      overrideLoading
    ) {
      return;
    }

    if (resetStatus === currentStatus) {
      setError(
        "Please select a different status."
      );
      return;
    }

    const confirmed = window.confirm(
      `RESET BOOKING\n\nYou are about to reset this booking to:\n\n${statusLabels[resetStatus]}\n\nThis will change the booking status and clear cancellation state.\n\nContinue?`
    );

    if (!confirmed) {
      return;
    }

    setResetLoading(true);
    setMessage("");
    setError("");

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
            status: resetStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to reset booking."
        );
      }

      setCurrentStatus(resetStatus);
      setResetOpen(false);
      setOverrideStatus(resetStatus);

      setMessage(
        `Booking reset to ${statusLabels[resetStatus]}.`
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to reset booking."
      );
    } finally {
      setResetLoading(false);
    }
  }

  async function deleteBooking() {
    if (
      deleteLoading ||
      resetLoading ||
      loading ||
      overrideLoading
    ) {
      return;
    }

    const confirmed = window.confirm(
      "DELETE BOOKING\n\nThis permanently deletes the booking and its related payment records, uploaded files, and payment proofs.\n\nThis action cannot be undone.\n\nAre you absolutely sure you want to delete this booking?"
    );

    if (!confirmed) {
      return;
    }

    const finalConfirmation = window.confirm(
      "FINAL CONFIRMATION\n\nDelete this booking permanently?"
    );

    if (!finalConfirmation) {
      return;
    }

    setDeleteLoading(true);
    setMessage("");
    setError("");

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
          data?.error ||
            "Unable to delete booking."
        );
      }

      router.replace("/admin/bookings");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete booking."
      );

      setDeleteLoading(false);
    }
  }

  async function adminOverride() {
    if (
      overrideLoading ||
      deleteLoading ||
      resetLoading ||
      loading
    ) {
      return;
    }

    if (overrideStatus === currentStatus) {
      setError(
        "Please select a different status."
      );
      return;
    }

    const confirmed = window.confirm(
      `ADMIN OVERRIDE\n\nYou are about to force this booking to:\n\n${statusLabels[overrideStatus]}\n\nThis bypasses the normal booking workflow. Use this only for emergency correction or recovery.\n\nContinue?`
    );

    if (!confirmed) {
      return;
    }

    setOverrideLoading(true);
    setMessage("");
    setError("");

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
            "Unable to apply admin override."
        );
      }

      setCurrentStatus(overrideStatus);
      setOverrideOpen(false);

      setMessage(
        `Admin override applied: ${statusLabels[overrideStatus]}.`
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to apply admin override."
      );
    } finally {
      setOverrideLoading(false);
    }
  }

  function handleCancel() {
    updateStatus("cancelled", {
      cancellation_reason: cancellationReason,
      cancellation_note:
        cancellationNote.trim() || null,
    });
  }

  const canApprove = currentStatus === "pending";

  const canReject =
    currentStatus === "pending" ||
    currentStatus === "approved";

  const canConfirm =
    currentStatus === "payment_submitted";

  const canComplete =
    currentStatus === "confirmed";

  const canReset =
    resetStatuses.includes(currentStatus);

  const actionDisabled =
    loading ||
    resetLoading ||
    deleteLoading ||
    overrideLoading;

  return (
    <div className="booking-actions">
      <div className="booking-actions-title">
        Booking actions
      </div>

      {message && (
        <div className="booking-action-message success">
          {message}
        </div>
      )}

      {error && (
        <div className="booking-action-message error">
          {error}
        </div>
      )}

      <div className="booking-action-current">
        <span>Current status</span>

        <strong>
          {statusLabels[currentStatus]}
        </strong>
      </div>

      {canApprove && (
        <button
          type="button"
          className="btn primary"
          disabled={actionDisabled}
          onClick={() =>
            updateStatus("approved")
          }
        >
          {loading
            ? "Updating..."
            : "Approve booking"}
        </button>
      )}

      {canConfirm && (
        <button
          type="button"
          className="btn primary"
          disabled={actionDisabled}
          onClick={() =>
            updateStatus("confirmed")
          }
        >
          {loading
            ? "Updating..."
            : "Confirm booking"}
        </button>
      )}

      {canComplete && (
        <button
          type="button"
          className="btn primary"
          disabled={actionDisabled}
          onClick={() =>
            updateStatus("completed")
          }
        >
          {loading
            ? "Updating..."
            : "Mark completed"}
        </button>
      )}

      {canReject && (
        <button
          type="button"
          className="btn secondary"
          disabled={actionDisabled}
          onClick={() =>
            updateStatus("rejected")
          }
        >
          {loading
            ? "Updating..."
            : "Reject booking"}
        </button>
      )}

      {resetStatuses.includes(currentStatus) && (
        <div className="booking-cancel-box">
          <div className="booking-cancel-title">
            Cancel booking
          </div>

          <select
            value={cancellationReason}
            onChange={(event) =>
              setCancellationReason(
                event.target.value
              )
            }
            disabled={actionDisabled}
          >
            {cancellationReasons.map(
              (reason) => (
                <option
                  key={reason.value}
                  value={reason.value}
                >
                  {reason.label}
                </option>
              )
            )}
          </select>

          <textarea
            value={cancellationNote}
            onChange={(event) =>
              setCancellationNote(
                event.target.value
              )
            }
            placeholder="Optional note"
            rows={3}
            disabled={actionDisabled}
          />

          <button
            type="button"
            className="btn secondary"
            disabled={actionDisabled}
            onClick={handleCancel}
          >
            {loading
              ? "Updating..."
              : "Cancel booking"}
          </button>
        </div>
      )}

      {canReset && (
        <div className="booking-reset-box">
          <div className="booking-reset-header">
            <div>
              <div className="booking-reset-title">
                Reset booking
              </div>

              <div className="booking-reset-help">
                Return the booking to an earlier
                workflow stage.
              </div>
            </div>

            <button
              type="button"
              className="booking-reset-toggle"
              disabled={actionDisabled}
              onClick={() => {
                setResetOpen(
                  (value) => !value
                );
                setError("");
                setMessage("");
              }}
            >
              {resetOpen ? "Close" : "Open"}
            </button>
          </div>

          {resetOpen && (
            <div className="booking-reset-controls">
              <select
                value={resetStatus}
                onChange={(event) =>
                  setResetStatus(
                    event.target
                      .value as BookingStatus
                  )
                }
                disabled={resetLoading}
              >
                {resetStatuses.map(
                  (value) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {statusLabels[value]}
                    </option>
                  )
                )}
              </select>

              <button
                type="button"
                className="booking-reset-button"
                disabled={resetLoading}
                onClick={resetBooking}
              >
                {resetLoading
                  ? "Resetting..."
                  : "Reset booking"}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="booking-admin-override">
        <div className="booking-admin-override-row">
          <div>
            <div className="booking-admin-override-label">
              Admin Override
            </div>

            <div className="booking-admin-override-help">
              Emergency correction only.
            </div>
          </div>

          <button
            type="button"
            className="booking-admin-override-toggle"
            disabled={actionDisabled}
            onClick={() => {
              setOverrideOpen(
                (value) => !value
              );
              setError("");
              setMessage("");
            }}
          >
            {overrideOpen
              ? "Close"
              : "Open"}
          </button>
        </div>

        {overrideOpen && (
          <div className="booking-admin-override-controls">
            <select
              value={overrideStatus}
              onChange={(event) =>
                setOverrideStatus(
                  event.target
                    .value as BookingStatus
                )
              }
              disabled={
                overrideLoading ||
                deleteLoading
              }
            >
              {adminOverrideStatuses.map(
                (value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {statusLabels[value]}
                  </option>
                )
              )}
            </select>

            <button
              type="button"
              className="booking-admin-override-button"
              disabled={
                overrideLoading ||
                deleteLoading
              }
              onClick={adminOverride}
            >
              {overrideLoading
                ? "Applying..."
                : "Apply override"}
            </button>
          </div>
        )}
      </div>

      <div className="booking-danger-zone">
        <div>
          <div className="booking-danger-title">
            Delete booking
          </div>

          <div className="booking-danger-help">
            Permanently remove this booking and
            its related records.
          </div>
        </div>

        <button
          type="button"
          className="booking-delete-button"
          disabled={actionDisabled}
          onClick={deleteBooking}
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

        .booking-actions-title {
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 2px;
        }

        .booking-action-current {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 9px;
          background: #faf8f6;
          border: 1px solid #eee8e4;
          font-size: 11px;
        }

        .booking-action-current span {
          color: #817779;
        }

        .booking-action-current strong {
          color: var(--admin-text);
          font-size: 11px;
        }

        .booking-action-message {
          padding: 9px 11px;
          border-radius: 8px;
          font-size: 11px;
          line-height: 1.4;
        }

        .booking-action-message.success {
          background: #f2f8f2;
          border: 1px solid #dcebdc;
        }

        .booking-action-message.error {
          background: #fff5f4;
          border: 1px solid #efd8d5;
          color: #8b4f4a;
        }

        .booking-cancel-box {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px;
          margin-top: 2px;
          border: 1px solid #eee8e4;
          border-radius: 10px;
          background: #faf8f6;
        }

        .booking-cancel-title {
          font-size: 11px;
          font-weight: 700;
        }

        .booking-cancel-box select,
        .booking-cancel-box textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #e4ddda;
          border-radius: 8px;
          background: white;
          padding: 8px 9px;
          font-family: inherit;
          font-size: 11px;
        }

        .booking-cancel-box textarea {
          resize: vertical;
        }

        .booking-reset-box {
          margin-top: 2px;
          padding: 10px;
          border: 1px solid #e7dfda;
          border-radius: 9px;
          background: #fbf9f8;
        }

        .booking-reset-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .booking-reset-title {
          font-size: 10px;
          font-weight: 700;
          color: #756b6b;
        }

        .booking-reset-help {
          margin-top: 2px;
          font-size: 9px;
          line-height: 1.3;
          color: #9a9090;
        }

        .booking-reset-toggle {
          flex: 0 0 auto;
          border: 1px solid #e1d8d4;
          border-radius: 6px;
          background: white;
          color: #756b6b;
          padding: 5px 8px;
          font-family: inherit;
          font-size: 9px;
          font-weight: 700;
          cursor: pointer;
        }

        .booking-reset-controls {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 6px;
          margin-top: 8px;
        }

        .booking-reset-controls select {
          min-width: 0;
          height: 30px;
          padding: 0 7px;
          border: 1px solid #e1d8d4;
          border-radius: 6px;
          background: white;
          color: #756b6b;
          font-family: inherit;
          font-size: 9px;
        }

        .booking-reset-button {
          height: 30px;
          padding: 0 9px;
          border: 1px solid #d9ceca;
          border-radius: 6px;
          background: #f5f1ef;
          color: #665d5d;
          font-family: inherit;
          font-size: 9px;
          font-weight: 700;
          cursor: pointer;
        }

        .booking-reset-button:disabled,
        .booking-reset-toggle:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .booking-admin-override {
          margin-top: 8px;
          padding: 9px 10px;
          border: 1px solid #eadfd9;
          border-radius: 8px;
          background: #fcfaf9;
        }

        .booking-admin-override-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .booking-admin-override-label {
          font-size: 10px;
          font-weight: 700;
          color: #756b6b;
          line-height: 1.2;
        }

        .booking-admin-override-help {
          margin-top: 2px;
          font-size: 9px;
          line-height: 1.2;
          color: #9a9090;
        }

        .booking-admin-override-toggle {
          flex: 0 0 auto;
          border: 1px solid #e1d8d4;
          border-radius: 6px;
          background: white;
          color: #756b6b;
          padding: 5px 8px;
          font-family: inherit;
          font-size: 9px;
          font-weight: 700;
          cursor: pointer;
        }

        .booking-admin-override-controls {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 6px;
          margin-top: 8px;
        }

        .booking-admin-override-controls select {
          min-width: 0;
          height: 30px;
          padding: 0 7px;
          border: 1px solid #e1d8d4;
          border-radius: 6px;
          background: white;
          color: #756b6b;
          font-family: inherit;
          font-size: 9px;
        }

        .booking-admin-override-button {
          height: 30px;
          padding: 0 9px;
          border: 1px solid #d9ceca;
          border-radius: 6px;
          background: #f5f1ef;
          color: #665d5d;
          font-family: inherit;
          font-size: 9px;
          font-weight: 700;
          cursor: pointer;
        }

        .booking-admin-override-button:disabled,
        .booking-admin-override-toggle:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .booking-danger-zone {
          margin-top: 4px;
          padding: 11px 10px;
          border: 1px solid #ead8d6;
          border-radius: 8px;
          background: #fffafa;
        }

        .booking-danger-title {
          font-size: 10px;
          font-weight: 700;
          color: #8b4f4a;
        }

        .booking-danger-help {
          margin-top: 2px;
          margin-bottom: 8px;
          font-size: 9px;
          line-height: 1.3;
          color: #a0807d;
        }

        .booking-delete-button {
          width: 100%;
          height: 31px;
          border: 1px solid #dfc4c1;
          border-radius: 7px;
          background: #fff4f3;
          color: #8b4f4a;
          font-family: inherit;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        .booking-delete-button:hover {
          background: #fcedeb;
        }

        .booking-delete-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}