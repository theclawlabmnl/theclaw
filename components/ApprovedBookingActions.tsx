"use client";

import { useState } from "react";

export default function ApprovedBookingActions({
  accessToken,
}: {
  accessToken: string;
}) {
  const [copied, setCopied] = useState(false);

  const paymentUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/payment/${accessToken}`
      : `/payment/${accessToken}`;

  async function copyPaymentLink() {
    try {
      await navigator.clipboard.writeText(paymentUrl);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (error) {
      console.error("Failed to copy payment link:", error);
    }
  }

  function openPaymentPage() {
    window.open(paymentUrl, "_blank", "noopener,noreferrer");
  }

  function openBusinessSuite() {
    window.open(
      "https://business.facebook.com/",
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div className="approved-booking-actions">
      <button
        type="button"
        onClick={copyPaymentLink}
        className="booking-action-button booking-action-copy"
      >
        {copied ? "Copied!" : "Copy Payment Link"}
      </button>

      <button
        type="button"
        onClick={openPaymentPage}
        className="booking-action-button"
      >
        Open Payment Page
      </button>

      <button
        type="button"
        onClick={openBusinessSuite}
        className="booking-action-button"
      >
        Open Business Suite
      </button>
    </div>
  );
}