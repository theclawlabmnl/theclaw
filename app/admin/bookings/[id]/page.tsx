export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatDate, peso } from "@/lib/utils";
import BookingActions from "@/components/BookingActions";
import BookingPaymentActions from "@/components/BookingPaymentActions";

function isImage(path: string): boolean {
  return /\.(jpg|jpeg|png|webp|gif|heic|heif)$/i.test(path);
}

function formatTime12(time: string | null): string {
  if (!time) return "—";

  const parts = time.split(":");
  const hour = Number(parts[0]);
  const minute = Number(parts[1] || 0);

  if (Number.isNaN(hour)) return time;

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function statusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "approved":
      return "Approved · Payment Required";
    case "payment_submitted":
      return "Payment Submitted";
    case "confirmed":
      return "Confirmed";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "rejected":
      return "Rejected";
    default:
      return status;
  }
}

function cancellationReasonLabel(reason: string | null): string {
  switch (reason) {
    case "cancelled_by_client":
      return "Cancelled by Client";
    case "no_show":
      return "No-show";
    case "cancelled_by_nailtech":
      return "Cancelled by Nailtech";
    case "other":
      return "Other";
    default:
      return reason || "—";
  }
}

function paymentTypeLabel(type: string | null): string {
  switch (type) {
    case "down_payment":
    case "booking_payment":
      return "Down Payment";
    case "balance":
      return "Balance Payment";
    case "tip":
      return "Tip";
    case "additional_charge":
      return "Additional Charge";
    case "other":
      return "Other";
    default:
      return type || "Payment";
  }
}

function paymentStatusLabel(
  status: string | null,
  verifiedAt: string | null
): string {
  if (status === "verified" || verifiedAt) {
    return "Verified";
  }

  if (status === "rejected") {
    return "Rejected";
  }

  if (status === "submitted") {
    return "Submitted";
  }

  return status || "Pending";
}

