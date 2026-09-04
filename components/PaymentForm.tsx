"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { peso } from "@/lib/utils";

type PaymentMethod = {
  id: string;
  name: string;
  account_name?: string;
  account_details?: string;
  instructions?: string;
  processing_fee?: number;
  qr_url?: string;
  active?: boolean;
};

type PaymentFormProps = {
  token: string;
  customerName: string;
  mobileNumber?: string | null;
  socialHandle?: string | null;
  referenceCode?: string | null;
  preferredDate?: string | null;
  preferredTime?: string | null;
  bookingTotal: number;
  remainingBalance: number;
  downPayment: number;
  paymentMethods: PaymentMethod[];
};

export default function PaymentForm({
  token,
  referenceCode,
  preferredDate,
  preferredTime,
  downPayment,
  paymentMethods,
}: PaymentFormProps) {
  const router = useRouter();

  const activeMethods = useMemo(
    () =>
      paymentMethods.filter(
        (item) => item.active !== false && item.id && item.name
      ),
    [paymentMethods]
  );

  const [methodId, setMethodId] = useState(
    activeMethods[0]?.id || ""
  );
  const [paymentMethodMenuOpen, setPaymentMethodMenuOpen] =
    useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const selected =
    activeMethods.find((item) => item.id === methodId) ||
    activeMethods[0];

  const processingFee = Math.max(
    0,
    Number(selected?.processing_fee || 0)
  );
  const totalPayable = downPayment + processingFee;

  async function copyAccountDetails() {
    const value = String(selected?.account_details || "").trim();
    if (!value) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.setAttribute("readonly", "");
        document.body.appendChild(textarea);
        textarea.select();

        const ok = document.execCommand("copy");
        document.body.removeChild(textarea);

        if (!ok) throw new Error("Copy failed");
      }

      setError("");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(
        "Unable to copy automatically. Please press and hold the payment details to copy them."
      );
    }
  }

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    setError("");

    const selectedFile = event.target.files?.[0] || null;

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (selectedFile.size > 8 * 1024 * 1024) {
      setFile(null);
      setError("Payment proof must be 8MB or smaller.");
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/heic",
      "image/heif",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setFile(null);
      setError("Payment proof must be JPG, PNG, or HEIC.");
      return;
    }

    setFile(selectedFile);
  }

  async function submitPayment() {
    setError("");

    if (!selected) {
      setError("No payment method is currently available.");
      return;
    }

    if (!file) {
      setError("Please upload your payment proof first.");
      return;
    }

    setBusy(true);

    try {
      const data = new FormData();
      data.append("token", token);
      data.append("method", selected.id);
      data.append("amount", String(downPayment));
      data.append("proof", file);

      const response = await fetch("/api/payment-proof", {
        method: "POST",
        body: data,
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to submit your payment proof."
        );
      }

      router.push(`/status/${token}`);
    } catch (submissionError: unknown) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to submit your payment proof."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="payment-form-clean">
      <section className="payment-section-clean">
        <div className="payment-section-label-clean">
          Booking Summary
        </div>

        <div className="payment-booking-summary-clean">
          <div className="payment-booking-info-clean">
            <span>Appointment</span>
            <strong>
              {preferredDate || "—"}
              {preferredTime ? ` · ${preferredTime}` : ""}
            </strong>
          </div>

          <div className="payment-booking-info-clean">
            <span>Booking Reference</span>
            <strong>{referenceCode || "—"}</strong>
          </div>

          <div className="payment-booking-amount-clean">
            <span>Amount Due</span>
            <strong>{peso(downPayment)}</strong>
          </div>
        </div>

        <p className="payment-booking-note-clean">
          A {peso(downPayment)} down payment is required to secure your
          appointment.
        </p>
      </section>

      <section className="payment-section-clean">
        <div className="payment-section-label-clean">
          Payment method
        </div>

        <h2 className="payment-heading-clean">
          Choose your payment method
        </h2>

        <p className="payment-description-clean">
          Select one of the options below to view the payment details.
        </p>

        {activeMethods.length === 0 ? (
          <div className="payment-error-clean">
            No payment method is currently available. Please contact
            TheClawLab MNL.
          </div>
        ) : (
          <>
            {activeMethods.length <= 4 ? (
              <div className="payment-picker-clean">
                {activeMethods.map((item) => {
                  const fee = Math.max(
                    0,
                    Number(item.processing_fee || 0)
                  );
                  const payable = downPayment + fee;
                  const isSelected = item.id === selected?.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`payment-picker-option ${
                        isSelected ? "payment-picker-selected" : ""
                      }`}
                      onClick={() => {
                        setMethodId(item.id);
                        setCopied(false);
                        setError("");
                      }}
                    >
                      <span className="payment-picker-name">
                        {item.name}
                      </span>

                      <span className="payment-picker-amount">
                        {peso(payable)}
                      </span>

                      <span className="payment-picker-check">
                        {isSelected ? "✓" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  margin: "14px 0 18px",
                }}
              >
                <label
                  style={{
                    display: "block",
                    marginBottom: 7,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Payment Method
                </label>

                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={paymentMethodMenuOpen}
                  onClick={() =>
                    setPaymentMethodMenuOpen((open) => !open)
                  }
                  style={{
                    width: "100%",
                    minHeight: 48,
                    padding: "10px 14px",
                    border: paymentMethodMenuOpen
                      ? "1px solid #b98f99"
                      : "1px solid #dfd6d3",
                    borderRadius: 12,
                    background: "#fff",
                    color: "inherit",
                    fontFamily: "inherit",
                    fontSize: 15,
                    textAlign: "left",
                    cursor: "pointer",
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    boxShadow: paymentMethodMenuOpen
                      ? "0 0 0 3px rgba(185,143,153,.12)"
                      : "none",
                  }}
                >
                  <span
                    style={{
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {selected
                      ? `${selected.name} — ${peso(totalPayable)}`
                      : "Select payment method"}
                  </span>

                  <span
                    aria-hidden="true"
                    style={{
                      flexShrink: 0,
                      color: "#9a737c",
                      fontSize: 13,
                      transform: paymentMethodMenuOpen
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                      transition: "transform .15s ease",
                    }}
                  >
                    ▾
                  </span>
                </button>

                {paymentMethodMenuOpen && (
                  <div
                    role="listbox"
                    aria-label="Payment methods"
                    style={{
                      position: "absolute",
                      top: "calc(100% + 7px)",
                      left: 0,
                      right: 0,
                      zIndex: 30,
                      maxHeight: 260,
                      overflowY: "auto",
                      padding: 6,
                      border: "1px solid #e2d8d5",
                      borderRadius: 12,
                      background: "#fff",
                      boxShadow:
                        "0 12px 28px rgba(62,43,47,.12)",
                    }}
                  >
                    {activeMethods.map((item) => {
                      const fee = Math.max(
                        0,
                        Number(item.processing_fee || 0)
                      );
                      const payable = downPayment + fee;
                      const isSelected = item.id === selected?.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            setMethodId(item.id);
                            setPaymentMethodMenuOpen(false);
                            setCopied(false);
                            setError("");
                          }}
                          style={{
                            width: "100%",
                            minHeight: 42,
                            padding: "9px 10px",
                            border: 0,
                            borderRadius: 9,
                            background: isSelected
                              ? "#f8eef0"
                              : "transparent",
                            color: "inherit",
                            fontFamily: "inherit",
                            cursor: "pointer",
                            display: "grid",
                            gridTemplateColumns:
                              "minmax(0, 1fr) auto 18px",
                            alignItems: "center",
                            gap: 10,
                            textAlign: "left",
                          }}
                        >
                          <span
                            style={{
                              minWidth: 0,
                              fontSize: 13,
                              fontWeight: isSelected ? 600 : 500,
                              overflowWrap: "anywhere",
                            }}
                          >
                            {item.name}
                          </span>

                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {peso(payable)}
                          </span>

                          <span
                            aria-hidden="true"
                            style={{
                              color: "#9a737c",
                              fontSize: 13,
                              fontWeight: 700,
                              textAlign: "center",
                            }}
                          >
                            {isSelected ? "✓" : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {selected && (
              <div
                className="payment-details-clean"
                style={{
                  display: "grid",
                  gap: 16,
                }}
              >
                <div
                  className="payment-details-header"
                  style={{
                    marginBottom: 0,
                  }}
                >
                  <div>
                    <span>Pay via</span>
                    <h3>{selected.name}</h3>
                  </div>

                  <strong>{peso(totalPayable)}</strong>
                </div>

                {selected.qr_url && (
                  <div
                    className="payment-qr-clean"
                    style={{
                      width: "100%",
                      margin: "0",
                      padding: "0",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      textAlign: "center",
                      boxSizing: "border-box",
                    }}
                  >
                    <img
                      src={selected.qr_url}
                      alt={`${selected.name} payment QR`}
                      style={{
                        display: "block",
                        width: "min(280px, 100%)",
                        height: "auto",
                        marginLeft: "auto",
                        marginRight: "auto",
                        objectFit: "contain",
                      }}
                    />
                  </div>
                )}

                {(selected.account_name ||
                  selected.account_details) && (
                  <div
                    className="payment-account-clean"
                    style={{
                      margin: 0,
                      fontFamily: "inherit",
                    }}
                  >
                    {selected.account_name && (
                      <div>
                        <span style={{ fontFamily: "inherit" }}>Account Name</span>
                        <strong
                          style={{
                            fontFamily: "inherit",
                            fontWeight: 600,
                          }}
                        >
                          {selected.account_name}
                        </strong>
                      </div>
                    )}

                    {selected.account_details && (
                      <div>
                        <span style={{ fontFamily: "inherit" }}>Account Number</span>

                        <div
                          className="payment-number-clean"
                          style={{
                            marginTop: 6,
                          }}
                        >
                          <strong
                            style={{
                              fontFamily: "inherit",
                              fontWeight: 600,
                            }}
                          >
                            {selected.account_details}
                          </strong>

                          <button
                            type="button"
                            onClick={copyAccountDetails}
                          >
                            {copied ? "Copied" : "Copy"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div
                  style={{
                    border: "1px solid rgba(80,62,62,.16)",
                    borderRadius: 14,
                    overflow: "hidden",
                    background: "#fff",
                    fontFamily: "inherit",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "9px 13px",
                      fontFamily: "inherit",
                      fontSize: 13,
                      lineHeight: 1.35,
                    }}
                  >
                    <span style={{ fontFamily: "inherit" }}>
                      Booking Payment
                    </span>
                    <strong
                      style={{
                        fontFamily: "inherit",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {peso(downPayment)}
                    </strong>
                  </div>

                  {processingFee > 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "9px 13px",
                        borderTop:
                          "1px solid rgba(80,62,62,.11)",
                        fontFamily: "inherit",
                        fontSize: 13,
                        lineHeight: 1.35,
                      }}
                    >
                      <span style={{ fontFamily: "inherit" }}>
                        Processing Fee
                      </span>
                      <strong
                        style={{
                          fontFamily: "inherit",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {peso(processingFee)}
                      </strong>
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "10px 13px",
                      borderTop:
                        "1px solid rgba(80,62,62,.11)",
                      background: "rgba(190,120,135,.08)",
                      fontFamily: "inherit",
                      fontSize: 13,
                      lineHeight: 1.35,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "inherit",
                        fontWeight: 600,
                      }}
                    >
                      Total to Pay
                    </span>
                    <strong
                      style={{
                        fontFamily: "inherit",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {peso(totalPayable)}
                    </strong>
                  </div>
                </div>

                {selected.instructions && (
                  <p
                    className="payment-instruction-clean"
                    style={{
                      whiteSpace: "pre-wrap",
                      margin: 0,
                      lineHeight: 1.65,
                    }}
                  >
                    {selected.instructions}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </section>

      <section className="payment-section-clean">
        <div className="payment-section-label-clean">
          Proof of payment
        </div>

        <h2 className="payment-heading-clean">
          Upload your Proof of Payment
        </h2>

        <p className="payment-description-clean">
          Upload a clear screenshot showing your successful payment.
        </p>

        <label
          className={`payment-upload-clean ${
            file ? "payment-upload-selected" : ""
          }`}
        >
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.heic,.heif,image/jpeg,image/png,image/heic,image/heif"
            onChange={handleFileChange}
          />

          <div className="payment-upload-icon-clean">
            {file ? "✓" : "↑"}
          </div>

          <strong>
            {file ? "Payment proof selected" : "Upload payment proof"}
          </strong>

          <span>
            {file
              ? file.name
              : "JPG, PNG, or HEIC · maximum 8MB"}
          </span>
        </label>

        {error && (
          <div className="payment-error-clean" role="alert">
            {error}
          </div>
        )}
      </section>

      <button
        type="button"
        className="payment-submit-clean"
        disabled={busy || !file || !selected}
        onClick={submitPayment}
      >
        {busy ? "Submitting..." : "Submit Payment Proof"}
      </button>

      <p className="payment-submit-note-clean">
        Your payment proof will be reviewed by TheClawLab MNL before your
        booking is confirmed.
      </p>
    </div>
  );
}
