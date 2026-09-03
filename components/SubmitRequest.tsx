"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SubmitRequest({
  token,
}: {
  token: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit() {
    if (submitting) return;

    setSubmitting(true);

    try {
      const response = await fetch(
        `/api/bookings?token=${encodeURIComponent(token)}`,
        {
          method: "PATCH",
        }
      );

      const result = await response.json();

      if (response.ok) {
        router.push(`/status/${token}`);
        return;
      }

      alert(
        result.error ||
          "Unable to submit your booking request."
      );

      setSubmitting(false);
    } catch {
      alert(
        "Something went wrong while submitting your booking request. Please try again."
      );

      setSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      className="status-primary-button"
      disabled={submitting}
      onClick={handleSubmit}
      style={{
        width: "100%",
        opacity: submitting ? 0.7 : 1,
        cursor: submitting ? "wait" : "pointer",
      }}
    >
      {submitting
        ? "Submitting…"
        : "SUBMIT BOOKING REQUEST"}
    </button>
  );
}