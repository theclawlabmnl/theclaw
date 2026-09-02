"use client";

import { useState } from "react";

export default function BookingPaymentActions({
  token,
}: {
  token: string;
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const paymentPath = `/payment/${token}`;

  function getPaymentUrl() {
    if (typeof window === "undefined") {
      return paymentPath;
    }

    return new URL(
      paymentPath,
      window.location.origin
    ).toString();
  }

  async function handleCopy() {
    const paymentUrl = getPaymentUrl();

    setCopyError(false);

    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        window.isSecureContext
      ) {
        await navigator.clipboard.writeText(paymentUrl);

        setCopied(true);

        window.setTimeout(() => {
          setCopied(false);
        }, 1800);

        return;
      }

      const textarea =
        document.createElement("textarea");

      textarea.value = paymentUrl;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      textarea.style.opacity = "0";

      document.body.appendChild(textarea);

      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(
        0,
        textarea.value.length
      );

      const successful =
        document.execCommand("copy");

      document.body.removeChild(textarea);

      if (!successful) {
        throw new Error(
          "Clipboard copy failed"
        );
      }

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch (error) {
      console.error(
        "Failed to copy payment link:",
        error
      );

      setCopyError(true);

      window.setTimeout(() => {
        setCopyError(false);
      }, 2500);
    }
  }

  function openPaymentPage() {
    const paymentUrl = getPaymentUrl();

    window.open(
      paymentUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function openBusinessSuite() {
    window.open(
      "https://business.facebook.com/",
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 8,
        marginTop: 10,
      }}
    >
      <button
        type="button"
        onClick={handleCopy}
        className="btn"
        style={{
          width: "100%",
        }}
      >
        {copied
          ? "✓ Payment Link Copied"
          : copyError
            ? "Copy Failed"
            : "Copy Payment Link"}
      </button>

      <button
        type="button"
        onClick={openPaymentPage}
        className="btn secondary"
        style={{
          width: "100%",
        }}
      >
        Open Payment Page
      </button>

      <button
        type="button"
        onClick={openBusinessSuite}
        className="btn secondary"
        style={{
          width: "100%",
        }}
      >
        Open Business Suite
      </button>

      <div
        className="muted"
        style={{
          fontSize: 11,
          lineHeight: 1.4,
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        }}
      >
        {getPaymentUrl()}
      </div>

      {copyError && (
        <div
          className="notice"
          style={{
            fontSize: 12,
            lineHeight: 1.45,
          }}
        >
          Your browser blocked automatic
          copying. The payment link is shown
          above so you can copy it manually.
        </div>
      )}
    </div>
  );
}