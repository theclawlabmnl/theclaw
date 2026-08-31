"use client";

import { useState } from "react";

function fallbackCopy(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }

  document.body.removeChild(textarea);
  return copied;
}

export default function PaymentLinkActions({
  token,
  status,
}: {
  token: string;
  status: string;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  if (status !== "approved") {
    return null;
  }

  const getLink = () =>
    new URL(`/payment/${token}`, window.location.origin).toString();

  const flash = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2200);
  };

  const copyLink = async () => {
    const link = getLink();
    let copied = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied) {
      copied = fallbackCopy(link);
    }

    if (copied) {
      flash("Payment link copied ✓");
    } else {
      window.prompt("Copy this payment link:", link);
    }
  };

  const shareLink = async () => {
    const link = getLink();

    setBusy(true);
    try {
      if (navigator.share) {
        await navigator.share({
          title: "The Claw Lab MNL · Payment Link",
          text: "Here is your payment link from The Claw Lab MNL:",
          url: link,
        });
        return;
      }

      let copied = false;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(link);
          copied = true;
        }
      } catch {
        copied = false;
      }

      if (!copied) copied = fallbackCopy(link);
      if (copied) flash("Payment link copied ✓");
      else window.prompt("Copy this payment link:", link);
    } catch {
      // The share sheet was cancelled or unavailable.
    } finally {
      setBusy(false);
    }
  };

  const openBusinessSuite = () => {
    window.location.assign("https://business.facebook.com/latest/inbox/all");
  };

  const link = getLink();

  return (
    <div className="payment-link-box">
      <div className="kicker">Customer payment link</div>
      <div className="payment-link-row">
        <input
          aria-label="Customer payment link"
          value={link}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
        />
        <button type="button" className="btn small" onClick={copyLink}>
          Copy
        </button>
      </div>

      <div className="actions payment-link-actions">
        <button type="button" className="btn small secondary" onClick={shareLink} disabled={busy}>
          {busy ? "Sharing…" : "Share"}
        </button>
        <button
          type="button"
          className="btn small secondary"
          onClick={openBusinessSuite}
        >
          Business Suite
        </button>
      </div>

      {message && <div className="payment-link-message">{message}</div>}
    </div>
  );
}
