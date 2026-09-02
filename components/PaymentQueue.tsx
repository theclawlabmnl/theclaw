"use client";

import {
  useMemo,
  useState,
} from "react";

type PaymentRow = {
  id: string;
  booking_id: string;
  method: string;
  amount: number | string | null;
  status: string;
  verified_at?: string | null;
  created_at: string;
  payment_type?: string | null;
  gross_amount?: number | string | null;
  processing_fee?: number | string | null;
  net_amount?: number | string | null;
  note?: string | null;
  paid_at?: string | null;
  proofUrl?: string;

  bookings?: {
    id?: string | null;
    reference_code?: string | null;
    customer_name?: string | null;
    preferred_date?: string | null;
    preferred_time?: string | null;
    estimated_total?: number | string | null;
    down_payment?: number | string | null;
    access_token?: string | null;
  } | null;
};

type RecordForm = {
  payment_type: string;
  method: string;
  amount: string;
  note: string;
};

const paymentTypes = [
  {
    value: "down_payment",
    label: "Down Payment",
  },
  {
    value: "balance",
    label: "Balance Payment",
  },
  {
    value: "tip",
    label: "Tip",
  },
  {
    value: "additional_charge",
    label: "Additional Charge",
  },
  {
    value: "other",
    label: "Other",
  },
];

const methods = [
  "GCash",
  "QR PH",
  "Cash",
  "Bank Transfer",
  "Other",
];

