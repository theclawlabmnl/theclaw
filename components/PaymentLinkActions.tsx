"use client";

import { useState } from "react";

export default function PaymentLinkActions({
  token,
  status,
}: {
  token: string;
  status: string;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  // Payment is only available once the booking is approved.
  if (status !== "approved") {
    return null;
  }

  const getPaymentLink = () =>
    `${window.location.origin}/payment/${token}`;

  const copyPaymentLink = async () => {
    const link = getPaymentLink();

    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2200);
    } catch {
      window.prompt(
        "Copy this payment link:",
        link
      );
    }
  };

  const sharePaymentLink = async () => {
    const link = getPaymentLink();

    try {
      setBusy(true);

      if (
        typeof navigator.share === "function"
      ) {
        await navigator.share({
          title:
            "The Claw Lab MNL — Payment Link",
          text:
            "Here is your The Claw Lab MNL payment link:",
          url: link,
        });

        return;
      }

      await navigator.clipboard.writeText(
        link
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2200);
    } catch {
      // User may simply cancel the share sheet.
    } finally {
      setBusy(false);
    }
  };

  const openMessenger = () => {
    window.open(
      "https://m.me/theclawlabmnl",
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div
      className="actions"
      style={{
        marginTop: 8,
        flexWrap: "wrap",
      }}
    >
      <button
        type="button"
        className="btn small secondary"
        onClick={copyPaymentLink}
      >
        {copied
          ? "PAYMENT LINK COPIED ✓"
          : "COPY PAYMENT LINK"}
      </button>

      <button
        type="button"
        className="btn small secondary"
        disabled={busy}
        onClick={sharePaymentLink}
      >
        {busy
          ? "SHARING…"
          : "SHARE PAYMENT LINK"}
      </button>

      <button
        type="button"
        className="btn small secondary"
        onClick={openMessenger}
      >
        OPEN MESSENGER
      </button>
    </div>
  );
}