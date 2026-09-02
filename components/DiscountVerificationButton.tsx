"use client";

import { useState } from "react";

type Props = {
  bookingId: string;
};

export default function DiscountVerificationButton({
  bookingId,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function verifyDiscount() {
    const confirmed = window.confirm(
      "Verify this customer's eligibility and apply the 5% discount?"
    );

    if (!confirmed) {
      return;
    }

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
            action: "verify_discount",
            id: bookingId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to verify discount."
        );
      }

      window.location.reload();
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to verify discount."
      );
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 8,
      }}
    >
      <button
        type="button"
        className="btn"
        onClick={verifyDiscount}
        disabled={loading}
      >
        {loading
          ? "Verifying..."
          : "Verify & Apply 5% Discount"}
      </button>

      {error && (
        <div
          className="notice"
          style={{
            color: "crimson",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}