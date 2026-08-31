export const dynamic = "force-dynamic";

import { supabaseAdmin } from "@/lib/supabase-admin";
import PaymentQueue from "@/components/PaymentQueue";

export default async function Payments() {
  const db = supabaseAdmin();

  const { data: payments, error } = await db
    .from("payments")
    .select(
      "id,booking_id,method,amount,status,verified_at,created_at,bookings(reference_code,customer_name,preferred_date,preferred_time,access_token)"
    )
    .order("created_at", { ascending: false });

  if (error) console.error("Payments page query error:", error);

  const rows = payments || [];
  const bookingIds = Array.from(new Set(rows.map((payment) => payment.booking_id).filter(Boolean)));
  const proofMap = new Map<string, string>();

  if (bookingIds.length) {
    const { data: proofs, error: proofError } = await db
      .from("payment_proofs")
      .select("booking_id,bucket,path,created_at")
      .in("booking_id", bookingIds)
      .order("created_at", { ascending: false });

    if (proofError) {
      console.error("Payment proofs query error:", proofError);
    } else {
      const latest = new Map<string, { bucket: string; path: string }>();
      for (const proof of proofs || []) {
        if (!latest.has(proof.booking_id)) {
          latest.set(proof.booking_id, {
            bucket: proof.bucket || "payment-proofs",
            path: proof.path,
          });
        }
      }

      for (const [bookingId, proof] of latest) {
        const { data: signed } = await db.storage
          .from(proof.bucket)
          .createSignedUrl(proof.path, 60 * 60 * 6);
        if (signed?.signedUrl) proofMap.set(bookingId, signed.signedUrl);
      }
    }
  }

  const enriched = rows.map((payment) => ({
    ...payment,
    proof_url: proofMap.get(payment.booking_id) || null,
  }));

  const waiting = enriched.filter((payment) => payment.status === "submitted").length;

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <div className="kicker">Money, manually</div>
          <h1 className="serif">Payments</h1>
          <p className="muted admin-lead">
            Review payment proof privately and verify submitted payments.
          </p>
        </div>
        {waiting > 0 && (
          <div className="admin-notice-badge">
            {waiting} payment{waiting === 1 ? "" : "s"} waiting for verification
          </div>
        )}
      </div>

      <PaymentQueue payments={enriched} />
    </div>
  );
}
