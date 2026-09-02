"use client";

import { useState } from "react";

export default function CopyBookingId({
  value,
}: {
  value: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (error) {
      console.error("Failed to copy booking ID:", error);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="booking-copy-button"
      aria-label={`Copy booking ID ${value}`}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}