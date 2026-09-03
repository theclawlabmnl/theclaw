"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  token: string;
  label?: string;
};

export default function CancelBookingButton({
  token,
  label = "Cancel Booking",
}: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCancel() {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking?"
    );

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
        {loading ? "Cancelling..." : label}
      </button>

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