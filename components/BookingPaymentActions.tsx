"use client";

import { useMemo, useState } from "react";

type Props = {
  token: string;
};

export default function BookingPaymentActions({
  token,
}: Props) {
  const [copied, setCopied] = useState(false);

  const paymentPath = useMemo(
    () =>
      `/payment/${encodeURIComponent(
        token
      )}`,
    [token]
  );

  function getPaymentUrl() {
    if (typeof window === "undefined") {
      return paymentPath;
    }

    return `${window.location.origin}${paymentPath}`;
  }

  async function copyPaymentLink() {
    const text = getPaymentUrl();

    try {
      // Modern Clipboard API when available.
      if (
        navigator.clipboard &&
        window.isSecureContext
      ) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for localhost / HTTP / browsers where
        // navigator.clipboard is unavailable.
        const textarea =
          document.createElement("textarea");

        textarea.value = text;
        textarea.setAttribute("readonly", "");
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
          throw new Error("Copy command failed");
        }
      }

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch (error) {
      console.error(
        "Unable to copy payment link:",
        error
      );

      // Final fallback: select an invisible temporary input and
      // execute copy again during the same user click.
      try {
        const input =
          document.createElement("input");

        input.type = "text";
        input.value = text;
        input.style.position = "fixed";
        input.style.left = "-9999px";
        input.style.top = "0";

        document.body.appendChild(input);

        input.focus();
        input.select();

        document.execCommand("copy");

        document.body.removeChild(input);

        setCopied(true);

        window.setTimeout(() => {
          setCopied(false);
        }, 1800);
      } catch (fallbackError) {
        console.error(
          "Clipboard fallback failed:",
          fallbackError
        );
      }
    }
  }

  function openPaymentPage() {
    window.open(
      paymentPath,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function openBusinessSuite() {
    window.open(
      "https://business.facebook.com/latest/inbox/all",
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div className="payment-link-actions">
      <button
        type="button"
        className="payment-link-button"
        onClick={copyPaymentLink}
      >
        {copied
          ? "✓ Payment Link Copied"
          : "Copy Payment Link"}
      </button>

      <button
        type="button"
        className="payment-link-button"
        onClick={openPaymentPage}
      >
        Open Payment Page
      </button>

      <button
        type="button"
        className="payment-link-button"
        onClick={openBusinessSuite}
      >
        Open Business Suite
      </button>

      <style jsx>{`
        .payment-link-actions {
          display: grid;
          gap: 8px;
          width: 100%;
          min-width: 0;
        }

        .payment-link-button {
          width: 100%;
          min-height: 42px;
          box-sizing: border-box;
          padding: 10px 14px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #fff;
          color: #111;
          font-family: inherit;
          font-size: 14px;
          font-weight: 600;
          line-height: 1.2;
          text-align: center;
          cursor: pointer;
        }

        .payment-link-button:hover {
          background: #f7f7f7;
        }

        @media (max-width: 600px) {
          .payment-link-button {
            min-height: 44px;
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}