function formatMoney(value: unknown) {
  return `₱${Number(value || 0).toLocaleString(
    "en-PH",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function paymentTypeLabel(
  value: string | null | undefined
) {
  const normalized = String(
    value || ""
  );

  if (
    normalized === "down_payment" ||
    normalized === "booking_payment"
  ) {
    return "Down Payment";
  }

  const match = paymentTypes.find(
    (item) =>
      item.value === normalized
  );

  return match?.label || "Payment";
}

function formatDateTime(
  value: string | null | undefined
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function isVerified(
  payment: PaymentRow
) {
  return (
    payment.status === "verified" ||
    Boolean(payment.verified_at)
  );
}

function paymentNet(
  payment: PaymentRow
) {
  return Number(
    payment.net_amount ??
      payment.amount ??
      0
  );
}

function isDownPayment(
  payment: PaymentRow
) {
  return (
    payment.payment_type ===
      "down_payment" ||
    payment.payment_type ===
      "booking_payment"
  );
}

export default function PaymentQueue({
  payments,
}: {
  payments: PaymentRow[];
}) {
  const [busyId, setBusyId] =
    useState<string | null>(null);

  const [
    recordingBookingId,
    setRecordingBookingId,
  ] = useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<
      | "all"
      | "submitted"
      | "verified"
      | "rejected"
    >("all");

  const [form, setForm] =
    useState<RecordForm>({
      payment_type: "balance",
      method: "Cash",
      amount: "",
      note: "",
    });

  const filteredPayments =
    useMemo(() => {
      const term = search
        .trim()
        .toLowerCase();

      return payments.filter(
        (payment) => {
          if (
            filter !== "all" &&
            payment.status !== filter
          ) {
            return false;
          }

          if (!term) {
            return true;
          }

          const customer =
            payment.bookings
              ?.customer_name || "";

          const reference =
            payment.bookings
              ?.reference_code || "";

          const method =
            payment.method || "";

          const type =
            paymentTypeLabel(
              payment.payment_type
            );

          const note =
            payment.note || "";

          return (
            customer
              .toLowerCase()
              .includes(term) ||
            reference
              .toLowerCase()
              .includes(term) ||
            method
              .toLowerCase()
              .includes(term) ||
            type
              .toLowerCase()
              .includes(term) ||
            note
              .toLowerCase()
              .includes(term)
          );
        }
      );
    }, [
      payments,
      search,
      filter,
    ]);

  const openRecord = (
    bookingId: string
  ) => {
    setRecordingBookingId(
      bookingId
    );

    setForm({
      payment_type: "balance",
      method: "Cash",
      amount: "",
      note: "",
    });
  };

  const closeRecord = () => {
    if (busyId) {
      return;
    }

    setRecordingBookingId(null);
  };

  const updateStatus = async (
    paymentId: string,
    status:
      | "verified"
      | "rejected"
  ) => {
    const message =
      status === "verified"
        ? "Verify this payment?"
        : "Reject this payment?";

    if (!window.confirm(message)) {
      return;
    }

    setBusyId(paymentId);

    try {
      const response = await fetch(
        "/api/admin/payments",
        {
          method: "PATCH",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            action: "status",
            id: paymentId,
            status,
          }),
        }
      );

      const result =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to update payment."
        );
      }

      window.location.reload();
    } catch (error: any) {
      alert(
        error?.message ||
          "Unable to update payment."
      );

      setBusyId(null);
    }
  };

  const recordPayment = async () => {
    if (!recordingBookingId) {
      return;
    }

    const amount = Number(
      form.amount
    );

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      alert(
        "Enter a valid payment amount."
      );

      return;
    }

    setBusyId(
      `record-${recordingBookingId}`
    );

    try {
      const response = await fetch(
        "/api/admin/payments",
        {
          method: "PATCH",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            action: "record",
            id: recordingBookingId,
            payment_type:
              form.payment_type,
            method: form.method,
            amount,
            note: form.note.trim(),
          }),
        }
      );

      const result =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to record payment."
        );
      }

      window.location.reload();
    } catch (error: any) {
      alert(
        error?.message ||
          "Unable to record payment."
      );

      setBusyId(null);
    }
  };

  return (
    <>
      <div
        className="card"
        style={{
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 1fr) 180px",
            gap: 12,
          }}
        >
          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search customer, reference, method..."
          />

          <select
            value={filter}
            onChange={(event) =>
              setFilter(
                event.target.value as
                  | "all"
                  | "submitted"
                  | "verified"
                  | "rejected"
              )
            }
          >
            <option value="all">
              All payments
            </option>

            <option value="submitted">
              To verify
            </option>

            <option value="verified">
              Verified
            </option>

            <option value="rejected">
              Rejected
            </option>
          </select>
        </div>
      </div>

      {filteredPayments.length > 0 ? (
        <div
          style={{
            display: "grid",
            gap: 14,
          }}
        >
          {filteredPayments.map(
            (payment) => {
              const booking =
                payment.bookings;

              const verified =
                isVerified(payment);

              const gross = Number(
                payment.gross_amount ??
                  payment.amount ??
                  0
              );

              const fee = Number(
                payment.processing_fee ??
                  0
              );

              const net =
                paymentNet(payment);

              const isSubmitted =
                payment.status ===
                "submitted";

              /*
               * Calculate the booking balance
               * from verified payment records.
               *
               * Down payment + balance payments
               * reduce the booking balance.
               *
               * Tips, additional charges and
               * "other" are kept separate.
               */
              const bookingPayments =
                payments.filter(
                  (item) =>
                    item.booking_id ===
                      payment.booking_id &&
                    isVerified(item) &&
                    (
                      isDownPayment(item) ||
                      item.payment_type ===
                        "balance"
                    )
                );

              const verifiedBookingPaid =
                bookingPayments.reduce(
                  (
                    sum,
                    item
                  ) =>
                    sum +
                    paymentNet(item),
                  0
                );

              const bookingTotal =
                Number(
                  booking?.estimated_total ||
                    0
                );

              const remaining =
                Math.max(
                  0,
                  bookingTotal -
                    verifiedBookingPaid
                );

              const displayDate =
                payment.paid_at ||
                payment.verified_at ||
                payment.created_at;

              return (
                <article
                  className="card"
                  key={payment.id}
                  style={{
                    padding: 20,
                  }}
                >
                  {/* HEADER */}

                  <div
                    style={{
                      display: "flex",
                      alignItems:
                        "flex-start",
                      justifyContent:
                        "space-between",
                      gap: 16,
                      flexWrap:
                        "wrap",
                    }}
                  >
                    <div
                      style={{
                        minWidth: 0,
                      }}
                    >
                      <div className="kicker">
                        {booking?.reference_code ||
                          "Booking"}
                      </div>

                      <h3
                        className="serif"
                        style={{
                          margin:
                            "5px 0 3px",
                        }}
                      >
                        {booking?.customer_name ||
                          "Unknown customer"}
                      </h3>

                      <div
                        className="muted"
                        style={{
                          fontSize: 13,
                        }}
                      >
                        {booking?.preferred_date ||
                          "—"}{" "}
                        ·{" "}
                        {booking?.preferred_time ||
                          "—"}
                      </div>
                    </div>

                    <span className="status-pill">
                      {payment.status}
                    </span>
                  </div>

                  {/* MAIN PAYMENT SUMMARY */}

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(3, minmax(0, 1fr))",
                      gap: 12,
                      marginTop: 18,
                    }}
                  >
                    <div
                      style={{
                        padding:
                          "13px 14px",
                        border:
                          "1px solid var(--line)",
                        borderRadius: 12,
                      }}
                    >
                      <div className="muted">
                        Payment Type
                      </div>

                      <strong>
                        {paymentTypeLabel(
                          payment.payment_type
                        )}
                      </strong>
                    </div>

                    <div
                      style={{
                        padding:
                          "13px 14px",
                        border:
                          "1px solid var(--line)",
                        borderRadius: 12,
                      }}
                    >
                      <div className="muted">
                        Method
                      </div>

                      <strong>
                        {payment.method ||
                          "—"}
                      </strong>
                    </div>

                    <div
                      style={{
                        padding:
                          "13px 14px",
                        border:
                          "1px solid var(--line)",
                        borderRadius: 12,
                      }}
                    >
                      <div className="muted">
                        Applied / Net
                      </div>

                      <strong>
                        {formatMoney(net)}
                      </strong>
                    </div>
                  </div>

                  {/* ACCOUNTING BREAKDOWN */}

                  <div
                    style={{
                      marginTop: 16,
                      paddingTop: 16,
                      borderTop:
                        "1px solid var(--line)",
                    }}
                  >
                    <div
                      className="kicker"
                      style={{
                        marginBottom: 9,
                      }}
                    >
                      Payment breakdown
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: 7,
                        fontSize: 13,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          gap: 12,
                        }}
                      >
                        <span className="muted">
                          Gross paid
                        </span>

                        <strong>
                          {formatMoney(
                            gross
                          )}
                        </strong>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          gap: 12,
                        }}
                      >
                        <span className="muted">
                          Processing fee
                        </span>

                        <strong>
                          {formatMoney(
                            fee
                          )}
                        </strong>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          gap: 12,
                          paddingTop: 8,
                          borderTop:
                            "1px solid var(--line)",
                        }}
                      >
                        <span>
                          Net / Applied to booking
                        </span>

                        <strong>
                          {formatMoney(
                            net
                          )}
                        </strong>
                      </div>
                    </div>

                    {fee > 0 && (
                      <div
                        className="notice"
                        style={{
                          marginTop: 12,
                          fontSize: 12,
                          lineHeight: 1.5,
                        }}
                      >
                        The{" "}
                        {formatMoney(fee)}{" "}
                        processing fee is
                        separate from the
                        booking amount and is
                        not deducted from the
                        customer's booking
                        balance.
                      </div>
                    )}
                  </div>

                  {/* BOOKING BALANCE */}

                  {(
                    isDownPayment(
                      payment
                    ) ||
                    payment.payment_type ===
                      "balance"
                  ) && (
                    <div
                      style={{
                        marginTop: 16,
                        padding:
                          "13px 14px",
                        border:
                          "1px solid var(--line)",
                        borderRadius: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          gap: 12,
                          fontSize: 13,
                        }}
                      >
                        <span className="muted">
                          Booking balance
                          remaining
                        </span>

                        <strong>
                          {formatMoney(
                            remaining
                          )}
                        </strong>
                      </div>
                    </div>
                  )}

                  {/* NOTE */}

                  {payment.note && (
                    <div
                      className="notice"
                      style={{
                        marginTop: 14,
                        lineHeight: 1.5,
                        fontSize: 13,
                      }}
                    >
                      <strong>
                        Note:
                      </strong>{" "}
                      {payment.note}
                    </div>
                  )}

                  {/* DATE */}

                  <div
                    className="muted"
                    style={{
                      marginTop: 12,
                      fontSize: 12,
                    }}
                  >
                    {payment.paid_at
                      ? "Paid"
                      : "Recorded"}{" "}
                    {formatDateTime(
                      displayDate
                    )}
                  </div>

                  {/* ACTIONS */}

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 16,
                    }}
                  >
                    {payment.proofUrl && (
                      <a
                        className="btn secondary small"
                        href={
                          payment.proofUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        VIEW PAYMENT PROOF
                      </a>
                    )}

                    {isSubmitted && (
                      <>
                        <button
                          type="button"
                          className="btn small"
                          disabled={
                            busyId !== null
                          }
                          onClick={() =>
                            updateStatus(
                              payment.id,
                              "verified"
                            )
                          }
                        >
                          {busyId ===
                          payment.id
                            ? "VERIFYING..."
                            : "VERIFY PAYMENT"}
                        </button>

                        <button
                          type="button"
                          className="btn small danger"
                          disabled={
                            busyId !== null
                          }
                          onClick={() =>
                            updateStatus(
                              payment.id,
                              "rejected"
                            )
                          }
                        >
                          REJECT
                        </button>
                      </>
                    )}

                    {booking?.id && (
                      <button
                        type="button"
                        className="btn secondary small"
                        disabled={
                          busyId !== null
                        }
                        onClick={() =>
                          openRecord(
                            payment.booking_id
                          )
                        }
                      >
                        RECORD PAYMENT
                      </button>
                    )}
                  </div>

                  {/* RECORD PAYMENT */}

                  {recordingBookingId ===
                    payment.booking_id && (
                    <div
                      style={{
                        marginTop: 18,
                        padding: 18,
                        border:
                          "1px solid var(--line)",
                        borderRadius: 14,
                        background:
                          "var(--soft)",
                      }}
                    >
                      <div className="kicker">
                        Add payment
                      </div>

                      <h4
                        className="serif"
                        style={{
                          margin:
                            "5px 0 4px",
                          fontSize: 20,
                        }}
                      >
                        Record payment
                      </h4>

                      <p
                        className="muted"
                        style={{
                          margin: 0,
                          fontSize: 12,
                          lineHeight: 1.5,
                        }}
                      >
                        Current booking
                        balance remaining:{" "}
                        {formatMoney(
                          remaining
                        )}
                      </p>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(2, minmax(0, 1fr))",
                          gap: 12,
                          marginTop: 14,
                        }}
                      >
                        <div className="field">
                          <label>
                            Payment type
                          </label>

                          <select
                            value={
                              form.payment_type
                            }
                            onChange={(
                              event
                            ) =>
                              setForm(
                                (
                                  current
                                ) => ({
                                  ...current,
                                  payment_type:
                                    event
                                      .target
                                      .value,
                                })
                              )
                            }
                          >
                            {paymentTypes.map(
                              (type) => (
                                <option
                                  key={
                                    type.value
                                  }
                                  value={
                                    type.value
                                  }
                                >
                                  {
                                    type.label
                                  }
                                </option>
                              )
                            )}
                          </select>
                        </div>

                        <div className="field">
                          <label>
                            Method
                          </label>

                          <select
                            value={
                              form.method
                            }
                            onChange={(
                              event
                            ) =>
                              setForm(
                                (
                                  current
                                ) => ({
                                  ...current,
                                  method:
                                    event
                                      .target
                                      .value,
                                })
                              )
                            }
                          >
                            {methods.map(
                              (method) => (
                                <option
                                  key={method}
                                  value={method}
                                >
                                  {method}
                                </option>
                              )
                            )}
                          </select>
                        </div>
                      </div>

                      <div
                        className="field"
                        style={{
                          marginTop: 12,
                        }}
                      >
                        <label>
                          Amount
                        </label>

                        <input
                          inputMode="decimal"
                          value={
                            form.amount
                          }
                          onChange={(
                            event
                          ) =>
                            setForm(
                              (
                                current
                              ) => ({
                                ...current,
                                amount:
                                  event
                                    .target
                                    .value,
                              })
                            )
                          }
                          placeholder="0.00"
                        />
                      </div>

                      <div
                        className="field"
                        style={{
                          marginTop: 12,
                        }}
                      >
                        <label>
                          Note
                          <span className="muted">
                            {" "}
                            (optional)
                          </span>
                        </label>

                        <textarea
                          value={
                            form.note
                          }
                          onChange={(
                            event
                          ) =>
                            setForm(
                              (
                                current
                              ) => ({
                                ...current,
                                note:
                                  event
                                    .target
                                    .value,
                              })
                            )
                          }
                          placeholder="e.g. Added chrome surcharge, client left a tip..."
                          style={{
                            minHeight: 90,
                            resize:
                              "vertical",
                          }}
                        />
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "flex-end",
                          gap: 8,
                          flexWrap:
                            "wrap",
                          marginTop: 14,
                        }}
                      >
                        <button
                          type="button"
                          className="btn secondary small"
                          disabled={
                            busyId !== null
                          }
                          onClick={
                            closeRecord
                          }
                        >
                          CANCEL
                        </button>

                        <button
                          type="button"
                          className="btn small"
                          disabled={
                            busyId !== null
                          }
                          onClick={
                            recordPayment
                          }
                        >
                          {busyId ===
                          `record-${payment.booking_id}`
                            ? "SAVING..."
                            : "RECORD PAYMENT"}
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            }
          )}
        </div>
      ) : (
        <div
          className="card"
          style={{
            padding: 30,
            textAlign: "center",
          }}
        >
          <div className="kicker">
            Payments
          </div>

          <h3
            className="serif"
            style={{
              marginTop: 6,
            }}
          >
            No payments found
          </h3>

          <p className="muted">
            Try another search or filter.
          </p>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 800px) {
          div[style*="repeat(3"] {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              ) !important;
          }

          div[style*="repeat(2"] {
            grid-template-columns:
              minmax(0, 1fr) !important;
          }
        }

        @media (max-width: 540px) {
          div[style*="repeat(3"],
          div[style*="repeat(2"] {
            grid-template-columns:
              minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </>
  );
}