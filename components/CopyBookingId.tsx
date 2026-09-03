"use client";

import { useRef, useState } from "react";

export default function CopyBookingId({
  value,
}: {
  value: string;
}) {
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function copyWithFallback(text: string) {
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Fall through to legacy fallback below.
      }
    }

    if (typeof document === "undefined") {
      return false;
    }

    const textarea = document.createElement("textarea");

    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";

    document.body.appendChild(textarea);

    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    let copiedSuccessfully = false;

    try {
      copiedSuccessfully = document.execCommand("copy");
    } catch {
      copiedSuccessfully = false;
    }

    document.body.removeChild(textarea);

    return copiedSuccessfully;
  }

  async function handleCopy() {
    if (!value) {
      return;
    }

    const success = await copyWithFallback(value);

    if (!success) {
      return;
    }

    setCopied(true);

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }

    resetTimerRef.current = setTimeout(() => {
      setCopied(false);
      resetTimerRef.current = null;
    }, 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="booking-copy-button"
      aria-label={
        copied
          ? `Booking ID ${value} copied`
          : `Copy booking ID ${value}`
      }
      title={copied ? "Copied" : "Copy booking ID"}
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}
