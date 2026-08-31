"use client";

import { useState } from "react";

export default function CopyStatusLink() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copy this status link:", window.location.href);
    }
  };

  return (
    <button type="button" className="btn secondary" onClick={copy}>
      {copied ? "Link copied ✓" : "Copy status link"}
    </button>
  );
}
