"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { peso } from "@/lib/utils";

type PaymentConfig = {
  gcash_name?: string;
  gcash_number?: string;
  gcash_qr?: string;
  qrph_qr?: string;
  amount: number;
  processingFee?: number;
  totalPayable?: number;
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

  gcash: PaymentConfig;
  qrph: PaymentConfig;
};

type Method = "gcash" | "qrph";

export default function PaymentForm({
  token,
  customerName,
  mobileNumber,
  socialHandle,
  referenceCode,
  preferredDate,
  preferredTime,
  bookingTotal,
  remainingBalance,
  gcash,
  qrph,
}: PaymentFormProps) {
  const router = useRouter();

  const [method, setMethod] = useState<Method>("gcash");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const downPayment = Number(gcash.amount || 200);
  const qrphFee = Number(qrph.processingFee || 0);
  const qrphTotal = Number(
    qrph.totalPayable || downPayment + qrphFee
  );

 async function copyGcashNumber() {
  const number = String(gcash.gcash_number || "").trim();

  if (!number) return;

  try {
    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {
      await navigator.clipboard.writeText(number);
    } else {
      const textarea = document.createElement("textarea");

      textarea.value = number;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      textarea.setAttribute("readonly", "");

      document.body.appendChild(textarea);

      textarea.focus();
      textarea.select();

      const copiedSuccessfully =
        document.execCommand("copy");

      document.body.removeChild(textarea);

      if (!copiedSuccessfully) {
        throw new Error("Copy failed");
      }
    }

    setError("");
    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1800);
  } catch {
    setError(
      "Unable to copy automatically. Please press and hold the number to copy it."
    );
  }
}

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    setError("");

    const selected = event.target.files?.[0] || null;

    if (!selected) {
      setFile(null);
      return;
    }

    if (selected.size > 8 * 1024 * 1024) {
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

    if (!allowedTypes.includes(selected.type)) {
      setFile(null);
      setError(
        "Payment proof must be JPG, PNG, or HEIC."
      );
      return;
    }

    setFile(selected);
  }

  async function submitPayment() {
    setError("");

    if (!file) {
      setError("Please upload your payment proof first.");
      return;
    }

    setBusy(true);

    try {
      const data = new FormData();

      data.append("token", token);
      data.append("method", method);
      data.append("amount", String(downPayment));
      data.append("proof", file);

      const response = await fetch("/api/payment-proof", {
        method: "POST",
        body: data,
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to submit your payment proof."
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

      {/* =====================================================
          1 — BOOKING SUMMARY
          ===================================================== */}

      <section className="payment-section-clean">
  <div className="payment-section-label-clean">
    Booking Summary
  </div>

  <div className="payment-booking-summary-clean">

    <div className="payment-booking-info-clean">
      <span>Appointment</span>
      <strong>
        {preferredDate || "—"}
        {preferredTime
          ? ` · ${preferredTime}`
          : ""}
      </strong>
    </div>

    <div className="payment-booking-info-clean">
      <span>Booking Reference</span>
      <strong>
        {referenceCode || "—"}
      </strong>
    </div>

    <div className="payment-booking-amount-clean">
      <span>Amount Due</span>
      <strong>
        {peso(downPayment)}
      </strong>
    </div>

  </div>

  <p className="payment-booking-note-clean">
    A ₱200 down payment is required to secure your appointment.
  </p>
</section>

    

      {/* =====================================================
          3 — PAYMENT METHOD
          ===================================================== */}

      <section className="payment-section-clean">

        <div className="payment-section-label-clean">
          Payment method
        </div>

        <h2 className="payment-heading-clean">
          Choose your payment method
        </h2>

        <p className="payment-description-clean">
          Select one of the options below to view the
          payment details.
        </p>

        {/* SMALL METHOD PICKERS */}

        <div className="payment-picker-clean">

          <button
            type="button"
            className={`payment-picker-option payment-picker-gcash ${
              method === "gcash"
                ? "payment-picker-selected"
                : ""
            }`}
            onClick={() => setMethod("gcash")}
          >
            <span className="payment-picker-name">
              GCash
            </span>

            <span className="payment-picker-amount">
              {peso(downPayment)}
            </span>

            <span className="payment-picker-check">
              {method === "gcash" ? "✓" : ""}
            </span>
          </button>

          <button
            type="button"
            className={`payment-picker-option payment-picker-qrph ${
              method === "qrph"
                ? "payment-picker-selected"
                : ""
            }`}
            onClick={() => setMethod("qrph")}
          >
            <span className="payment-picker-name">
              QR PH
            </span>

            <span className="payment-picker-amount">
              {peso(qrphTotal)}
            </span>

            <span className="payment-picker-check">
              {method === "qrph" ? "✓" : ""}
            </span>
          </button>

        </div>

        {/* SELECTED PAYMENT DETAILS */}

        <div className="payment-details-clean">

          {method === "gcash" ? (
            <>
              <div className="payment-details-header">
                <div>
                  <span>Pay via</span>
                  <h3>GCash</h3>
                </div>

                <strong>
                  {peso(downPayment)}
                </strong>
              </div>

              <div className="payment-qr-clean">
                {gcash.gcash_qr ? (
                  <img
                    src={gcash.gcash_qr}
                    alt="GCash QR Code"
                  />
                ) : (
                  <div>
                    GCash QR has not been configured yet.
                  </div>
                )}
              </div>

              <div className="payment-account-clean">

                {gcash.gcash_name && (
                  <div>
                    <span>Account name</span>
                    <strong>
                      {gcash.gcash_name}
                    </strong>
                  </div>
                )}

                {gcash.gcash_number && (
                  <div>
                    <span>Account number</span>

                    <div className="payment-number-clean">
                      <strong>
                        {gcash.gcash_number}
                      </strong>

                      <button
                        type="button"
                        onClick={copyGcashNumber}
                      >
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                )}

              </div>

              <p className="payment-instruction-clean">
                Scan the QR code or send the exact
                down payment amount to the GCash account
                above.
              </p>
            </>
          ) : (
            <>
              <div className="payment-details-header">
                <div>
                  <span>Pay via</span>
                  <h3>QR PH</h3>
                </div>

                <strong>
                  {peso(qrphTotal)}
                </strong>
              </div>

              <div className="payment-qr-clean">
                {qrph.qrph_qr ? (
                  <img
                    src={qrph.qrph_qr}
                    alt="QR PH QR Code"
                  />
                ) : (
                  <div>
                    QR PH QR has not been configured yet.
                  </div>
                )}
              </div>

              <div className="payment-breakdown-clean">

                <div>
                  <span>Booking payment</span>
                  <strong>
                    {peso(downPayment)}
                  </strong>
                </div>

                <div>
                  <span>Processing fee</span>
                  <strong>
                    {peso(qrphFee)}
                  </strong>
                </div>

                <div>
                  <span>Total to pay</span>
                  <strong>
                    {peso(qrphTotal)}
                  </strong>
                </div>

              </div>

              <p className="payment-instruction-clean">
                Scan the QR code using your preferred
                banking or e-wallet app.
              </p>
            </>
          )}

        </div>
      </section>

      {/* =====================================================
          4 — PROOF OF PAYMENT
          ===================================================== */}

      <section className="payment-section-clean">

        <div className="payment-section-label-clean">
          Proof of payment
        </div>

        <h2 className="payment-heading-clean">
          Upload your Proof of Payment
        </h2>

        <p className="payment-description-clean">
          Upload a clear screenshot showing your
          successful payment.
        </p>

        <label
          className={`payment-upload-clean ${
            file
              ? "payment-upload-selected"
              : ""
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
            {file
              ? "Payment proof selected"
              : "Upload payment proof"}
          </strong>

          <span>
            {file
              ? file.name
              : "JPG, PNG, or HEIC · maximum 8MB"}
          </span>
        </label>

        {error && (
          <div
            className="payment-error-clean"
            role="alert"
          >
            {error}
          </div>
        )}

      </section>

      {/* =====================================================
          SUBMIT
          ===================================================== */}

      <button
        type="button"
        className="payment-submit-clean"
        disabled={busy || !file}
        onClick={submitPayment}
      >
        {busy
          ? "Submitting..."
          : "Submit Payment Proof"}
      </button>

      <p className="payment-submit-note-clean">
        Your payment proof will be reviewed by TheClawLab MNL before your booking is confirmed.
      </p>

    </div>
  );
}