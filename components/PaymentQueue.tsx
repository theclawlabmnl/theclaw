"use client";

import Link from "next/link";
import { useState } from "react";

function money(value: number | string | null | undefined) {
  return `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function prettyStatus(value: string) {
  if (value === "submitted") return "Needs verification";
  if (value === "verified") return "Verified";
  if (value === "rejected") return "Rejected";
  return value;
}

export default function PaymentQueue({
  payments,
}: {
  payments: any[];
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const act = async (id: string, status: string) => {
    const ok = window.confirm(
      status === "verified"
        ? "Verify this payment?"
        : "Reject this payment proof?"
    );
    if (!ok) return;

    setBusyId(id);

    try {
      const response = await fetch("/api/admin/payments", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to update payment.");
      }

      window.location.reload();
    } catch (error: any) {
      alert(error?.message || "Unable to update payment.");
      setBusyId(null);
    }
  };

  if (!payments.length) {
    return <div className="card empty">No payment submissions yet.</div>;
  }

  return (
    <div className="admin-payment-list">
      {payments.map((payment) => (
        <article className="card admin-payment-card" key={payment.id}>
          <div className="admin-payment-top">
            <div>
              <div className="kicker">{payment.bookings?.reference_code || "Booking"}</div>
              <h2 className="serif">{payment.bookings?.customer_name || "Unknown customer"}</h2>
              <div className="muted">
                {payment.bookings?.preferred_date || "—"} · {payment.bookings?.preferred_time || "—"}
              </div>
            </div>
            <span className="status-pill">{prettyStatus(payment.status)}</span>
          </div>

          <div className="admin-payment-meta">
            <div>
              <div className="kicker">Method</div>
              <strong>{payment.method}</strong>
            </div>
            <div>
              <div className="kicker">Amount</div>
              <strong>{money(payment.amount)}</strong>
            </div>
          </div>

          <div className="admin-proof-panel">
            <div className="kicker">Payment proof</div>
            {payment.proof_url ? (
              <a href={payment.proof_url} target="_blank" rel="noreferrer" className="admin-proof-link">
                <img src={payment.proof_url} alt="Payment proof" className="admin-proof-image" />
                <span className="admin-proof-caption">Open full-size proof →</span>
              </a>
            ) : (
              <div className="notice admin-proof-missing">
                The payment proof could not be loaded.
              </div>
            )}
          </div>

          <div className="admin-payment-actions">
            <Link
              href={payment.bookings?.access_token ? `/status/${payment.bookings.access_token}` : "/admin/bookings"}
              className="btn small secondary"
            >
              View customer status
            </Link>

            {payment.status === "submitted" && (
              <>
                <button
                  className="btn small"
                  disabled={busyId === payment.id}
                  onClick={() => act(payment.id, "verified")}
                >
                  VERIFY PAYMENT
                </button>
                <button
                  className="btn small danger"
                  disabled={busyId === payment.id}
                  onClick={() => act(payment.id, "rejected")}
                >
                  REJECT
                </button>
              </>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
