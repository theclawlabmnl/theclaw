"use client";

import {
  FormEvent,
  useState,
} from "react";

import { useRouter } from "next/navigation";

export default function StatusPage() {
  const router = useRouter();

  const [mode, setMode] = useState<
    "reference" | "details"
  >("reference");

  const [referenceCode, setReferenceCode] =
    useState("");

  const [customerName, setCustomerName] =
    useState("");

  const [mobileNumber, setMobileNumber] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const body =
        mode === "reference"
          ? {
              reference_code:
                referenceCode.trim(),
            }
          : {
              customer_name:
                customerName.trim(),
              mobile_number:
                mobileNumber.trim(),
            };

      const response = await fetch(
        "/api/status-lookup",
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const result =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to find your booking."
        );
      }

      const bookings =
        Array.isArray(
          result.bookings
        )
          ? result.bookings
          : [];

      if (
        bookings.length === 0
      ) {
        throw new Error(
          "We couldn't find your booking."
        );
      }

      /*
       * If there is exactly one booking,
       * go directly to its status page.
       */
      if (
        bookings.length === 1 &&
        bookings[0]?.token
      ) {
        router.push(
          `/status/${bookings[0].token}`
        );

        return;
      }

      /*
       * If multiple bookings match,
       * store the result in sessionStorage
       * and let the selection page display them.
       */
      sessionStorage.setItem(
        "booking-status-results",
        JSON.stringify(bookings)
      );

      router.push(
        "/status/results"
      );
    } catch (
      error: any
    ) {
      setError(
        error?.message ||
          "Unable to find your booking."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="form-page">
      <div
        className="container"
        style={{
          maxWidth: 620,
        }}
      >
        <div
          className="card"
          style={{
            padding: 30,
          }}
        >
          <div className="kicker">
            Booking status
          </div>

          <h1
            className="serif"
            style={{
              margin:
                "7px 0 10px",
              fontSize: 42,
            }}
          >
            Check your appointment
          </h1>

          <p
            className="muted"
            style={{
              lineHeight: 1.6,
              marginBottom: 24,
            }}
          >
            Enter your booking ID, or use
            your exact full name and phone
            number to view your appointment
            status.
          </p>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 22,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className={
                mode === "reference"
                  ? "btn small"
                  : "btn secondary small"
              }
              onClick={() => {
                setMode("reference");
                setError("");
              }}
            >
              BOOKING ID
            </button>

            <button
              type="button"
              className={
                mode === "details"
                  ? "btn small"
                  : "btn secondary small"
              }
              onClick={() => {
                setMode("details");
                setError("");
              }}
            >
              NAME + PHONE
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
          >
            {mode ===
              "reference" ? (
              <div className="field">
                <label htmlFor="reference_code">
                  Booking ID
                </label>

                <input
                  id="reference_code"
                  value={
                    referenceCode
                  }
                  onChange={(
                    event
                  ) =>
                    setReferenceCode(
                      event.target
                        .value
                    )
                  }
                  placeholder="Enter your booking ID"
                  autoComplete="off"
                />
              </div>
            ) : (
              <>
                <div className="field">
                  <label htmlFor="customer_name">
                    Exact full name
                  </label>

                  <input
                    id="customer_name"
                    value={
                      customerName
                    }
                    onChange={(
                      event
                    ) =>
                      setCustomerName(
                        event.target
                          .value
                      )
                    }
                    placeholder="Enter the name used for your booking"
                    autoComplete="name"
                  />
                </div>

                <div
                  className="field"
                  style={{
                    marginTop: 14,
                  }}
                >
                  <label htmlFor="mobile_number">
                    Phone number
                  </label>

                  <input
                    id="mobile_number"
                    value={
                      mobileNumber
                    }
                    onChange={(
                      event
                    ) =>
                      setMobileNumber(
                        event.target
                          .value
                      )
                    }
                    placeholder="Enter the phone number used for your booking"
                    autoComplete="tel"
                  />
                </div>
              </>
            )}

            {error && (
              <div
                className="notice"
                style={{
                  marginTop: 16,
                  lineHeight: 1.5,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn"
              disabled={loading}
              style={{
                width: "100%",
                marginTop: 18,
              }}
            >
              {loading
                ? "CHECKING..."
                : "CHECK BOOKING STATUS"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}