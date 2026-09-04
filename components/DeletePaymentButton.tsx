"use client";

import { useState } from "react";

type Props = {
  paymentId: string;
};

export default function DeletePaymentButton({
  paymentId,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function deletePayment() {
    const confirmed = window.confirm(
      "Delete this payment record permanently? Booking totals will be recalculated. If this removes the verified down payment, the booking may return to Approved. This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/admin/bookings",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "delete_payment",
            payment_id: paymentId,
          }),
        }
      );

      const result = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Unable to delete payment."
        );
      }

      window.location.reload();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to delete payment."
      );
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="bd-payment-delete-button"
      disabled={loading}
      onClick={() => void deletePayment()}
    >
      {loading ? "Deleting..." : "Delete"}
    </button>
  );
}
