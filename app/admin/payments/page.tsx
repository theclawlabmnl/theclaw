export const dynamic = "force-dynamic";

import { supabaseAdmin } from "@/lib/supabase-admin";
import PaymentQueue from "@/components/PaymentQueue";

export default async function Payments() {
  const db = supabaseAdmin();

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
        status,
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

  const realPayments =
    (payments || []).filter(
      (payment: any) =>
        payment.bookings &&
        payment.bookings.status !== "draft"
    );

  const bookingIds = Array.from(
    new Set(
      realPayments
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
      .from("payment_proofs")
      .select(`
        id,
        booking_id,
        bucket,
        path,
        created_at
      `)
      .in(
        "booking_id",
        bookingIds
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

  const rows =
    realPayments.map(
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

          proofCreatedAt:
            proof?.created_at ||
            null,
        };
      }
    );

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

  return (
    <div className="admin-page payments-page">
      <section
        className="admin-page-head payments-page-head"
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

        <a
          href="/api/admin/payments/export"
          className="btn secondary payments-export-btn"
        >
          Export CSV
        </a>
      </section>

      <section>
        <div className="payment-stat-grid">
          <div className="card payment-stat-card">
            <div className="payment-stat-inner">
              <div className="payment-stat-label">
                To verify
              </div>

              <div className="payment-stat-number">
                {submittedCount}
              </div>

              <p>
                Submitted payment proofs
              </p>
            </div>
          </div>

          <div className="card payment-stat-card">
            <div className="payment-stat-inner">
              <div className="payment-stat-label">
                Verified net
              </div>

              <div className="payment-stat-number">
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
          </div>

          <div className="card payment-stat-card">
            <div className="payment-stat-inner">
              <div className="payment-stat-label">
                QR PH fees
              </div>

              <div className="payment-stat-number">
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
        </div>
      </section>

      <section
        style={{
          marginTop: 28,
        }}
      >
        <div
          style={{
            marginBottom: 16,
          }}
        >
          <div className="kicker">
            Activity
          </div>

          <h2
            className="serif"
            style={{
              marginTop: 3,
            }}
          >
            Payment records
          </h2>
        </div>

        <PaymentQueue payments={rows} />
      </section>

      <style>{`
        .payments-page-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
        }

        .payments-export-btn {
          flex: 0 0 auto;
          white-space: nowrap;
        }

        .payment-stat-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 12px;
          width: 100%;
          max-width: 760px;
          align-items: stretch;
        }

        .payment-stat-card {
          min-width: 0;
          height: 112px;
          padding: 0 !important;
          border-radius: 12px;
          box-sizing: border-box;
        }

        .payment-stat-inner {
          display: grid;
          grid-template-rows:
            14px
            minmax(28px, auto)
            28px;
          align-content: center;
          width: 100%;
          height: 100%;
          padding: 13px 15px;
          box-sizing: border-box;
        }
          .payment-stat-card:first-child {
  transform: translateY(14px);
}
          

        .payment-stat-label {
          color: #777;
          font-size: 10px;
          font-weight: 600;
          line-height: 1.2;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .payment-stat-number {
          display: flex;
          align-items: center;
          min-width: 0;
          margin: 0;
          color: #111;
          font-size: 20px;
          font-weight: 700;
          line-height: 1.1;
          white-space: nowrap;
        }

        .payment-stat-card p {
          display: flex;
          align-items: flex-end;
          min-width: 0;
          margin: 0;
          color: #888;
          font-size: 10px;
          line-height: 1.3;
        }

      

        @media (max-width: 700px) {
          .payments-page-head {
            flex-direction: column;
            align-items: stretch;
          }

          .payments-export-btn {
            width: 100%;
            text-align: center;
          }

          .payment-stat-grid {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
            gap: 7px;
            max-width: 100%;
          }

          .payment-stat-card {
            height: 96px;
            border-radius: 10px;
          }

          .payment-stat-inner {
            grid-template-rows:
              12px
              minmax(24px, auto)
              25px;
            padding: 10px 8px;
          }

          .payment-stat-label {
            font-size: 8px;
          }

          .payment-stat-number {
            font-size: 14px;
          }

          .payment-stat-card p {
            font-size: 8px;
            line-height: 1.2;
          }

         
        }

        @media (max-width: 430px) {
          .payment-stat-grid {
            gap: 6px;
          }

          .payment-stat-card {
            height: 94px;
          }

          .payment-stat-inner {
            padding: 9px 7px;
          }

          .payment-stat-number {
            font-size: 13px;
          }
            
        }
      `}</style>
    </div>
  );
}