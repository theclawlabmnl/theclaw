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

const cancellationReasons = [
  "Cancelled by client",
  "No-show",
  "Cancelled by Nailtech",
  "Other",
] as const;

const resetStatuses = [
  {
    value: "pending",
    label: "Pending",
  },
  {
    value: "approved",
    label: "Approved — Payment Required",
  },
  {
    value: "payment_submitted",
    label: "Payment Submitted",
  },
  {
    value: "confirmed",
    label: "Confirmed",
  },
] as const;

export default function BookingActions({
  id,
  status,
}: Props) {
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [cancellationOpen, setCancellationOpen] =
    useState(false);

  const [cancellationReason, setCancellationReason] =
    useState("");

  const [otherReason, setOtherReason] = useState("");

  const [resetOpen, setResetOpen] = useState(false);

  const [resetStatus, setResetStatus] =
    useState<BookingStatus>("pending");

  async function request(
    payload: Record<string, unknown>
  ) {
    setLoading(true);
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
            ...payload,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Something went wrong."
        );
      }

      window.location.reload();
    } catch (requestError: unknown) {
      if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError("Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function approve() {
    await request({
      action: "approve",
    });
  }

  async function reject() {
    const confirmed = window.confirm(
      "Reject this booking request?"
    );

    if (!confirmed) {
      return;
    }

    await request({
      action: "reject",
    });
  }

  async function complete() {
    const confirmed = window.confirm(
      "Mark this appointment as completed?"
    );

    if (!confirmed) {
      return;
    }

    await request({
      action: "complete",
    });
  }

  async function cancel() {
    if (!cancellationReason) {
      setError(
        "Please select a cancellation reason."
      );
      return;
    }

    if (
      cancellationReason === "Other" &&
      !otherReason.trim()
    ) {
      setError(
        "Please enter the cancellation reason."
      );
      return;
    }

    await request({
      action: "cancel",
      reason: cancellationReason,
      other_reason: otherReason.trim(),
    });
  }

  async function reset() {
    const confirmed = window.confirm(
      `Reset this booking to "${resetStatus}"?`
    );

    if (!confirmed) {
      return;
    }

    await request({
      action: "reset",
      status: resetStatus,
    });
  }

  async function remove() {
    const confirmed = window.confirm(
      "PERMANENTLY DELETE this booking?\n\nThis cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    const secondConfirmation = window.confirm(
      "Are you absolutely sure? All booking/payment records associated with this booking will be removed."
    );

    if (!secondConfirmation) {
      return;
    }

    await request({
      action: "delete",
      confirm: true,
    });
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {status === "pending" ? (
          <>
            <button
              type="button"
              onClick={approve}
              disabled={loading}
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Approve
            </button>

            <button
              type="button"
              onClick={reject}
              disabled={loading}
              className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Reject
            </button>
          </>
        ) : null}

        {status === "confirmed" ? (
          <button
            type="button"
            onClick={complete}
            disabled={loading}
            className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Mark Completed
          </button>
        ) : null}

        {status !== "cancelled" &&
        status !== "completed" ? (
          <button
            type="button"
            onClick={() =>
              setCancellationOpen(
                (value) => !value
              )
            }
            disabled={loading}
            className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50"
          >
            Cancel Booking
          </button>
        ) : null}

        <button
          type="button"
          onClick={() =>
            setResetOpen(
              (value) => !value
            )
          }
          disabled={loading}
          className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Reset
        </button>

        <button
          type="button"
          onClick={remove}
          disabled={loading}
          className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50"
        >
          Delete Booking
        </button>
      </div>

      {cancellationOpen ? (
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold">
            Cancellation Reason
          </h3>

          <div className="space-y-2">
            {cancellationReasons.map(
              (reason) => (
                <label
                  key={reason}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="radio"
                    name={`cancel-${id}`}
                    value={reason}
                    checked={
                      cancellationReason ===
                      reason
                    }
                    onChange={(event) => {
                      setCancellationReason(
                        event.target.value
                      );
                      setError("");
                    }}
                  />

                  <span>{reason}</span>
                </label>
              )
            )}
          </div>

          {cancellationReason === "Other" ? (
            <textarea
              value={otherReason}
              onChange={(event) => {
                setOtherReason(
                  event.target.value
                );
                setError("");
              }}
              placeholder="Enter cancellation reason..."
              rows={3}
              className="mt-3 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30"
            />
          ) : null}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={cancel}
              disabled={loading}
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Confirm Cancellation
            </button>

            <button
              type="button"
              onClick={() => {
                setCancellationOpen(false);
                setCancellationReason("");
                setOtherReason("");
                setError("");
              }}
              disabled={loading}
              className="rounded-xl border border-black/10 px-4 py-2 text-sm disabled:opacity-50"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {resetOpen ? (
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold">
            Reset Booking
          </h3>

          <p className="mb-3 text-xs text-black/60">
            Testing utility. Existing payment
            records are not deleted.
          </p>

          <select
            value={resetStatus}
            onChange={(event) => {
              setResetStatus(
                event.target.value as BookingStatus
              );
              setError("");
            }}
            disabled={loading}
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
          >
            {resetStatuses.map(
              (option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              )
            )}
          </select>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={reset}
              disabled={loading}
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Reset Booking
            </button>

            <button
              type="button"
              onClick={() => {
                setResetOpen(false);
                setError("");
              }}
              disabled={loading}
              className="rounded-xl border border-black/10 px-4 py-2 text-sm disabled:opacity-50"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}