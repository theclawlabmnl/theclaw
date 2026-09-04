"use client";

import { useMemo, useState } from "react";

const MAX_QR_SIZE = 5 * 1024 * 1024;

type PaymentMethod = {
  id: string;
  name: string;
  account_name: string;
  account_details: string;
  instructions: string;
  processing_fee: number | string;
  qr_url: string;
  active: boolean;
};

function isValidQrFile(file: File) {
  return (
    ["image/jpeg", "image/png", "image/webp"].includes(file.type) &&
    file.size <= MAX_QR_SIZE
  );
}

function makeId(name = "payment") {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${base || "payment"}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

function initialMethods(settings: any): PaymentMethod[] {
  try {
    const parsed =
      typeof settings.payment_methods === "string"
        ? JSON.parse(settings.payment_methods)
        : settings.payment_methods;

    if (Array.isArray(parsed) && parsed.length) {
      return parsed.map((item: any) => ({
        id: String(item.id || makeId(item.name)),
        name: String(item.name || ""),
        account_name: String(item.account_name || ""),
        account_details: String(item.account_details || ""),
        instructions: String(item.instructions || ""),
        processing_fee: Number(item.processing_fee || 0),
        qr_url: String(item.qr_url || ""),
        active: item.active !== false,
      }));
    }
  } catch {}

  return [
    {
      id: "gcash",
      name: "GCash",
      account_name: String(settings.gcash_name || ""),
      account_details: String(settings.gcash_number || ""),
      instructions:
        "Scan the QR code or send the exact down payment amount to the GCash account above.",
      processing_fee: 0,
      qr_url: String(settings.gcash_qr || ""),
      active: true,
    },
    {
      id: "qrph",
      name: "QR PH",
      account_name: "",
      account_details: "",
      instructions:
        "Scan the QR code using your preferred banking or e-wallet app.",
      processing_fee:
        Number(settings.qrph_fee ?? 5) >= 0
          ? Number(settings.qrph_fee ?? 5)
          : 5,
      qr_url: String(settings.qrph_qr || ""),
      active: true,
    },
  ];
}

export default function SettingsForm({
  settings,
}: {
  settings: any;
}) {
  const [methods, setMethods] = useState<PaymentMethod[]>(() =>
    initialMethods(settings)
  );
  const [qrFiles, setQrFiles] = useState<Record<string, File>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [terms, setTerms] = useState(String(settings.terms || ""));
  const [removalOptions, setRemovalOptions] = useState(
    String(settings.removal_options || "")
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeCount = useMemo(
    () => methods.filter((method) => method.active).length,
    [methods]
  );

  function updateMethod(
    id: string,
    key: keyof PaymentMethod,
    value: string | number | boolean
  ) {
    setMethods((current) =>
      current.map((method) =>
        method.id === id ? { ...method, [key]: value } : method
      )
    );
  }

  function addMethod() {
    const id = makeId("payment");

    setMethods((current) => [
      ...current,
      {
        id,
        name: "",
        account_name: "",
        account_details: "",
        instructions: "",
        processing_fee: 0,
        qr_url: "",
        active: true,
      },
    ]);

    setMessage("");
    setError("");
  }

  function removeMethod(id: string) {
    if (methods.length <= 1) {
      setError("Please keep at least one payment method.");
      return;
    }

    setMethods((current) => current.filter((method) => method.id !== id));
    setQrFiles((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setPreviews((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function handleQrFile(id: string, file: File | null) {
    if (!file) return;

    if (!isValidQrFile(file)) {
      setError("Please upload a JPG, PNG, or WEBP image up to 5MB.");
      return;
    }

    setError("");
    setMessage("");
    setQrFiles((current) => ({ ...current, [id]: file }));
    setPreviews((current) => ({
      ...current,
      [id]: URL.createObjectURL(file),
    }));
  }

  async function save() {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (!methods.length) {
        throw new Error("Please add at least one payment method.");
      }

      if (methods.some((method) => !method.name.trim())) {
        throw new Error("Every payment method needs a name.");
      }

      if (activeCount === 0) {
        throw new Error("Please keep at least one payment method active.");
      }

      const normalized = methods.map((method) => ({
        ...method,
        name: method.name.trim(),
        account_name: method.account_name.trim(),
        account_details: method.account_details.trim(),
        instructions: method.instructions.trim(),
        processing_fee: Math.max(0, Number(method.processing_fee || 0)),
      }));

      const formData = new FormData();

      formData.append(
        "settings",
        JSON.stringify({
          payment_methods: normalized,
          terms,
          removal_options: removalOptions,
        })
      );

      for (const method of normalized) {
        const file = qrFiles[method.id];
        if (file) {
          formData.append(`payment_qr__${method.id}`, file);
        }
      }

      const response = await fetch("/api/admin/settings", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to save settings.");
      }

      if (Array.isArray(result.paymentMethods)) {
        setMethods(result.paymentMethods);
      }

      setQrFiles({});
      setPreviews({});
      setMessage(
        "Settings saved. Active payment methods are now updated on customer payment links."
      );
    } catch (saveError: any) {
      setError(saveError?.message || "Unable to save settings.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 28 }}>
        <div className="kicker">Payment settings</div>
        <h2 className="serif" style={{ margin: "5px 0 8px" }}>
          Payment Methods
        </h2>
        <p className="muted">
          Add and manage the payment methods customers can use. Active methods
          automatically appear on customer payment links.
        </p>
      </div>

      <div style={{ display: "grid", gap: 18 }}>
        {methods.map((method, index) => {
          const preview = previews[method.id] || method.qr_url;

          return (
            <section
              key={method.id}
              style={{
                border: "1px solid var(--line)",
                borderRadius: 16,
                padding: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                  marginBottom: 18,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div className="kicker">Payment method {index + 1}</div>
                  <strong>{method.name || "New payment method"}</strong>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      fontSize: 13,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={method.active}
                      onChange={(event) =>
                        updateMethod(method.id, "active", event.target.checked)
                      }
                    />
                    Active
                  </label>

                  <button
                    type="button"
                    className="btn secondary small"
                    onClick={() => removeMethod(method.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="field">
                <label>Payment method name</label>
                <input
                  value={method.name}
                  placeholder="Example: Maya or BDO Bank Transfer"
                  onChange={(event) =>
                    updateMethod(method.id, "name", event.target.value)
                  }
                />
              </div>

              <div className="inline-grid">
                <div className="field">
                  <label>Account name</label>
                  <input
                    value={method.account_name}
                    placeholder="Optional"
                    onChange={(event) =>
                      updateMethod(
                        method.id,
                        "account_name",
                        event.target.value
                      )
                    }
                  />
                </div>

                <div className="field">
                  <label>Account number / payment details</label>
                  <input
                    value={method.account_details}
                    placeholder="Optional"
                    onChange={(event) =>
                      updateMethod(
                        method.id,
                        "account_details",
                        event.target.value
                      )
                    }
                  />
                </div>
              </div>

              <div className="field">
                <label>Processing fee</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={method.processing_fee}
                  onChange={(event) =>
                    updateMethod(
                      method.id,
                      "processing_fee",
                      event.target.value
                    )
                  }
                />
                <p className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                  Leave at 0 if this payment method has no processing fee.
                </p>
              </div>

              <div className="field">
                <label>Payment instructions</label>
                <textarea
                  style={{ minHeight: 120 }}
                  value={method.instructions}
                  placeholder="Instructions customers will see after selecting this payment method."
                  onChange={(event) =>
                    updateMethod(
                      method.id,
                      "instructions",
                      event.target.value
                    )
                  }
                />
              </div>

              <div style={{ marginTop: 18 }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  QR / payment image
                </label>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(0, 180px) minmax(0, 1fr)",
                    gap: 20,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "1 / 1",
                      border: "1px solid var(--line)",
                      borderRadius: 14,
                      background: "var(--soft)",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {preview ? (
                      <img
                        src={preview}
                        alt={`${method.name || "Payment"} QR`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                      />
                    ) : (
                      <span className="muted">No image uploaded</span>
                    )}
                  </div>

                  <div>
                    <input
                      id={`payment-qr-${method.id}`}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      onChange={(event) =>
                        handleQrFile(
                          method.id,
                          event.target.files?.[0] || null
                        )
                      }
                      style={{ display: "none" }}
                    />

                    <label
                      htmlFor={`payment-qr-${method.id}`}
                      className="btn secondary small"
                      style={{ display: "inline-flex", cursor: "pointer" }}
                    >
                      {preview ? "Change image" : "Upload image"}
                    </label>

                    <p
                      className="muted"
                      style={{ marginTop: 10, fontSize: 12 }}
                    >
                      Optional · JPG, PNG, or WEBP · maximum 5MB.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <button
        type="button"
        className="btn secondary"
        onClick={addMethod}
        style={{ marginTop: 18 }}
      >
        + Add Payment Method
      </button>

      <section
        style={{
          paddingTop: 30,
          marginTop: 30,
          borderTop: "1px solid var(--line)",
        }}
      >
        <div className="kicker">Studio settings</div>
        <h3 style={{ marginTop: 4, marginBottom: 18 }}>Policies</h3>

        <div className="field">
          <label>Terms &amp; Conditions</label>
          <textarea
            style={{ minHeight: 220 }}
            value={terms}
            onChange={(event) => setTerms(event.target.value)}
          />
        </div>

        <div className="field">
          <label>
            Removal options{" "}
            <span className="muted">(one per line)</span>
          </label>
          <textarea
            value={removalOptions}
            onChange={(event) => setRemovalOptions(event.target.value)}
          />
        </div>
      </section>

      {error && (
        <div className="notice" style={{ marginTop: 18 }}>
          {error}
        </div>
      )}

      {message && (
        <div className="notice" style={{ marginTop: 18 }}>
          {message}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: 22,
        }}
      >
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={save}
        >
          {busy ? "Saving…" : "Save settings"}
        </button>
      </div>
    </div>
  );
}
