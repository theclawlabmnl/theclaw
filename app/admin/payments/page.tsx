export const dynamic = "force-dynamic";

import { supabaseAdmin } from "@/lib/supabase-admin";
import PaymentQueue from "@/components/PaymentQueue";

export default async function Payments() {
  const db = supabaseAdmin();

  /*
   * ============================================================
   * LOAD PAYMENTS
   * ============================================================
   */

  const {
    data: payments,
    error: paymentsError,
  } = await db
    .from("payments")
    .select(`
      id,
      booking_id,
      method,
      amount,
      status,
      verified_at,
      created_at,
      payment_type,
      gross_amount,
      processing_fee,
      net_amount,
      note,
      paid_at,
      bookings(
        id,
        reference_code,
        customer_name,
        preferred_date,
        preferred_time,
        estimated_total,
        down_payment,
        access_token
      )
    `)
    .order("created_at", {
      ascending: false,
    });

  if (paymentsError) {
    console.error(
      "Admin payments load error:",
      paymentsError
    );
  }

  /*
   * ============================================================
   * LOAD PAYMENT PROOFS
   * ============================================================
   */

  const bookingIds = Array.from(
    new Set(
      (payments || [])
        .map(
          (payment: any) =>
            payment.booking_id
        )
        .filter(Boolean)
    )
  );

  let paymentProofs: any[] = [];

  if (bookingIds.length > 0) {
    const {
      data: proofs,
      error: proofError,
    } = await db
      .from("booking_files")
      .select(`
        id,
        booking_id,
        bucket,
        path,
        kind,
        created_at
      `)
      .in(
        "booking_id",
        bookingIds
      )
      .eq(
        "kind",
        "payment_proof"
      )
      .order("created_at", {
        ascending: false,
      });

    if (proofError) {
      console.error(
        "Payment proof load error:",
        proofError
      );
    } else {
      paymentProofs =
        proofs || [];
    }
  }

  /*
   * ============================================================
   * CREATE SIGNED PROOF URLS
   * ============================================================
   */

  const signedProofs =
    await Promise.all(
      paymentProofs.map(
        async (
          proof: any
        ) => {
          if (
            !proof.bucket ||
            !proof.path
          ) {
            return {
              ...proof,
              signedUrl: "",
            };
          }

          const {
            data,
            error,
          } =
            await db.storage
              .from(
                proof.bucket
              )
              .createSignedUrl(
                proof.path,
                60 * 60 * 6
              );

          if (error) {
            console.error(
              "Payment proof signed URL error:",
              error
            );
          }

          return {
            ...proof,

            signedUrl:
              data?.signedUrl ||
              "",
          };
        }
      )
    );

  /*
   * ============================================================
   * LATEST PROOF PER BOOKING
   * ============================================================
   */

  const latestProofByBooking =
    new Map<
      string,
      any
    >();

  for (
    const proof of signedProofs
  ) {
    if (
      !latestProofByBooking.has(
        proof.booking_id
      )
    ) {
      latestProofByBooking.set(
        proof.booking_id,
        proof
      );
    }
  }

  /*
   * ============================================================
   * BUILD PAYMENT ROWS
   * ============================================================
   */

  const rows =
    (payments || []).map(
      (payment: any) => {
        const proof =
          latestProofByBooking.get(
            payment.booking_id
          );

        return {
          ...payment,

          proofUrl:
            proof?.signedUrl ||
            "",

          proofId:
            proof?.id ||
            null,

          proofPath:
            proof?.path ||
            null,
        };
      }
    );

  /*
   * ============================================================
   * PAYMENT STATISTICS
   * ============================================================
   */

  const submittedCount =
    rows.filter(
      (payment: any) =>
        payment.status ===
        "submitted"
    ).length;

  const verifiedRows =
    rows.filter(
      (payment: any) =>
        payment.status ===
        "verified"
    );

  const verifiedNet =
    verifiedRows.reduce(
      (
        sum: number,
        payment: any
      ) =>
        sum +
        Number(
          payment.net_amount ??
            payment.amount ??
            0
        ),
      0
    );

  const verifiedFees =
    verifiedRows.reduce(
      (
        sum: number,
        payment: any
      ) =>
        sum +
        Number(
          payment.processing_fee ||
            0
        ),
      0
    );

  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  return (
    <div className="admin-page">
      <section
        className="admin-page-head"
        style={{
          marginBottom: 24,
        }}
      >
        <div>
          <div className="kicker">
            Money, manually
          </div>

          <h1 className="serif">
            Payments
          </h1>

          <p
            className="muted admin-lead"
            style={{
              maxWidth: 680,
            }}
          >
            Review payment proofs, verify
            customer payments, and record
            additional payments such as
            balances, tips, and extra charges.
          </p>
        </div>
      </section>

      <section>
        <div
          className="admin-stat-grid admin-stat-grid-clean"
          style={{
            gap: 18,
          }}
        >
          <div
            className="card admin-stat-card admin-stat-card-clean"
            style={{
              minWidth: 0,
            }}
          >
            <div className="admin-stat-topline">
              <span>
                To verify
              </span>
            </div>

            <div className="admin-stat-number">
              {submittedCount}
            </div>

            <p>
              Submitted payment proofs
            </p>
          </div>

          <div
            className="card admin-stat-card admin-stat-card-clean"
            style={{
              minWidth: 0,
            }}
          >
            <div className="admin-stat-topline">
              <span>
                Verified net
              </span>
            </div>

            <div
              className="admin-stat-number"
              style={{
                fontSize: 26,
              }}
            >
              ₱
              {verifiedNet.toLocaleString(
                "en-PH",
                {
                  minimumFractionDigits:
                    2,
                  maximumFractionDigits:
                    2,
                }
              )}
            </div>

            <p>
              Amount credited to bookings
            </p>
          </div>

          <div
            className="card admin-stat-card admin-stat-card-clean"
            style={{
              minWidth: 0,
            }}
          >
            <div className="admin-stat-topline">
              <span>
                QR PH fees
              </span>
            </div>

            <div
              className="admin-stat-number"
              style={{
                fontSize: 26,
              }}
            >
              ₱
              {verifiedFees.toLocaleString(
                "en-PH",
                {
                  minimumFractionDigits:
                    2,
                  maximumFractionDigits:
                    2,
                }
              )}
            </div>

            <p>
              Separate processing fees
            </p>
          </div>
        </div>
      </section>

      <section
        style={{
          marginTop: 32,
        }}
      >
        <div
          className="admin-section-title-row"
          style={{
            marginBottom: 16,
          }}
        >
          <div>
            <div className="kicker">
              Activity
            </div>

            <h2 className="serif">
              Payment records
            </h2>
          </div>
        </div>

        <PaymentQueue
          payments={rows}
        />
      </section>
    </div>
  );
}