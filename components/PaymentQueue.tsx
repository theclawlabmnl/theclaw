"use client";

import {
  useState,
} from "react";

export default function PaymentQueue({
  payments,
}: {
  payments: any[];
}) {
  const [busy, setBusy] =
    useState(false);

  const act = async (
    id: string,
    status: string
  ) => {
    const message =
      status === "verified"
        ? "Verify this payment?"
        : "Reject this payment proof?";

    if (
      !window.confirm(
        message
      )
    ) {
      return;
    }

    setBusy(true);

    try {
      const response =
        await fetch(
          "/api/admin/payments",
          {
            method: "PATCH",
            headers: {
              "content-type":
                "application/json",
            },
            body: JSON.stringify({
              id,
              status,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to update payment."
        );
      }

      window.location.reload();
    } catch (
      error: any
    ) {
      alert(
        error?.message ||
          "Unable to update payment."
      );

      setBusy(false);
    }
  };

  const formatDate = (
    value: string
  ) => {
    if (!value) {
      return "—";
    }

    return new Date(
      `${value}T12:00:00`
    ).toLocaleDateString(
      "en-US",
      {
        month:
          "short",
        day:
          "numeric",
        year:
          "numeric",
      }
    );
  };

  return (
    <div className="payment-queue">
      {payments.length ? (
        payments.map(
          (payment) => (
            <div
              className="payment-admin-card"
              key={
                payment.id
              }
            >
              <div className="payment-admin-header">
                <div>
                  <div className="kicker">
                    {
                      payment.bookings
                        ?.reference_code
                    }
                  </div>

                  <h2 className="serif">
                    {
                      payment.bookings
                        ?.customer_name ||
                      "Unknown customer"
                    }
                  </h2>

                  <p className="muted">
                    {
                      payment.bookings
                        ?.preferred_date
                        ? formatDate(
                            payment
                              .bookings
                              .preferred_date
                          )
                        : "—"
                    }

                    {" · "}

                    {
                      payment.bookings
                        ?.preferred_time ||
                      "—"
                    }
                  </p>
                </div>

                <span className="status-pill">
                  {payment.status}
                </span>
              </div>

              <div className="payment-admin-grid">
                <div>
                  <span>
                    Method
                  </span>

                  <strong>
                    {
                      payment.method
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Amount
                  </span>

                  <strong>
                    ₱
                    {Number(
                      payment.amount ||
                        0
                    ).toLocaleString(
                      "en-PH",
                      {
                        minimumFractionDigits:
                          2,
                        maximumFractionDigits:
                          2,
                      }
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Proof
                  </span>

                  {payment.proof_path ? (
                    <span className="proof-available">
                      Payment proof uploaded
                    </span>
                  ) : (
                    <span className="muted">
                      No proof found
                    </span>
                  )}
                </div>
              </div>

              {payment.proof_path && (
                <div className="payment-proof-box">
                  <p className="muted">
                    Proof file:
                  </p>

                  <code>
                    {
                      payment.proof_path
                    }
                  </code>

                  <p className="muted">
                    The proof is stored in the
                    private payment-proofs
                    bucket.
                  </p>
                </div>
              )}

              {payment.status ===
                "submitted" && (
                <div className="actions">
                  <button
                    className="btn small"
                    disabled={
                      busy
                    }
                    onClick={() =>
                      act(
                        payment.id,
                        "verified"
                      )
                    }
                  >
                    VERIFY PAYMENT
                  </button>

                  <button
                    className="btn small danger"
                    disabled={
                      busy
                    }
                    onClick={() =>
                      act(
                        payment.id,
                        "rejected"
                      )
                    }
                  >
                    REJECT PAYMENT
                  </button>
                </div>
              )}
            </div>
          )
        )
      ) : (
        <div className="card empty">
          No payments are currently waiting
          for verification.
        </div>
      )}

      <style jsx>{`
        .payment-queue {
          display: grid;
          gap: 12px;
        }

        .payment-admin-card {
          width: 100%;
          min-width: 0;
          padding: 18px;
          border: 1px solid var(--line);
          border-radius: 18px;
          background: #fff;
          overflow: hidden;
        }

        .payment-admin-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
        }

        .payment-admin-header > div {
          min-width: 0;
        }

        .payment-admin-header h2 {
          margin: 3px 0 4px;
          font-size: 23px;
          line-height: 1.05;
        }

        .payment-admin-header p {
          margin: 0;
          font-size: 12px;
        }

        .payment-admin-grid {
          display: grid;
          grid-template-columns: repeat(
            3,
            minmax(0, 1fr)
          );
          gap: 12px;
          margin-top: 16px;
          padding-top: 15px;
          border-top: 1px solid var(--line);
        }

        .payment-admin-grid > div {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .payment-admin-grid span:first-child {
          color: var(--muted);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .payment-admin-grid strong,
        .payment-admin-grid span {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .proof-available {
          font-size: 12px;
          font-weight: 600;
        }

        .payment-proof-box {
          margin-top: 15px;
          padding: 12px;
          border-radius: 12px;
          background: var(--soft);
          overflow: hidden;
        }

        .payment-proof-box p {
          margin: 0 0 5px;
          font-size: 11px;
        }

        .payment-proof-box code {
          display: block;
          max-width: 100%;
          overflow-wrap: anywhere;
          word-break: break-word;
          font-size: 11px;
        }

        .payment-admin-card .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 15px;
        }

        @media (max-width: 650px) {
          .payment-admin-header {
            flex-direction: column;
          }

          .payment-admin-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 420px) {
          .payment-admin-card {
            padding: 15px;
          }

          .payment-admin-grid {
            grid-template-columns: 1fr;
          }

          .payment-admin-card .actions {
            width: 100%;
          }

          .payment-admin-card .actions .btn {
            flex: 1 1 auto;
            min-width: 0;
          }
        }
      `}</style>
    </div>
  );
}