function isVerifiedPayment(payment: {
  status: string | null;
  verified_at: string | null;
}): boolean {
  return payment.status === "verified" || Boolean(payment.verified_at);
}

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function BookingDetail({
  params,
}: PageProps) {
  const { id } = await params;
  const db = supabaseAdmin();

  /*
   * BOOKING
   */
  const { data: booking, error } = await db
    .from("bookings")
    .select("*, booking_services(*)")
    .eq("id", id)
    .single();

  if (error || !booking) {
    notFound();
  }

  /*
   * CUSTOMER UPLOADS
   */
  const { data: files } = await db
    .from("booking_files")
    .select(
      "id, booking_id, bucket, path, kind, created_at"
    )
    .eq("booking_id", id)
    .order("created_at", {
      ascending: true,
    });

  const signedFiles = await Promise.all(
    (files || []).map(async (file) => {
      const { data } = await db.storage
        .from(file.bucket)
        .createSignedUrl(file.path, 60 * 60 * 6);

      return {
        ...file,
        signedUrl: data?.signedUrl || null,
      };
    })
  );

  /*
   * PAYMENT PROOFS
   */
  const { data: paymentProofRows } = await db
    .from("payment_proofs")
    .select(
      "id, booking_id, bucket, path, created_at"
    )
    .eq("booking_id", id)
    .order("created_at", {
      ascending: false,
    });

  const paymentProofs = await Promise.all(
    (paymentProofRows || []).map(async (file) => {
      const { data } = await db.storage
        .from(file.bucket)
        .createSignedUrl(file.path, 60 * 60 * 6);

      return {
        ...file,
        signedUrl: data?.signedUrl || null,
      };
    })
  );

  /*
   * PAYMENTS
   */
  const { data: payments } = await db
    .from("payments")
    .select(`
      id,
      method,
      amount,
      status,
      verified_at,
      created_at,
      paid_at,
      payment_type,
      gross_amount,
      processing_fee,
      net_amount,
      note
    `)
    .eq("booking_id", id)
    .order("created_at", {
      ascending: false,
    });

  /*
   * DISCOUNT
   */
  const discountName = booking.promo_name || "";
  const discountSelected = Boolean(discountName);

  const discountVerified = Boolean(
    booking.discount_verified
  );

  /*
   * ORIGINAL TOTAL
   */
  const baseTotal = Number(
    booking.estimated_total || 0
  );

  /*
   * CURRENT DISCOUNT
   */
  const discountAmount =
    discountSelected && discountVerified
      ? Number((baseTotal * 0.05).toFixed(2))
      : 0;

  /*
   * FINAL TOTAL
   */
  const finalTotal = Math.max(
    0,
    baseTotal - discountAmount
  );

  /*
   * PAYMENT TOTALS
   */
  const paymentRows = payments || [];

  const verifiedPayments =
    paymentRows.filter(isVerifiedPayment);

  /*
   * VERIFIED DOWN PAYMENT
   */
  const verifiedDownPayment = verifiedPayments
    .filter(
      (payment) =>
        payment.payment_type === "down_payment" ||
        payment.payment_type === "booking_payment"
    )
    .reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );

  /*
   * VERIFIED BALANCE PAYMENTS
   */
  const verifiedBalancePaid = verifiedPayments
    .filter(
      (payment) =>
        payment.payment_type === "balance"
    )
    .reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );

  /*
   * VERIFIED TIPS
   */
  const verifiedTips = verifiedPayments
    .filter(
      (payment) =>
        payment.payment_type === "tip"
    )
    .reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );

  /*
   * VERIFIED ADDITIONAL CHARGES
   */
  const verifiedAdditionalCharges =
    verifiedPayments
      .filter(
        (payment) =>
          payment.payment_type ===
          "additional_charge"
      )
      .reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0
      );

  /*
   * VERIFIED OTHER PAYMENTS
   */
  const verifiedOther = verifiedPayments
    .filter(
      (payment) =>
        payment.payment_type === "other"
    )
    .reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );

  /*
   * REMAINING BOOKING BALANCE
   */
  const remaining = Math.max(
    0,
    finalTotal -
      verifiedDownPayment -
      verifiedBalancePaid
  );

  /*
   * PAYMENT ACCOUNTING
   */
  const verifiedGrossPayments =
    verifiedPayments.reduce(
      (sum, payment) =>
        sum +
        Number(
          payment.gross_amount ??
            payment.amount ??
            0
        ),
      0
    );

  const verifiedProcessingFees =
    verifiedPayments.reduce(
      (sum, payment) =>
        sum +
        Number(
          payment.processing_fee || 0
        ),
      0
    );

  const verifiedNetPayments =
    verifiedPayments.reduce(
      (sum, payment) =>
        sum +
        Number(
          payment.net_amount ??
            payment.amount ??
            0
        ),
      0
    );

  /*
   * FILE GROUPS
   */
  const inspiration = signedFiles.filter(
    (file) => file.kind === "inspiration"
  );

  const verification = signedFiles.filter(
    (file) =>
      [
        "student_valid_id",
        "student_registration",
        "pwd_valid_id",
        "pwd_document",
        "senior_valid_id",
        "senior_document",
      ].includes(file.kind)
  );

  return (
    <div className="admin-page booking-detail-page">
      {/* HEADER */}
      <header className="booking-detail-header">
        <div>
          <div className="kicker">
            {booking.reference_code}
          </div>

          <h1 className="serif">
            Booking Details
          </h1>

          <p className="muted">
            Review the customer request,
            appointment, uploads, discount,
            and payment status.
          </p>
        </div>

        <div className="booking-detail-header-actions">
          <Link
            href="/admin/bookings"
            className="btn secondary"
          >
            ← All bookings
          </Link>
        </div>
      </header>

      {/* CUSTOMER SUMMARY */}
      <section className="booking-summary-card">
        <div className="booking-summary-main">
          <div className="booking-avatar">
            {String(
              booking.customer_name || "?"
            )
              .charAt(0)
              .toUpperCase()}
          </div>

          <div>
            <div className="kicker">
              Customer
            </div>

            <h2 className="serif">
              {booking.customer_name}
            </h2>

            <div className="booking-contact">
              {booking.mobile_number ||
                "No phone number"}
            </div>

            <div className="muted">
              {booking.social_handle ||
                "No social handle"}
            </div>
          </div>
        </div>

        <span className="status-pill">
          {statusLabel(booking.status)}
        </span>
      </section>

      <div className="booking-detail-layout">
        {/* MAIN */}
        <main className="booking-detail-content">
          {/* APPOINTMENT */}
          <section className="admin-detail-card">
            <div className="section-label">
              Appointment
            </div>

            <div className="appointment-highlight">
              <div>
                <span className="muted">
                  Date
                </span>

                <strong>
                  {formatDate(
                    booking.preferred_date
                  )}
                </strong>
              </div>

              <div>
                <span className="muted">
                  Time
                </span>

                <strong>
                  {formatTime12(
                    booking.preferred_time
                  )}
                </strong>
              </div>
            </div>

            <div className="service-table">
              {booking.booking_services?.map(
                (item: {
                  id: string;
                  service_name: string;
                  variation_name?:
                    | string
                    | null;
                  price: number | null;
                  duration_minutes:
                    | number
                    | null;
                }) => (
                  <div
                    className="service-row"
                    key={item.id}
                  >
                    <div>
                      <strong>
                        {item.service_name}
                      </strong>

                      {item.variation_name && (
                        <span className="muted">
                          {item.variation_name}
                        </span>
                      )}
                    </div>

                    <div className="service-row-right">
                      <strong>
                        {peso(item.price || 0)}
                      </strong>

                      <span className="muted">
                        {item.duration_minutes ||
                          0}{" "}
                        min
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>

          {/* REQUEST DETAILS */}
          <section className="admin-detail-card">
            <div className="section-label">
              Request details
            </div>

            <div className="detail-table">
              <div>
                <span>Removal</span>

                <strong>
                  {booking.removal || "None"}
                </strong>
              </div>

              <div>
                <span>
                  Promo / Discount
                </span>

                <strong>
                  {booking.promo_name ||
                    "Not applicable"}
                </strong>
              </div>

              <div>
                <span>Referral</span>

                <strong>
                  {booking.referral_name || "—"}
                </strong>
              </div>

              <div>
                <span>Notes</span>

                <strong className="detail-wrap">
                  {booking.notes || "—"}
                </strong>
              </div>

              <div>
                <span>
                  Policies accepted
                </span>

                <strong>
                  {booking.terms_accepted
                    ? "Yes"
                    : "No"}
                </strong>
              </div>
            </div>
          </section>

          {/* DISCOUNT VERIFICATION */}
          <section className="admin-detail-card">
            <div className="section-label">
              Discount verification
            </div>

            {discountSelected ? (
              <div
                style={{
                  display: "grid",
                  gap: 14,
                }}
              >
                <div className="detail-table">
                  <div>
                    <span>
                      Requested discount
                    </span>

                    <strong>
                      {discountName}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Discount rate
                    </span>

                    <strong>5%</strong>
                  </div>

                  <div>
                    <span>
                      Verification status
                    </span>

                    <strong>
                      {discountVerified
                        ? "Verified · Applied"
                        : "Pending verification"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Discount amount
                    </span>

                    <strong>
                      {discountVerified
                        ? `−${peso(
                            discountAmount
                          )}`
                        : peso(0)}
                    </strong>
                  </div>
                </div>

                {!discountVerified && (
                  <div
                    className="notice"
                    style={{
                      lineHeight: 1.55,
                    }}
                  >
                    The customer selected
                    this discount, but it has{" "}
                    <strong>
                      not been applied
                    </strong>
                    . Verify the customer's
                    eligibility before applying
                    the 5% discount.
                  </div>
                )}

                {discountVerified && (
                  <div
                    className="notice"
                    style={{
                      lineHeight: 1.55,
                    }}
                  >
                    Discount verified and
                    applied to the booking
                    total.
                  </div>
                )}

                {!discountVerified && (
                  <form
                    action="/api/admin/bookings"
                    method="POST"
                    style={{
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <input
                      type="hidden"
                      name="action"
                      value="verify_discount"
                    />

                    <input
                      type="hidden"
                      name="id"
                      value={booking.id}
                    />

                    <button
                      type="submit"
                      className="btn"
                      style={{
                        width: "100%",
                      }}
                    >
                      Verify & Apply 5%
                      Discount
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="empty-box">
                No discount was selected.
              </div>
            )}
          </section>

          {/* NAIL INSPIRATION */}
          <section className="admin-detail-card">
            <div className="section-label">
              Nail inspiration
            </div>

            <p className="muted section-description">
              Design references uploaded
              by the customer.
            </p>

            {inspiration.length > 0 ? (
              <div className="booking-media-grid">
                {inspiration.map((file) => (
                  <div
                    key={file.id}
                    className="booking-media-card"
                  >
                    {file.signedUrl &&
                    isImage(file.path) ? (
                      <a
                        href={file.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="booking-image-frame"
                      >
                        <img
                          src={file.signedUrl}
                          alt="Customer nail inspiration"
                        />
                      </a>
                    ) : (
                      <a
                        href={
                          file.signedUrl || "#"
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="file-placeholder"
                      >
                        Open file →
                      </a>
                    )}

                    <div className="file-name">
                      {file.path
                        .split("/")
                        .pop() ||
                        "Uploaded file"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-box">
                No nail inspiration
                uploaded.
              </div>
            )}
          </section>

          {/* DISCOUNT DOCUMENTS */}
          <section className="admin-detail-card">
            <div className="section-label">
              Discount verification
              documents
            </div>

            <p className="muted section-description">
              Private documents submitted
              for Student, PWD, or Senior
              Citizen verification.
            </p>

            {verification.length > 0 ? (
              <div className="verification-media-grid">
                {verification.map((file) => (
                  <div
                    key={file.id}
                    className="verification-media-card"
                  >
                    <div className="verification-media-header">
                      <div>
                        <strong>
                          {file.kind ===
                          "student_valid_id"
                            ? "Student Valid ID"
                            : file.kind ===
                              "student_registration"
                            ? "Student Registration"
                            : file.kind ===
                              "pwd_valid_id"
                            ? "PWD Valid ID"
                            : file.kind ===
                              "senior_valid_id"
                            ? "Senior Citizen Valid ID"
                            : "Verification Document"}
                        </strong>

                        <span className="muted">
                          {file.path
                            .split("/")
                            .pop() ||
                            "Uploaded file"}
                        </span>
                      </div>
                    </div>

                    {file.signedUrl &&
                    isImage(file.path) ? (
                      <div className="verification-image-frame">
                        <img
                          src={file.signedUrl}
                          alt="Discount verification document"
                        />
                      </div>
                    ) : (
                      <div className="verification-file-placeholder">
                        <span>
                          Document uploaded
                        </span>

                        {file.signedUrl && (
                          <a
                            href={file.signedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn small secondary"
                          >
                            Open document
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-box">
                No discount verification
                documents.
              </div>
            )}
          </section>

          {/* PAYMENT PROOF */}
          <section className="admin-detail-card payment-proof-section">
            <div className="section-label">
              Payment proof
            </div>

            <p className="muted section-description">
              Private payment screenshots
              submitted by the customer.
            </p>

            {paymentProofs.length > 0 ? (
              <div className="booking-media-grid payment-proof-grid">
                {paymentProofs.map((file) => (
                  <div
                    key={file.id}
                    className="booking-media-card payment-proof-card"
                  >
                    {file.signedUrl &&
                    isImage(file.path) ? (
                      <a
                        href={file.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="booking-image-frame payment-image-frame"
                      >
                        <img
                          src={file.signedUrl}
                          alt="Customer payment proof"
                        />
                      </a>
                    ) : (
                      <a
                        href={
                          file.signedUrl || "#"
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="file-placeholder"
                      >
                        Open payment
                        proof →
                      </a>
                    )}

                    <div className="file-name">
                      Payment proof
                    </div>

                    <span className="muted">
                      {file.path
                        .split("/")
                        .pop() ||
                        "Uploaded proof"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-box">
                No payment proof uploaded
                yet.
              </div>
            )}

            <div
              style={{
                marginTop: 14,
              }}
            >
              <Link
                href="/admin/payments"
                className="btn secondary"
                style={{
                  width: "100%",
                  textAlign: "center",
                }}
              >
                View Payment Transactions & Verification →
              </Link>
            </div>
          </section>

          {/* CANCELLATION */}
          {booking.status === "cancelled" && (
            <section className="admin-detail-card">
              <div className="section-label">
                Cancellation
              </div>

              <div className="detail-table">
                <div>
                  <span>Reason</span>

                  <strong>
                    {cancellationReasonLabel(
                      booking.cancellation_reason
                    )}
                  </strong>
                </div>

                <div>
                  <span>Details</span>

                  <strong className="detail-wrap">
                    {booking.cancellation_note ||
                      "—"}
                  </strong>
                </div>

                <div>
                  <span>Cancelled at</span>

                  <strong>
                    {booking.cancelled_at
                      ? new Date(
                          booking.cancelled_at
                        ).toLocaleString(
                          "en-PH",
                          {
                            dateStyle:
                              "medium",
                            timeStyle:
                              "short",
                          }
                        )
                      : "—"}
                  </strong>
                </div>
              </div>
            </section>
          )}

          {/* PAYMENT HISTORY — ALWAYS LAST */}
          <section className="admin-detail-card">
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div className="section-label">
                  Payment history
                </div>

                <p
                  className="muted section-description"
                  style={{
                    marginBottom: 0,
                  }}
                >
                  All payment activity for
                  this booking.
                </p>
              </div>

              {paymentRows.length > 0 && (
                <div
                  className="status-pill"
                  style={{
                    whiteSpace: "nowrap",
                  }}
                >
                  {paymentRows.length}{" "}
                  transaction
                  {paymentRows.length === 1
                    ? ""
                    : "s"}
                </div>
              )}
            </div>

            {/* PAYMENT SUMMARY */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(150px, 1fr))",
                gap: 10,
                marginTop: 18,
              }}
            >
              <div
                style={{
                  padding: 14,
                  border:
                    "1px solid var(--border, #e7e1dc)",
                  borderRadius: 12,
                }}
              >
                <span className="muted">
                  Booking Total
                </span>

                <strong
                  style={{
                    display: "block",
                    marginTop: 5,
                  }}
                >
                  {peso(finalTotal)}
                </strong>
              </div>

              <div
                style={{
                  padding: 14,
                  border:
                    "1px solid var(--border, #e7e1dc)",
                  borderRadius: 12,
                }}
              >
                <span className="muted">
                  Down Payment
                </span>

                <strong
                  style={{
                    display: "block",
                    marginTop: 5,
                  }}
                >
                  {peso(
                    verifiedDownPayment
                  )}
                </strong>
              </div>

              <div
                style={{
                  padding: 14,
                  border:
                    "1px solid var(--border, #e7e1dc)",
                  borderRadius: 12,
                }}
              >
                <span className="muted">
                  Balance Paid
                </span>

                <strong
                  style={{
                    display: "block",
                    marginTop: 5,
                  }}
                >
                  {peso(
                    verifiedBalancePaid
                  )}
                </strong>
              </div>

              <div
                style={{
                  padding: 14,
                  border:
                    "1px solid var(--border, #e7e1dc)",
                  borderRadius: 12,
                }}
              >
                <span className="muted">
                  Remaining
                </span>

                <strong
                  style={{
                    display: "block",
                    marginTop: 5,
                  }}
                >
                  {peso(remaining)}
                </strong>
              </div>

              <div
                style={{
                  padding: 14,
                  border:
                    "1px solid var(--border, #e7e1dc)",
                  borderRadius: 12,
                }}
              >
                <span className="muted">
                  Tips
                </span>

                <strong
                  style={{
                    display: "block",
                    marginTop: 5,
                  }}
                >
                  {peso(verifiedTips)}
                </strong>
              </div>

              <div
                style={{
                  padding: 14,
                  border:
                    "1px solid var(--border, #e7e1dc)",
                  borderRadius: 12,
                }}
              >
                <span className="muted">
                  Additional Charges
                </span>

                <strong
                  style={{
                    display: "block",
                    marginTop: 5,
                  }}
                >
                  {peso(
                    verifiedAdditionalCharges
                  )}
                </strong>
              </div>
            </div>

            {/* ACCOUNTING SUMMARY */}
            {verifiedPayments.length > 0 && (
              <div
                style={{
                  marginTop: 14,
                  padding: 14,
                  borderRadius: 12,
                  background:
                    "rgba(0,0,0,0.025)",
                  display: "grid",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: 12,
                  }}
                >
                  <span className="muted">
                    Verified Gross
                  </span>

                  <strong>
                    {peso(
                      verifiedGrossPayments
                    )}
                  </strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: 12,
                  }}
                >
                  <span className="muted">
                    Processing Fees
                  </span>

                  <strong>
                    {peso(
                      verifiedProcessingFees
                    )}
                  </strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: 12,
                  }}
                >
                  <span className="muted">
                    Verified Net
                  </span>

                  <strong>
                    {peso(
                      verifiedNetPayments
                    )}
                  </strong>
                </div>

                {verifiedProcessingFees > 0 && (
                  <div
                    className="notice"
                    style={{
                      marginTop: 4,
                      lineHeight: 1.5,
                    }}
                  >
                    Processing fees are
                    separate from the booking
                    amount. For QR PH, the
                    customer pays the ₱5
                    processing fee in addition
                    to the booking payment.
                  </div>
                )}
              </div>
            )}

            {/* TRANSACTIONS */}
            <div
              style={{
                marginTop: 20,
              }}
            >
              <div
                className="section-label"
                style={{
                  marginBottom: 10,
                }}
              >
                Transactions
              </div>

              {paymentRows.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gap: 10,
                  }}
                >
                  {paymentRows.map((payment) => {
                    const verified =
                      isVerifiedPayment(
                        payment
                      );

                    const amount = Number(
                      payment.amount || 0
                    );

                    const gross = Number(
                      payment.gross_amount ??
                        amount
                    );

                    const fee = Number(
                      payment.processing_fee ||
                        0
                    );

                    const net = Number(
                      payment.net_amount ??
                        amount
                    );

                    const transactionDate =
                      payment.paid_at ||
                      payment.verified_at ||
                      payment.created_at;

                    return (
                      <div
                        key={payment.id}
                        style={{
                          border:
                            "1px solid var(--border, #e7e1dc)",
                          borderRadius: 12,
                          padding: 14,
                          display: "grid",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              "space-between",
                            alignItems:
                              "flex-start",
                            gap: 12,
                            flexWrap:
                              "wrap",
                          }}
                        >
                          <div>
                            <strong>
                              {paymentTypeLabel(
                                payment.payment_type
                              )}
                            </strong>

                            <div
                              className="muted"
                              style={{
                                marginTop: 3,
                              }}
                            >
                              {payment.method ||
                                "—"}
                              {" · "}
                              {transactionDate
                                ? new Date(
                                    transactionDate
                                  ).toLocaleString(
                                    "en-PH",
                                    {
                                      dateStyle:
                                        "medium",
                                      timeStyle:
                                        "short",
                                    }
                                  )
                                : "—"}
                            </div>
                          </div>

                          <span className="status-pill">
                            {paymentStatusLabel(
                              payment.status,
                              payment.verified_at
                            )}
                          </span>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(120px, 1fr))",
                            gap: 8,
                          }}
                        >
                          <div>
                            <span className="muted">
                              Net
                            </span>

                            <strong
                              style={{
                                display:
                                  "block",
                                marginTop: 3,
                              }}
                            >
                              {peso(net)}
                            </strong>
                          </div>

                          <div>
                            <span className="muted">
                              Gross
                            </span>

                            <strong
                              style={{
                                display:
                                  "block",
                                marginTop: 3,
                              }}
                            >
                              {peso(gross)}
                            </strong>
                          </div>

                          <div>
                            <span className="muted">
                              Processing Fee
                            </span>

                            <strong
                              style={{
                                display:
                                  "block",
                                marginTop: 3,
                              }}
                            >
                              {peso(fee)}
                            </strong>
                          </div>
                        </div>

                        {payment.note && (
                          <div
                            className="muted"
                            style={{
                              paddingTop: 2,
                              lineHeight: 1.5,
                            }}
                          >
                            <strong>
                              Note:
                            </strong>{" "}
                            {payment.note}
                          </div>
                        )}

                        {!verified &&
                          payment.status !==
                            "rejected" && (
                            <div
                              className="notice"
                              style={{
                                lineHeight: 1.5,
                              }}
                            >
                              This payment has
                              not been verified
                              and is not included
                              in the booking
                              balance totals.
                            </div>
                          )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-box">
                  No payment transactions
                  recorded yet.
                </div>
              )}
            </div>

            {verifiedOther > 0 && (
              <div
                className="muted"
                style={{
                  marginTop: 12,
                  fontSize: 13,
                }}
              >
                Other verified payments:{" "}
                <strong>
                  {peso(verifiedOther)}
                </strong>
              </div>
            )}
          </section>
        </main>

        {/* SIDEBAR */}
        <aside className="booking-detail-sidebar">
          <section className="booking-control-card">
            <div className="section-label">
              Booking controls
            </div>

            <span className="status-pill">
              {statusLabel(booking.status)}
            </span>

            {/* ORIGINAL TOTAL */}
            <div className="total-block">
              <span className="muted">
                Original Total
              </span>

              <strong>
                {peso(baseTotal)}
              </strong>
            </div>

            {/* DISCOUNT */}
            <div className="balance-row">
              <span>Discount</span>

              <strong>
                {discountVerified
                  ? `−${peso(
                      discountAmount
                    )}`
                  : peso(0)}
              </strong>
            </div>

            {/* DOWN PAYMENT */}
            <div className="balance-row">
              <span>Down Payment</span>

              <strong>
                {peso(
                  verifiedDownPayment
                )}
              </strong>
            </div>

            {/* BALANCE PAID */}
            <div className="balance-row">
              <span>Balance Paid</span>

              <strong>
                {peso(
                  verifiedBalancePaid
                )}
              </strong>
            </div>

            {/* FINAL TOTAL */}
            <div className="balance-row">
              <span>Final Total</span>

              <strong>
                {peso(finalTotal)}
              </strong>
            </div>

            {/* REMAINING */}
            <div className="balance-row">
              <span>Remaining</span>

              <strong>
                {peso(remaining)}
              </strong>
            </div>

            <div className="control-divider" />

            {/* BOOKING STATUS CONTROLS */}
            <BookingActions
              id={booking.id}
              status={booking.status}
            />

            {/* EDIT BOOKING — ABOVE PAYMENT ACTIONS */}
            <Link
              href={`/admin/bookings/${booking.id}/edit`}
              className="btn secondary"
              style={{
                width: "100%",
                marginTop: 10,
                textAlign: "center",
              }}
            >
              Edit Booking
            </Link>

            {/* PAYMENT / BUSINESS ACTIONS */}
            {booking.access_token && (
              <BookingPaymentActions
                token={booking.access_token}
              />
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}