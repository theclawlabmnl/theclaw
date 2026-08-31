"use client";

import Link from "next/link";
import { useState } from "react";

export default function BookingActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const [busy, setBusy] =
    useState(false);

  const act = async (
    nextStatus: string
  ) => {
    const confirmed =
      window.confirm(
        `Change this booking to "${nextStatus}"?`
      );

    if (!confirmed) {
      return;
    }

    setBusy(true);

    try {
      const response =
        await fetch(
          "/api/admin/bookings",
          {
            method: "PATCH",
            headers: {
              "content-type":
                "application/json",
            },
            body: JSON.stringify({
              action: "status",
              id,
              status:
                nextStatus,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Action failed."
        );
      }

      window.location.reload();
    } catch (error: any) {
      alert(
        error?.message ||
          "Action failed."
      );

      setBusy(false);
    }
  };

  return (
    <div className="actions">
      {status === "pending" && (
        <>
          <button
            className="btn small"
            disabled={busy}
            onClick={() =>
              act("approved")
            }
          >
            APPROVE
          </button>

          <button
            className="btn small danger"
            disabled={busy}
            onClick={() =>
              act("rejected")
            }
          >
            REJECT
          </button>
        </>
      )}

      {status ===
        "payment_submitted" && (
        <>
          <button
            className="btn small"
            disabled={busy}
            onClick={() =>
              act("confirmed")
            }
          >
            VERIFY PAYMENT
          </button>

          <button
            className="btn small danger"
            disabled={busy}
            onClick={() =>
              act("approved")
            }
          >
            REJECT PAYMENT
          </button>
        </>
      )}

      {status === "confirmed" && (
        <button
          className="btn small"
          disabled={busy}
          onClick={() =>
            act("completed")
          }
        >
          MARK COMPLETED
        </button>
      )}

      {[
        "pending",
        "approved",
        "payment_submitted",
        "confirmed",
      ].includes(status) && (
        <button
          className="btn small danger"
          disabled={busy}
          onClick={() =>
            act("cancelled")
          }
        >
          CANCEL
        </button>
      )}
    </div>
  );
}