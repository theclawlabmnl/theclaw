export const dynamic = "force-dynamic";

import { supabaseAdmin } from "@/lib/supabase-admin";
import PaymentQueue from "@/components/PaymentQueue";

type PaymentRow = {
  id: string;
  booking_id: string;
  method: string;
  amount: number;
  status: string;
  verified_at: string | null;
  created_at: string;
  bookings:
    | {
        reference_code: string;
        customer_name: string;
        preferred_date: string;
        preferred_time: string;
        access_token: string;
      }
    | null;
  proof_path?: string | null;
};

export default async function Payments() {
  const db = supabaseAdmin();

  /*
   * Get payments and their booking information.
   * Do NOT embed payment_proofs here because
   * payment_proofs is related to bookings, not payments.
   */
  const {
    data: payments,
    error: paymentsError,
  } = await db
    .from("payments")
    .select(
      `
      id,
      booking_id,
      method,
      amount,
      status,
      verified_at,
      created_at,
      bookings(
        reference_code,
        customer_name,
        preferred_date,
        preferred_time,
        access_token
      )
      `
    )
    .order("created_at", {
      ascending: false,
    });

  if (paymentsError) {
    console.error(
      "Payments query error:",
      paymentsError
    );
  }

  const paymentRows =
    (payments || []) as unknown as PaymentRow[];

  /*
   * Get payment proofs separately using booking_id.
   */
  const bookingIds = Array.from(
    new Set(
      paymentRows
        .map(
          (payment) =>
            payment.booking_id
        )
        .filter(Boolean)
    )
  );

  let proofMap =
    new Map<string, string>();

  if (bookingIds.length) {
    const {
      data: proofs,
      error: proofsError,
    } = await db
      .from("payment_proofs")
      .select(
        "booking_id,path,created_at"
      )
      .in(
        "booking_id",
        bookingIds
      )
      .order("created_at", {
        ascending: false,
      });

    if (proofsError) {
      console.error(
        "Payment proofs query error:",
        proofsError
      );
    } else {
      /*
       * Keep the newest proof for each booking.
       */
      proofMap =
        new Map<string, string>();

      for (
        const proof of proofs || []
      ) {
        if (
          !proofMap.has(
            proof.booking_id
          )
        ) {
          proofMap.set(
            proof.booking_id,
            proof.path
          );
        }
      }
    }
  }

  const rows =
    paymentRows.map(
      (payment) => ({
        ...payment,
        proof_path:
          proofMap.get(
            payment.booking_id
          ) || null,
      })
    );

  return (
    <>
      <div className="section-head">
        <div>
          <div className="kicker">
            Money, manually
          </div>

          <h1 className="serif">
            Payments
          </h1>

          <p className="muted">
            Review submitted payment proof
            and verify customer payments.
          </p>
        </div>
      </div>

      <PaymentQueue
        payments={rows}
      />
    </>
  );
}