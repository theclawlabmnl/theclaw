"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CANCELLATION_WINDOW_HOURS = 48;

type Props = {
  token: string;
  label?: string;
  confirmedAt?: string | null;
};

export default function CancelBookingButton({
  token,
  label = "Cancel Booking",
  confirmedAt,
}: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getCancellationDeadline = () => {
    if (!confirmedAt) {
      return null;
    }

    const confirmedTime = new Date(confirmedAt).getTime();

    if (Number.isNaN(confirmedTime)) {
      return null;
    }

    return confirmedTime + CANCELLATION_WINDOW_HOURS * 60 * 60 * 1000;
  };

  const cancellationDeadline = getCancellationDeadline();

  const refundEligible =
    cancellationDeadline !== null &&
    Date.now() <= cancellationDeadline;

  const isNonRefundable =
    cancellationDeadline !== null &&
    Date.now() > cancellationDeadline;

  async function handleCancel() {
    let confirmationMessage =
      "Are you sure you want to cancel this booking?";

    if (refundEligible) {
      confirmationMessage =
        "You are still within the 48-hour cancellation window. Your booking/down payment is eligible for a refund, minus any non-refundable payment processing fees.\n\nAre you sure you want to cancel this booking?";
    } else if (isNonRefundable) {
      confirmationMessage =
        "The 48-hour cancellation window has passed. This booking payment is non-refundable.\n\nAre you sure you want to cancel this booking?";
    }

    const confirmed = window.confirm(confirmationMessage);

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/bookings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          action: "cancel",
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Unable to cancel your booking."
        );
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to cancel your booking."
      );

      setLoading(false);
    }
  }

  let buttonLabel = label;

  if (loading) {
    buttonLabel = "Cancelling...";
  } else if (refundEligible) {
    buttonLabel = `${label} — Refund Eligible`;
  } else if (isNonRefundable) {
    buttonLabel = `${label} — Non-Refundable`;
  }

  return (
    <div style={{ marginTop: "8px" }}>
      <button
        type="button"
        onClick={handleCancel}
        disabled={loading}
        className="status-secondary-button"
        style={{
          width: "100%",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1,
          background: "#fff",
          color: "#000",
          border: "1px solid #d8d8d8",
          borderRadius: "7px",
          padding: "11px 14px",
          fontSize: "12px",
          fontWeight: 500,
        }}
      >
        {buttonLabel}
      </button>

      {refundEligible && !loading && (
        <p
          style={{
            marginTop: "7px",
            marginBottom: 0,
            fontSize: "11px",
            lineHeight: 1.4,
            color: "#555",
            textAlign: "center",
          }}
        >
          Cancel within 48 hours for a refund, minus any
          non-refundable payment processing fees.
        </p>
      )}

      {isNonRefundable && !loading && (
        <p
          style={{
            marginTop: "7px",
            marginBottom: 0,
            fontSize: "11px",
            lineHeight: 1.4,
            color: "#a00000",
            textAlign: "center",
          }}
        >
          The 48-hour cancellation window has passed.
          Cancellation is non-refundable.
        </p>
      )}

      {error && (
        <p
          style={{
            marginTop: "7px",
            marginBottom: 0,
            fontSize: "11px",
            lineHeight: 1.4,
            color: "#a00000",
            textAlign: "center",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}