"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BookingCardActionsProps = {
  id: string;
};

export default function BookingCardActions({
  id,
}: BookingCardActionsProps) {
  const router = useRouter();

  const [loading, setLoading] = useState<
    "delete" | "reset" | null
  >(null);

  async function deleteBooking() {
    const confirmed = window.confirm(
      "Delete this booking permanently?\n\nThis cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setLoading("delete");

    try {
      const response = await fetch(
        "/api/admin/bookings",
        {
          method: "PATCH",
          cache: "no-store",
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

      const result = await response
        .json()
        .catch(() => null);

      if (!response.ok || result?.deleted !== true) {
        throw new Error(
          result?.error ||
            "Unable to delete booking."
        );
      }

      window.location.href =
        "/admin/bookings";
    } catch (error) {
      console.error(
        "Delete booking error:",
        error
      );

      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to delete booking."
      );

      setLoading(null);
    }
  }

  async function resetBooking() {
    const confirmed = window.confirm(
      "Reset this booking to Pending?"
    );

    if (!confirmed) {
      return;
    }

    setLoading("reset");

    try {
      const response = await fetch(
        "/api/admin/bookings",
        {
          method: "PATCH",
          cache: "no-store",
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

      const result = await response
        .json()
        .catch(() => null);

      if (!response.ok || result?.ok !== true) {
        throw new Error(
          result?.error ||
            "Unable to reset booking."
        );
      }

      window.location.reload();
    } catch (error) {
      console.error(
        "Reset booking error:",
        error
      );

      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to reset booking."
      );

      setLoading(null);
    }
  }

  const busy = loading !== null;

  return (
    <div className="booking-card-actions">
      <button
        type="button"
        onClick={deleteBooking}
        disabled={busy}
        className="booking-card-action-button booking-card-delete-button"
      >
        {loading === "delete"
          ? "Deleting…"
          : "Delete"}
      </button>

      <button
        type="button"
        onClick={resetBooking}
        disabled={busy}
        className="booking-card-action-button booking-card-reset-button"
      >
        {loading === "reset"
          ? "Resetting…"
          : "Reset"}
      </button>

      <style jsx>{`
        .booking-card-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          width: 100%;
          margin-top: 8px;
        }

        .booking-card-action-button {
          width: 100%;
          min-height: 42px;
          padding: 10px 12px;
          border: 1px solid var(--border, #ddd);
          border-radius: 8px;
          background: transparent;
          font: inherit;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition:
            background-color 0.15s ease,
            border-color 0.15s ease,
            opacity 0.15s ease;
        }

        .booking-card-action-button:disabled {
          opacity: 0.5;
          cursor: wait;
        }

        .booking-card-delete-button {
          color: #8b4f4f;
        }

        .booking-card-delete-button:hover:not(:disabled) {
          background: rgba(139, 79, 79, 0.06);
          border-color: rgba(139, 79, 79, 0.3);
        }

        .booking-card-reset-button {
          color: inherit;
        }

        .booking-card-reset-button:hover:not(:disabled) {
          background: rgba(0, 0, 0, 0.035);
          border-color: rgba(0, 0, 0, 0.18);
        }
      `}</style>
    </div>
  );
}