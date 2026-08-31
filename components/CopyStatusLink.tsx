"use client";

import {
  useState,
} from "react";

export default function CopyStatusLink() {
  const [
    copied,
    setCopied,
  ] = useState(false);

  const copyLink =
    async () => {
      try {
        await navigator.clipboard.writeText(
          window.location.href
        );

        setCopied(true);

        setTimeout(() => {
          setCopied(false);
        }, 2200);
      } catch {
        alert(
          "Unable to copy automatically. Please copy the link from your browser address bar."
        );
      }
    };

  return (
    <button
      type="button"
      className="btn secondary"
      onClick={copyLink}
    >
      {copied
        ? "Link copied ✓"
        : "Copy status link"}
    </button>
  );
}