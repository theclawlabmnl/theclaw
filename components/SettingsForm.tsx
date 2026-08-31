"use client";

import { useState } from "react";

const MAX_QR_SIZE = 5 * 1024 * 1024;

function isValidQrFile(file: File) {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  return (
    allowedTypes.includes(file.type) &&
    file.size <= MAX_QR_SIZE
  );
}

export default function SettingsForm({
  settings,
}: {
  settings: any;
}) {
  const [v, setV] = useState({
    ...settings,
    qrph_fee:
      settings.qrph_fee !== undefined
        ? settings.qrph_fee
        : 5,
  });

  const [gcashQrFile, setGcashQrFile] =
    useState<File | null>(null);

  const [qrphQrFile, setQrphQrFile] =
    useState<File | null>(null);

  const [gcashPreview, setGcashPreview] =
    useState<string>(settings.gcash_qr || "");

  const [qrphPreview, setQrphPreview] =
    useState<string>(settings.qrph_qr || "");

  const [busy, setBusy] = useState(false);
  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const update = (
    key: string,
    value: string
  ) => {
    setV((current: any) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleQrFile = (
    type: "gcash" | "qrph",
    file: File | null
  ) => {
    if (!file) return;

    if (!isValidQrFile(file)) {
      setError(
        "Please upload a JPG, PNG, or WEBP image up to 5MB."
      );
      return;
    }

    setError("");
    setMessage("");

    const previewUrl =
      URL.createObjectURL(file);

    if (type === "gcash") {
      setGcashQrFile(file);
      setGcashPreview(previewUrl);
    } else {
      setQrphQrFile(file);
      setQrphPreview(previewUrl);
    }
  };

  const copyGcashNumber = async () => {
    const number = String(
      v.gcash_number || ""
    ).trim();

    if (!number) {
      setError(
        "Please enter the GCash account number first."
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(
        number
      );

      setError("");
      setMessage(
        "GCash number copied to clipboard."
      );
    } catch {
      setError(
        "Unable to copy automatically. Please copy the number manually."
      );
    }
  };

  const save = async () => {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();

      formData.append(
        "settings",
        JSON.stringify({
          gcash_name:
            v.gcash_name || "",

          gcash_number:
            v.gcash_number || "",

          qrph_fee:
            String(v.qrph_fee || 5),

          terms:
            v.terms || "",

          removal_options:
            v.removal_options || "",
        })
      );

      if (gcashQrFile) {
        formData.append(
          "gcash_qr",
          gcashQrFile
        );
      }

      if (qrphQrFile) {
        formData.append(
          "qrph_qr",
          qrphQrFile
        );
      }

      const response = await fetch(
        "/api/admin/settings",
        {
          method: "POST",
          body: formData,
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to save settings."
        );
      }

      if (result.settings) {
        setV((current: any) => ({
          ...current,
          ...result.settings,
        }));

        if (result.settings.gcash_qr) {
          setGcashPreview(
            result.settings.gcash_qr
          );
        }

        if (result.settings.qrph_qr) {
          setQrphPreview(
            result.settings.qrph_qr
          );
        }
      }

      setGcashQrFile(null);
      setQrphQrFile(null);

      setMessage(
        "Settings saved successfully."
      );
    } catch (error: any) {
      setError(
        error?.message ||
          "Unable to save settings."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="card"
      style={{
        maxWidth: 900,
      }}
    >
      <div
        style={{
          marginBottom: 28,
        }}
      >
        <div className="kicker">
          Payment settings
        </div>

        <h2
          className="serif"
          style={{ margin: "5px 0 8px" }}
        >
          Payment Methods
        </h2>

        <p className="muted">
          Manage your GCash and QR PH payment
          details and QR images.
        </p>
      </div>

      {/* GCASH */}
      <section
        style={{
          paddingBottom: 30,
          marginBottom: 30,
          borderBottom:
            "1px solid var(--line)",
        }}
      >
        <div className="kicker">
          GCash
        </div>

        <h3
          style={{
            marginTop: 4,
            marginBottom: 18,
          }}
        >
          GCash payment details
        </h3>

        <div className="inline-grid">
          <div className="field">
            <label>
              Account name
            </label>

            <input
              value={
                v.gcash_name || ""
              }
              onChange={(event) =>
                update(
                  "gcash_name",
                  event.target.value
                )
              }
            />
          </div>

          <div className="field">
            <label>
              Account number
            </label>

            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "stretch",
              }}
            >
              <input
                inputMode="numeric"
                value={
                  v.gcash_number || ""
                }
                onChange={(event) =>
                  update(
                    "gcash_number",
                    event.target.value
                  )
                }
                style={{
                  flex: 1,
                  minWidth: 0,
                }}
              />

              <button
                type="button"
                className="btn secondary small"
                onClick={
                  copyGcashNumber
                }
                style={{
                  flex:
                    "0 0 auto",
                  whiteSpace:
                    "nowrap",
                }}
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
          }}
        >
          <label
            style={{
              display: "block",
              marginBottom: 8,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            GCash QR code
          </label>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(0, 220px) minmax(0, 1fr)",
              gap: 20,
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                border:
                  "1px solid var(--line)",
                borderRadius: 14,
                background:
                  "var(--soft)",
                overflow: "hidden",
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
              }}
            >
              {gcashPreview ? (
                <img
                  src={gcashPreview}
                  alt="GCash QR code"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit:
                      "contain",
                  }}
                />
              ) : (
                <span className="muted">
                  No QR uploaded
                </span>
              )}
            </div>

            <div>
              <input
                id="gcash-qr-upload"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  handleQrFile(
                    "gcash",
                    event.target.files?.[0] ||
                      null
                  )
                }
                style={{
                  display: "none",
                }}
              />

              <label
                htmlFor="gcash-qr-upload"
                className="btn secondary small"
                style={{
                  display:
                    "inline-flex",
                  cursor: "pointer",
                }}
              >
                {gcashQrFile
                  ? "Change QR image"
                  : "Upload GCash QR"}
              </label>

              <p
                className="muted"
                style={{
                  marginTop: 10,
                  fontSize: 12,
                }}
              >
                JPG, PNG, or WEBP ·
                maximum 5MB.
              </p>

              {gcashQrFile && (
                <p
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                  }}
                >
                  New image selected:
                  {" "}
                  <strong>
                    {gcashQrFile.name}
                  </strong>
                </p>
              )}
            </div>
          </div>
        </div>

        <div
          className="notice"
          style={{
            marginTop: 18,
          }}
        >
          Customers can use the account
          number or scan the QR code.
        </div>
      </section>

      {/* QR PH */}
      <section
        style={{
          paddingBottom: 30,
          marginBottom: 30,
          borderBottom:
            "1px solid var(--line)",
        }}
      >
        <div className="kicker">
          QR PH
        </div>

        <h3
          style={{
            marginTop: 4,
            marginBottom: 18,
          }}
        >
          QR PH payment details
        </h3>

        <div className="field">
          <label>
            Processing fee
          </label>

          <input
            type="number"
            min="0"
            step="0.01"
            value={
              v.qrph_fee ?? 5
            }
            onChange={(event) =>
              update(
                "qrph_fee",
                event.target.value
              )
            }
          />

          <p
            className="muted"
            style={{
              marginTop: 6,
              fontSize: 12,
            }}
          >
            The QR PH down payment
            includes this processing fee.
          </p>
        </div>

        <div
          style={{
            marginTop: 18,
          }}
        >
          <label
            style={{
              display: "block",
              marginBottom: 8,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            QR PH QR code
          </label>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(0, 220px) minmax(0, 1fr)",
              gap: 20,
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                border:
                  "1px solid var(--line)",
                borderRadius: 14,
                background:
                  "var(--soft)",
                overflow: "hidden",
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
              }}
            >
              {qrphPreview ? (
                <img
                  src={qrphPreview}
                  alt="QR PH QR code"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit:
                      "contain",
                  }}
                />
              ) : (
                <span className="muted">
                  No QR uploaded
                </span>
              )}
            </div>

            <div>
              <input
                id="qrph-qr-upload"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  handleQrFile(
                    "qrph",
                    event.target.files?.[0] ||
                      null
                  )
                }
                style={{
                  display: "none",
                }}
              />

              <label
                htmlFor="qrph-qr-upload"
                className="btn secondary small"
                style={{
                  display:
                    "inline-flex",
                  cursor: "pointer",
                }}
              >
                {qrphQrFile
                  ? "Change QR image"
                  : "Upload QR PH QR"}
              </label>

              <p
                className="muted"
                style={{
                  marginTop: 10,
                  fontSize: 12,
                }}
              >
                JPG, PNG, or WEBP ·
                maximum 5MB.
              </p>

              {qrphQrFile && (
                <p
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                  }}
                >
                  New image selected:
                  {" "}
                  <strong>
                    {qrphQrFile.name}
                  </strong>
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* POLICIES */}
      <section
        style={{
          paddingBottom: 10,
        }}
      >
        <div className="kicker">
          Studio settings
        </div>

        <h3
          style={{
            marginTop: 4,
            marginBottom: 18,
          }}
        >
          Policies
        </h3>

        <div className="field">
          <label>
            Terms &amp; Conditions
          </label>

          <textarea
            style={{
              minHeight: 220,
            }}
            value={v.terms || ""}
            onChange={(event) =>
              update(
                "terms",
                event.target.value
              )
            }
          />
        </div>

        <div className="field">
          <label>
            Removal options
            {" "}
            <span className="muted">
              (one per line)
            </span>
          </label>

          <textarea
            value={
              v.removal_options || ""
            }
            onChange={(event) =>
              update(
                "removal_options",
                event.target.value
              )
            }
          />
        </div>
      </section>

      {error && (
        <div
          className="notice"
          style={{
            marginTop: 18,
          }}
        >
          {error}
        </div>
      )}

      {message && (
        <div
          className="notice"
          style={{
            marginTop: 18,
          }}
        >
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
          {busy
            ? "Saving…"
            : "Save settings"}
        </button>
      </div>
    </div>
  );
}