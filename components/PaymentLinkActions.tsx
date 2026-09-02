"use client";

import { useState } from "react";

type PaymentLinkActionsProps = {
  token: string;
  status: string;
};

export default function PaymentLinkActions({
  token,
  status,
}: PaymentLinkActionsProps) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const paymentPath = `/payment/${token}`;

  const getAbsoluteLink = () => {
    if (typeof window === "undefined") {
      return paymentPath;
    }

    return new URL(
      paymentPath,
      window.location.origin
    ).toString();
  };

  const showMessage = (text: string) => {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 2200);
  };

  const copyUsingFallback = (text: string) => {
    const textarea = document.createElement("textarea");

    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    textarea.setAttribute("readonly", "");

    document.body.appendChild(textarea);

    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    const copied = document.execCommand("copy");

    document.body.removeChild(textarea);

    return copied;
  };

  const copyLink = async () => {
    const link = getAbsoluteLink();

    setBusy(true);
    setMessage("");

    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        window.isSecureContext
      ) {
        await navigator.clipboard.writeText(link);

        showMessage("Payment link copied.");
        return;
      }

      const copied = copyUsingFallback(link);

      if (copied) {
        showMessage("Payment link copied.");
      } else {
        showMessage("Copy failed. Please copy the link below.");
      }
    } catch (error) {
      console.error("Copy payment link error:", error);

      try {
        const copied = copyUsingFallback(link);

        if (copied) {
          showMessage("Payment link copied.");
        } else {
          showMessage("Copy failed. Please copy the link below.");
        }
      } catch (fallbackError) {
        console.error(
          "Fallback copy payment link error:",
          fallbackError
        );

        showMessage("Copy failed. Please copy the link below.");
      }
    } finally {
      setBusy(false);
    }
  };

  const openPayment = () => {
    const link = getAbsoluteLink();

    window.open(
      link,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const openBusinessSuite = () => {
    window.open(
      "https://business.facebook.com/latest/inbox/all/",
      "_blank",
      "noopener,noreferrer"
    );
  };

  if (status !== "approved") {
    return null;
  }

  return (
    <div
      style={{
        marginTop: 18,
        paddingTop: 18,
        borderTop: "1px solid var(--line)",
      }}
    >
      <div className="kicker">
        Payment link
      </div>

      <p
        className="muted"
        style={{
          margin: "5px 0 12px",
          fontSize: 12,
          lineHeight: 1.5,
        }}
      >
        Send this link to the customer
        after approving the booking.
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <button
          type="button"
          className="btn secondary small"
          disabled={busy}
          onClick={copyLink}
        >
          {message === "Payment link copied."
            ? "COPIED!"
            : "COPY PAYMENT LINK"}
        </button>

        <button
          type="button"
          className="btn secondary small"
          disabled={busy}
          onClick={openPayment}
        >
          OPEN PAYMENT PAGE
        </button>

        <button
          type="button"
          className="btn small"
          disabled={busy}
          onClick={openBusinessSuite}
        >
          OPEN BUSINESS SUITE
        </button>
      </div>

      {message && (
        <div
          className="muted"
          style={{
            marginTop: 9,
            fontSize: 12,
          }}
        >
          {message}
        </div>
      )}

      <div
        className="muted"
        style={{
          marginTop: 9,
          fontSize: 11,
          lineHeight: 1.45,
          overflowWrap: "anywhere",
        }}
      >
        {getAbsoluteLink()}
      </div>
    </div>
  );
}