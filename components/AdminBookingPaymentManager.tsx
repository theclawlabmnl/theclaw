"use client";

import {
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type Payment = {
  id: string;
  method: string | null;
  amount: number | null;
  status: string | null;
  verified_at: string | null;
  created_at: string | null;
  paid_at: string | null;
  payment_type: string | null;
  gross_amount: number | null;
  processing_fee: number | null;
  net_amount: number | null;
  note: string | null;
};

type Props = {
  bookingId: string;
  bookingStatus: string;
  bookingTotal: number;
  paidTowardBooking: number;
  remainingBalance: number;
  payments: Payment[];
};

function peso(value: number) {
  return `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function AdminBookingPaymentManager({
  bookingId,
  bookingStatus,
  bookingTotal,
  paidTowardBooking,
  remainingBalance,
  payments,
}: Props) {
  const router = useRouter();

  const [
    recordOpen,
    setRecordOpen,
  ] = useState(false);

  const [
    paymentType,
    setPaymentType,
  ] = useState("balance");

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState("Cash");

  const [
    paymentAmount,
    setPaymentAmount,
  ] = useState("");

  const [
    paymentNote,
    setPaymentNote,
  ] = useState("");

  const [
    busyKey,
    setBusyKey,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const submittedPayments =
    useMemo(
      () =>
        payments.filter(
          (payment) =>
            payment.status ===
            "submitted"
        ),
      [payments]
    );

  const isBusy =
    Boolean(busyKey);

  function clearMessages() {
    setMessage("");
    setError("");
  }

  async function updatePaymentStatus(
    paymentId: string,
    status: "verified" | "rejected"
  ) {
    clearMessages();

    const label =
      status === "verified"
        ? "verify"
        : "reject";

    const confirmed =
      window.confirm(
        status === "verified"
          ? "Verify this submitted payment?"
          : "Reject this submitted payment?"
      );

    if (!confirmed) {
      return;
    }

    setBusyKey(
      `${label}:${paymentId}`
    );

    try {
      const response =
        await fetch(
          "/api/admin/payments",
          {
            method:
              "PATCH",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "status",

                id:
                  paymentId,

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

      setMessage(
        status === "verified"
          ? "Payment verified."
          : "Payment rejected."
      );

      router.refresh();
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to update payment."
      );
    } finally {
      setBusyKey("");
    }
  }

  async function recordPayment() {
    clearMessages();

    let amount =
      Number(paymentAmount);

    if (
      paymentType === "balance" &&
      (!Number.isFinite(amount) ||
        amount <= 0)
    ) {
      amount =
        remainingBalance;
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setError(
        "Enter a valid payment amount."
      );

      return;
    }

    if (
      paymentType === "balance" &&
      remainingBalance > 0 &&
      amount >
        remainingBalance
    ) {
      setError(
        `Balance payment cannot exceed ${peso(
          remainingBalance
        )}.`
      );

      return;
    }

    setBusyKey(
      "record"
    );

    try {
      const response =
        await fetch(
          "/api/admin/payments",
          {
            method:
              "PATCH",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "record",

                id:
                  bookingId,

                amount,

                method:
                  paymentMethod,

                payment_type:
                  paymentType,

                note:
                  paymentNote.trim(),
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to record payment."
        );
      }

      setPaymentAmount("");
      setPaymentNote("");
      setRecordOpen(false);

      setMessage(
        "Payment recorded."
      );

      router.refresh();
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to record payment."
      );
    } finally {
      setBusyKey("");
    }
  }

  return (
    <div className="apm">
      <div className="apm-summary">
        <div>
          <span>
            Booking Total
          </span>

          <strong>
            {peso(
              bookingTotal
            )}
          </strong>
        </div>

        <div>
          <span>
            Paid
          </span>

          <strong>
            {peso(
              paidTowardBooking
            )}
          </strong>
        </div>

        <div>
          <span>
            Remaining
          </span>

          <strong>
            {peso(
              remainingBalance
            )}
          </strong>
        </div>
      </div>

      {message && (
        <div className="apm-message success">
          {message}
        </div>
      )}

      {error && (
        <div className="apm-message error">
          {error}
        </div>
      )}

      {submittedPayments.length >
        0 && (
        <div className="apm-submitted">
          <div className="apm-title">
            Submitted Payments
          </div>

          {submittedPayments.map(
            (payment) => (
              <div
                key={
                  payment.id
                }
                className="apm-payment"
              >
                <div className="apm-payment-info">
                  <strong>
                    {peso(
                      Number(
                        payment.amount ||
                          0
                      )
                    )}
                  </strong>

                  <span>
                    {payment.method ||
                      "Payment"}
                  </span>

                  <small>
                    {String(
                      payment.payment_type ||
                        "other"
                    ).replaceAll(
                      "_",
                      " "
                    )}
                  </small>
                </div>

                <div className="apm-buttons">
                  <button
                    type="button"
                    className="apm-btn verify"
                    disabled={
                      isBusy
                    }
                    onClick={() =>
                      updatePaymentStatus(
                        payment.id,
                        "verified"
                      )
                    }
                  >
                    {busyKey ===
                    `verify:${payment.id}`
                      ? "Verifying…"
                      : "Verify"}
                  </button>

                  <button
                    type="button"
                    className="apm-btn reject"
                    disabled={
                      isBusy
                    }
                    onClick={() =>
                      updatePaymentStatus(
                        payment.id,
                        "rejected"
                      )
                    }
                  >
                    {busyKey ===
                    `reject:${payment.id}`
                      ? "Rejecting…"
                      : "Reject"}
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {bookingStatus !==
        "draft" && (
        <>
          {!recordOpen ? (
            <button
              type="button"
              className="apm-record-button"
              disabled={
                isBusy
              }
              onClick={() => {
                clearMessages();
                setRecordOpen(
                  true
                );

                if (
                  remainingBalance >
                  0
                ) {
                  setPaymentType(
                    "balance"
                  );
                  setPaymentAmount(
                    remainingBalance.toFixed(
                      2
                    )
                  );
                }
              }}
            >
              Record Payment
            </button>
          ) : (
            <div className="apm-record-box">
              <div className="apm-title">
                Record Payment
              </div>

              <div className="apm-grid">
                <div className="apm-field">
                  <label>
                    Payment Type
                  </label>

                  <select
                    value={
                      paymentType
                    }
                    disabled={
                      isBusy
                    }
                    onChange={(
                      event
                    ) => {
                      const value =
                        event
                          .target
                          .value;

                      setPaymentType(
                        value
                      );

                      if (
                        value ===
                          "balance" &&
                        remainingBalance >
                          0
                      ) {
                        setPaymentAmount(
                          remainingBalance.toFixed(
                            2
                          )
                        );
                      }
                    }}
                  >
                    <option value="down_payment">
                      Down Payment
                    </option>

                    <option value="booking_payment">
                      Booking Payment
                    </option>

                    <option value="balance">
                      Balance
                    </option>

                    <option value="tip">
                      Tip
                    </option>

                    <option value="additional_charge">
                      Additional
                      Charge
                    </option>

                    <option value="other">
                      Other
                    </option>
                  </select>
                </div>

                <div className="apm-field">
                  <label>
                    Method
                  </label>

                  <select
                    value={
                      paymentMethod
                    }
                    disabled={
                      isBusy
                    }
                    onChange={(
                      event
                    ) =>
                      setPaymentMethod(
                        event
                          .target
                          .value
                      )
                    }
                  >
                    <option value="Cash">
                      Cash
                    </option>

                    <option value="GCash">
                      GCash
                    </option>

                    <option value="QR PH">
                      QR PH
                    </option>

                    <option value="Bank Transfer">
                      Bank
                      Transfer
                    </option>

                    <option value="Maya">
                      Maya
                    </option>

                    <option value="Card">
                      Card
                    </option>

                    <option value="Other">
                      Other
                    </option>
                  </select>
                </div>

                <div className="apm-field">
                  <label>
                    Amount
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      paymentAmount
                    }
                    disabled={
                      isBusy
                    }
                    onChange={(
                      event
                    ) =>
                      setPaymentAmount(
                        event
                          .target
                          .value
                      )
                    }
                  />
                </div>

                <div className="apm-field full">
                  <label>
                    Note
                  </label>

                  <textarea
                    rows={3}
                    value={
                      paymentNote
                    }
                    disabled={
                      isBusy
                    }
                    onChange={(
                      event
                    ) =>
                      setPaymentNote(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Optional payment note"
                  />
                </div>
              </div>

              <div className="apm-form-actions">
                <button
                  type="button"
                  className="apm-btn secondary"
                  disabled={
                    isBusy
                  }
                  onClick={() => {
                    setRecordOpen(
                      false
                    );
                    clearMessages();
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="apm-btn primary"
                  disabled={
                    isBusy
                  }
                  onClick={
                    recordPayment
                  }
                >
                  {busyKey ===
                  "record"
                    ? "Saving…"
                    : "Save Payment"}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .apm {
          display: grid;
          gap: 14px;
          width: 100%;
        }

        .apm-summary {
          display: grid;
          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );
          gap: 10px;
        }

        .apm-summary > div {
          padding: 12px;
          border-radius: 10px;
          background: #f7f6f5;
          min-width: 0;
        }

        .apm-summary span {
          display: block;
          margin-bottom: 4px;
          color: #777;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .apm-summary strong {
          display: block;
          font-size: 14px;
          overflow-wrap: anywhere;
        }

        .apm-message {
          padding: 11px 13px;
          border-radius: 9px;
          font-size: 13px;
          line-height: 1.45;
        }

        .apm-message.success {
          background: #edf8f0;
          color: #176b2c;
        }

        .apm-message.error {
          background: #fff0ef;
          color: #a61b13;
        }

        .apm-submitted,
        .apm-record-box {
          display: grid;
          gap: 11px;
          padding: 14px;
          border: 1px solid #e4dfdd;
          border-radius: 11px;
        }

        .apm-title {
          font-size: 13px;
          font-weight: 700;
        }

        .apm-payment {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding-top: 11px;
          border-top: 1px solid #eee;
        }

        .apm-payment-info {
          min-width: 0;
          display: grid;
          gap: 2px;
        }

        .apm-payment-info strong {
          font-size: 14px;
        }

        .apm-payment-info span,
        .apm-payment-info small {
          color: #777;
          font-size: 12px;
          text-transform: capitalize;
        }

        .apm-buttons,
        .apm-form-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .apm-btn,
        .apm-record-button {
          border: 0;
          border-radius: 8px;
          padding: 10px 13px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .apm-btn:disabled,
        .apm-record-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .apm-record-button,
        .apm-btn.primary,
        .apm-btn.verify {
          background: #111;
          color: #fff;
        }

        .apm-btn.secondary {
          background: #f1f1f1;
          color: #111;
        }

        .apm-btn.reject {
          background: #fff;
          color: #b42318;
          border: 1px solid #f0b8b3;
        }

        .apm-grid {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
          gap: 12px;
        }

        .apm-field {
          min-width: 0;
        }

        .apm-field.full {
          grid-column: 1 / -1;
        }

        .apm-field label {
          display: block;
          margin-bottom: 6px;
          font-size: 12px;
          font-weight: 600;
        }

        .apm-field input,
        .apm-field select,
        .apm-field textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 10px;
          background: #fff;
          font: inherit;
        }

        .apm-field textarea {
          resize: vertical;
        }

        .apm-form-actions {
          justify-content: flex-end;
        }

        @media (
          max-width: 600px
        ) {
          .apm-summary,
          .apm-grid {
            grid-template-columns:
              1fr;
          }

          .apm-field.full {
            grid-column: auto;
          }

          .apm-payment {
            align-items: flex-start;
            flex-direction: column;
          }

          .apm-buttons,
          .apm-form-actions {
            width: 100%;
          }

          .apm-buttons .apm-btn,
          .apm-form-actions
            .apm-btn {
            flex: 1 1 0;
          }

          .apm-field input,
          .apm-field select,
          .apm-field textarea {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
}
