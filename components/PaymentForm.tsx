"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const GCASH_AMOUNT = 200;

export default function PaymentForm({
  token,
  gcash,
  qrph,
}: {
  token: string;
  gcash: any;
  qrph: any;
}) {
  const router = useRouter();

  const [method, setMethod] =
    useState<"gcash" | "qrph">("gcash");

  const [file, setFile] =
    useState<File | null>(null);

  const [busy, setBusy] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const qrphFee = Number(
    qrph?.qrph_fee || 5
  );

  const amount =
    method === "gcash"
      ? GCASH_AMOUNT
      : GCASH_AMOUNT + qrphFee;

  const qr =
    method === "gcash"
      ? gcash?.gcash_qr
      : qrph?.qrph_qr;

  const copyGcashNumber =
    async () => {
      const number = String(
        gcash?.gcash_number || ""
      ).trim();

      if (!number) {
        setError(
          "The GCash account number has not been configured yet."
        );
        setMessage("");
        return;
      }

      try {
        await navigator.clipboard.writeText(
          number
        );

        setError("");
        setMessage(
          "GCash number copied."
        );
      } catch {
        setError(
          "Unable to copy automatically. Please copy the number manually."
        );
        setMessage("");
      }
    };

  const handleFileChange = (
    selectedFile:
      | File
      | null
  ) => {
    setError("");
    setMessage("");

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/heic",
      "image/heif",
    ];

    const maxSize =
      10 * 1024 * 1024;

    if (
      !allowedTypes.includes(
        selectedFile.type
      )
    ) {
      setError(
        "Please upload a JPG, JPEG, PNG, or HEIC image."
      );
      setFile(null);
      return;
    }

    if (
      selectedFile.size > maxSize
    ) {
      setError(
        "Payment proof must be 10MB or smaller."
      );
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const submit = async () => {
    if (!file || busy) {
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const data =
        new FormData();

      data.append(
        "token",
        token
      );

      data.append(
        "method",
        method
      );

      data.append(
        "amount",
        String(amount)
      );

      data.append(
        "proof",
        file
      );

      const response =
        await fetch(
          "/api/payment-proof",
          {
            method: "POST",
            body: data,
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Upload failed."
        );
      }

      router.push(
        `/status/${token}`
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to submit your payment proof."
      );
      setBusy(false);
    }
  };

  return (
    <div className="payment-form">
      {/* PAYMENT METHOD */}
      <div>
        <div className="kicker">
          Payment method
        </div>

        <h2
          className="serif"
          style={{
            margin:
              "4px 0 14px",
            fontSize: 28,
          }}
        >
          Choose how you'd like to pay
        </h2>

        <div
          className="payment-method-grid"
          role="radiogroup"
        >
          {/* GCASH */}
          <button
            type="button"
            className={
              method === "gcash"
                ? "payment-method active"
                : "payment-method"
            }
            onClick={() => {
              setMethod("gcash");
              setError("");
              setMessage("");
            }}
            aria-pressed={
              method === "gcash"
            }
          >
            <span className="payment-method-top">
              <span>
                <strong>
                  GCash
                </strong>

                <small>
                  Instant e-wallet transfer
                </small>
              </span>

              <span className="payment-price">
                ₱200
              </span>
            </span>

            <span className="payment-radio">
              {method === "gcash"
                ? "●"
                : "○"}
            </span>
          </button>

          {/* QR PH */}
          <button
            type="button"
            className={
              method === "qrph"
                ? "payment-method active"
                : "payment-method"
            }
            onClick={() => {
              setMethod("qrph");
              setError("");
              setMessage("");
            }}
            aria-pressed={
              method === "qrph"
            }
          >
            <span className="payment-method-top">
              <span>
                <strong>
                  QR PH
                </strong>

                <small>
                  ₱5 processing fee included
                </small>
              </span>

              <span className="payment-price">
                ₱{amount}
              </span>
            </span>

            <span className="payment-radio">
              {method === "qrph"
                ? "●"
                : "○"}
            </span>
          </button>
        </div>
      </div>

      {/* PAYMENT DETAILS */}
      <div
        className="payment-display card"
        style={{
          marginTop: 18,
        }}
      >
        <div
          style={{
            textAlign: "center",
          }}
        >
          <div className="kicker">
            {method === "gcash"
              ? "GCash"
              : "QR PH"}
          </div>

          <h3
            className="serif"
            style={{
              margin:
                "4px 0 5px",
              fontSize: 25,
            }}
          >
            Pay ₱{amount}
          </h3>

          <p
            className="muted"
            style={{
              marginTop: 0,
            }}
          >
            Scan the QR code using
            your preferred banking or
            e-wallet app.
          </p>
        </div>

        {/* QR IMAGE */}
        <div
          className="payment-qr-wrap"
          style={{
            margin:
              "20px auto",
          }}
        >
          {qr ? (
            <img
              src={qr}
              alt={`${method === "gcash" ? "GCash" : "QR PH"} QR code`}
              className="payment-qr"
            />
          ) : (
            <div
              className="notice"
              style={{
                width: "100%",
                textAlign:
                  "center",
              }}
            >
              This payment QR has not
              been configured yet.
              Please contact the studio.
            </div>
          )}
        </div>

        {/* GCASH ACCOUNT DETAILS */}
        {method === "gcash" && (
          <div className="gcash-details">
            {gcash?.gcash_name && (
              <div className="gcash-detail-row">
                <span className="muted">
                  Account name
                </span>

                <strong>
                  {gcash.gcash_name}
                </strong>
              </div>
            )}

            {gcash?.gcash_number && (
              <div className="gcash-detail-row">
                <span className="muted">
                  GCash number
                </span>

                <div
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "space-between",
                    gap: 10,
                  }}
                >
                  <strong
                    style={{
                      wordBreak:
                        "break-word",
                    }}
                  >
                    {gcash.gcash_number}
                  </strong>

                  <button
                    type="button"
                    className="btn secondary small"
                    onClick={
                      copyGcashNumber
                    }
                    style={{
                      flex:
                        "0 0 auto",
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div
          className="notice"
          style={{
            marginTop: 18,
          }}
        >
          Please make the payment first,
          then upload your payment
          screenshot below.
        </div>
      </div>

      {/* PROOF */}
      <div
        style={{
          marginTop: 25,
        }}
      >
        <div className="kicker">
          Proof of payment
        </div>

        <h2
          className="serif"
          style={{
            margin:
              "4px 0 8px",
            fontSize: 28,
          }}
        >
          Upload your payment screenshot
        </h2>

        <p
          className="muted"
          style={{
            marginTop: 0,
          }}
        >
          Please upload a clear screenshot
          showing that your payment was
          completed.
        </p>

        <div className="field">
          <label>
            Payment screenshot
          </label>

          <input
            type="file"
            accept=".jpg,.jpeg,.png,.heic,image/jpeg,image/png,image/heic,image/heif"
            onChange={(event) =>
              handleFileChange(
                event.target.files?.[0] ||
                  null
              )
            }
          />

          {file && (
            <p
              className="muted"
              style={{
                marginTop: 8,
                fontSize: 12,
              }}
            >
              Selected:
              {" "}
              <strong>
                {file.name}
              </strong>
            </p>
          )}
        </div>
      </div>

      {error && (
        <div
          className="notice"
          style={{
            marginTop: 15,
          }}
        >
          {error}
        </div>
      )}

      {message && (
        <div
          className="notice"
          style={{
            marginTop: 15,
          }}
        >
          {message}
        </div>
      )}

      {/* SUBMIT */}
      <button
        type="button"
        className="btn"
        disabled={!file || busy}
        onClick={submit}
        style={{
          width: "100%",
          marginTop: 20,
        }}
      >
        {busy
          ? "Submitting…"
          : "SUBMIT PAYMENT PROOF"}
      </button>
    </div>
  );
}