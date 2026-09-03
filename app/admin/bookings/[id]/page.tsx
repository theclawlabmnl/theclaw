import Link from "next/link";
import { notFound } from "next/navigation";

import { supabaseAdmin } from "@/lib/supabase-admin";

import BookingActions from "@/components/BookingActions";
import BookingPaymentActions from "@/components/BookingPaymentActions";
import AdminBookingPaymentManager from "@/components/AdminBookingPaymentManager";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    activityPage?: string;
  }>;
};

type BookingService = {
  id: string;
  booking_id: string;
  service_id: string;
  variation_id: string | null;
  service_name: string | null;
  variation_name: string | null;
  price: number | null;
  duration_minutes: number | null;
};

type BookingFile = {
  id: string;
  booking_id: string;
  bucket: string | null;
  path: string | null;
  file_name: string | null;
  kind: string | null;
  created_at: string | null;
  signedUrl: string | null;
};

type Payment = {
  id: string;
  method: string | null;
  amount: number | null;
  status: string | null;
  verified_at: string | null;
  created_at: string | null;
  paid_at: string | null;
  payment_type: string | null;
  gross_amount: number | null;
  processing_fee: number | null;
  net_amount: number | null;
  note: string | null;
};

type ActivityLog = {
  id: string;
  action: string | null;
  description: string | null;
  old_value: unknown;
  new_value: unknown;
  actor_id: string | null;
  actor_email: string | null;
  created_at: string;
};

const ACTIVITY_PAGE_SIZE = 10;

function bookingFileName(
  path: string | null
): string {
  if (!path) {
    return "Uploaded file";
  }

  const lastPart =
    path.split("/").pop() || path;

  /*
   * Uploaded file paths are stored as:
   * <token>-<sanitized-original-filename>
   *
   * booking_files does not need a separate file_name
   * column, so derive a readable name from the path.
   */
  const withoutToken =
    lastPart.replace(
      /^[A-Za-z0-9]{8,}-/,
      ""
    );

  return withoutToken || lastPart;
}

function numberValue(
  value: unknown
): number {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
}

function peso(
  value: unknown
): string {
  return `₱${numberValue(
    value
  ).toLocaleString(
    "en-PH",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function formatDate(
  value: string | null
): string {
  if (!value) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat(
      "en-PH",
      {
        dateStyle:
          "medium",
        timeZone:
          "UTC",
      }
    ).format(
      new Date(
        `${value}T00:00:00Z`
      )
    );
  } catch {
    return value;
  }
}

function formatTime(
  value: string | null
): string {
  if (!value) {
    return "—";
  }

  const [
    hours,
    minutes,
  ] = value
    .split(":")
    .map(Number);

  if (
    !Number.isFinite(
      hours
    ) ||
    !Number.isFinite(
      minutes
    )
  ) {
    return value;
  }

  const suffix =
    hours >= 12
      ? "PM"
      : "AM";

  const hour =
    hours % 12 || 12;

  return `${hour}:${String(
    minutes
  ).padStart(
    2,
    "0"
  )} ${suffix}`;
}

function formatDateTime(
  value: string | null
): string {
  if (!value) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat(
      "en-PH",
      {
        dateStyle:
          "medium",
        timeStyle:
          "short",
      }
    ).format(
      new Date(value)
    );
  } catch {
    return value;
  }
}

function prettyAction(
  action: string | null
): string {
  if (!action) {
    return "Activity";
  }

  return action
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (
        letter
      ) =>
        letter.toUpperCase()
    );
}

function activityFieldLabel(
  key: string
): string {
  const labels: Record<
    string,
    string
  > = {
    status: "Status",
    promo_name:
      "Discount",
    discount_verified:
      "Discount Decision",
    discount_amount:
      "Discount Amount",
    estimated_total:
      "Estimated Total",
    down_payment:
      "Down Payment",
    customer_name:
      "Customer Name",
    email: "Email",
    mobile_number:
      "Mobile Number",
    social_handle:
      "Social Handle",
    preferred_date:
      "Appointment Date",
    preferred_time:
      "Appointment Time",
    removal:
      "Removal",
    notes: "Notes",
    referral_name:
      "Referred By",
    discount_category:
      "Discount Category",
    payment_type:
      "Payment Type",
    method:
      "Payment Method",
    amount:
      "Amount",
  };

  if (labels[key]) {
    return labels[key];
  }

  return key
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (
        letter
      ) =>
        letter.toUpperCase()
    );
}

function activityFieldValue(
  key: string,
  value: unknown
): string {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  if (
    key ===
    "discount_verified"
  ) {
    return Boolean(value)
      ? "Approved / Applied"
      : "Rejected / Not Applied";
  }

  if (
    key === "status"
  ) {
    return statusLabel(
      value
    );
  }

  if (
    key ===
      "preferred_date" &&
    typeof value ===
      "string"
  ) {
    return formatDate(
      value
    );
  }

  if (
    key ===
      "preferred_time" &&
    typeof value ===
      "string"
  ) {
    return formatTime(
      value
    );
  }

  if (
    [
      "discount_amount",
      "estimated_total",
      "down_payment",
      "amount",
      "price",
      "gross_amount",
      "processing_fee",
      "net_amount",
    ].includes(key)
  ) {
    return peso(
      numberValue(
        value
      )
    );
  }

  if (
    typeof value ===
    "boolean"
  ) {
    return value
      ? "Yes"
      : "No";
  }

  if (
    Array.isArray(value)
  ) {
    if (
      value.length === 0
    ) {
      return "None";
    }

    return `${value.length} item${
      value.length === 1
        ? ""
        : "s"
    } updated`;
  }

  if (
    typeof value ===
      "object" &&
    value !== null
  ) {
    return "Updated";
  }

  return String(
    value
  );
}

function activityValueRows(
  value: unknown
): Array<{
  label: string;
  value: string;
}> {
  if (
    value === null ||
    value === undefined
  ) {
    return [];
  }

  let normalized = value;

  if (
    typeof normalized ===
    "string"
  ) {
    try {
      normalized =
        JSON.parse(
          normalized
        );
    } catch {
      return [
        {
          label: "Value",
          value: String(
            normalized
          ),
        },
      ];
    }
  }

  if (
    typeof normalized ===
      "object" &&
    normalized !== null &&
    !Array.isArray(
      normalized
    )
  ) {
    return Object.entries(
      normalized as Record<
        string,
        unknown
      >
    ).map(
      ([
        key,
        item,
      ]) => ({
        label:
          activityFieldLabel(
            key
          ),
        value:
          activityFieldValue(
            key,
            item
          ),
      })
    );
  }

  return [
    {
      label: "Value",
      value:
        activityFieldValue(
          "",
          normalized
        ),
    },
  ];
}

function statusLabel(
  status: unknown
): string {
  return String(
    status || ""
  )
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (
        letter
      ) =>
        letter.toUpperCase()
    );
}

function discountCategoryLabel(
  value: unknown
): string {
  const category =
    String(
      value || ""
    );

  if (
    category ===
    "student"
  ) {
    return "Student";
  }

  if (
    category ===
    "pwd"
  ) {
    return "PWD";
  }

  if (
    category ===
    "senior_citizen"
  ) {
    return "Senior Citizen";
  }

  return "—";
}

function paymentTypeLabel(
  value: string | null
): string {
  return String(
    value || "other"
  )
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (
        letter
      ) =>
        letter.toUpperCase()
    );
}

export default async function BookingDetailsPage({
  params,
  searchParams,
}: PageProps) {
  const { id } =
    await params;

  const activityParams =
    await searchParams;

  const activityPageRaw =
    Number(
      activityParams.activityPage ||
        "1"
    );

  const activityPage =
    Number.isFinite(
      activityPageRaw
    ) &&
    activityPageRaw > 0
      ? Math.floor(
          activityPageRaw
        )
      : 1;

  const activityFrom =
    (activityPage - 1) *
    ACTIVITY_PAGE_SIZE;

  const activityTo =
    activityFrom +
    ACTIVITY_PAGE_SIZE -
    1;

  const activityPaginationRequested =
    Boolean(
      activityParams.activityPage
    );

  const db =
    supabaseAdmin();

  const {
    data: booking,
    error:
      bookingError,
  } = await db
    .from("bookings")
    .select(
      `
        *,
        booking_services(
          id,
          booking_id,
          service_id,
          variation_id,
          service_name,
          variation_name,
          price,
          duration_minutes
        )
      `
    )
    .eq("id", id)
    .maybeSingle();

  if (bookingError) {
    console.error(
      "Booking details error:",
      bookingError
    );
  }

  if (
    !booking ||
    booking.status ===
      "draft"
  ) {
    notFound();
  }

  const services =
    (
      booking.booking_services ||
      []
    ) as BookingService[];

  const [
    filesResult,
    paymentsResult,
    activityResult,
    paymentProofsResult,
  ] =
    await Promise.all([
      db
        .from(
          "booking_files"
        )
        .select(
          `
            id,
            booking_id,
            bucket,
            path,
            kind,
            created_at
          `
        )
        .eq(
          "booking_id",
          id
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),

      db
        .from("payments")
        .select(
          `
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
          `
        )
        .eq(
          "booking_id",
          id
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),

      db
        .from(
          "booking_activity_logs"
        )
        .select(
          `
            id,
            action,
            description,
            old_value,
            new_value,
            actor_id,
            actor_email,
            created_at
          `,
          {
            count: "exact",
          }
        )
        .eq(
          "booking_id",
          id
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .range(
          activityFrom,
          activityTo
        ),

      db
        .from(
          "payment_proofs"
        )
        .select(
          `
            id,
            booking_id,
            bucket,
            path,
            created_at
          `
        )
        .eq(
          "booking_id",
          id
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),
    ]);

  /*
   * booking_files is optional for bookings without uploads.
   * If loading files fails, keep the details page usable and
   * render the file sections as empty instead of triggering
   * the Next.js development error overlay.
   */
  if (
    paymentsResult.error
  ) {
    console.error(
      "Payments error:",
      paymentsResult.error
    );
  }

  if (
    activityResult.error
  ) {
    console.error(
      "Activity log error:",
      activityResult.error
    );
  }

  if (
    paymentProofsResult.error
  ) {
    console.error(
      "Payment proofs error:",
      paymentProofsResult.error
    );
  }

  const rawFiles =
    filesResult.error
      ? []
      : filesResult.data ||
        [];

  const signedFiles =
    (await Promise.all(
      rawFiles.map(
        async (
          file
        ) => {
          if (
            !file.bucket ||
            !file.path
          ) {
            return {
              ...file,
              file_name:
                bookingFileName(
                  file.path
                ),
              signedUrl:
                null,
            };
          }

          const {
            data,
          } =
            await db.storage
              .from(
                file.bucket
              )
              .createSignedUrl(
                file.path,
                60 * 60
              );

          return {
            ...file,
            file_name:
              bookingFileName(
                file.path
              ),
            signedUrl:
              data?.signedUrl ||
              null,
          };
        }
      )
    )) as BookingFile[];

  const payments =
    (
      paymentsResult.data ||
      []
    ) as Payment[];

  const activities =
    (
      activityResult.data ||
      []
    ) as ActivityLog[];

  const activityTotal =
    activityResult.count ||
    0;

  const activityTotalPages =
    Math.max(
      1,
      Math.ceil(
        activityTotal /
          ACTIVITY_PAGE_SIZE
      )
    );

  const activityPageNumbers =
    Array.from(
      {
        length:
          activityTotalPages,
      },
      (_, index) =>
        index + 1
    );

  const paymentProofs =
    paymentProofsResult.data ||
    [];

  const signedPaymentProofs =
    await Promise.all(
      paymentProofs.map(
        async (
          proof
        ) => {
          if (
            !proof.bucket ||
            !proof.path
          ) {
            return {
              ...proof,
              signedUrl:
                null,
            };
          }

          const {
            data,
          } =
            await db.storage
              .from(
                proof.bucket
              )
              .createSignedUrl(
                proof.path,
                60 * 60
              );

          return {
            ...proof,
            signedUrl:
              data?.signedUrl ||
              null,
          };
        }
      )
    );

  const inspirationFiles =
    signedFiles.filter(
      (file) =>
        file.kind ===
        "inspiration"
    );

  const studentValidId =
    signedFiles.find(
      (file) =>
        file.kind ===
        "student_valid_id"
    );

  const studentRegistration =
    signedFiles.find(
      (file) =>
        file.kind ===
        "student_registration"
    );

  const originalTotal =
    numberValue(
      booking.estimated_total
    ) ||
    services.reduce(
      (
        total,
        service
      ) =>
        total +
        numberValue(
          service.price
        ),
      0
    );

  const requestedDiscount =
    numberValue(
      booking.discount_amount
    );

  const discountVerified =
    Boolean(
      booking.discount_verified
    );

  const appliedDiscount =
    discountVerified
      ? requestedDiscount
      : 0;

  const finalTotal =
    Math.max(
      0,
      originalTotal -
        appliedDiscount
    );

  const verifiedPayments =
    payments.filter(
      (
        payment
      ) =>
        payment.status ===
          "verified" ||
        Boolean(
          payment.verified_at
        )
    );

  const paidTowardBooking =
    verifiedPayments
      .filter(
        (
          payment
        ) =>
          [
            "down_payment",
            "booking_payment",
            "balance",
          ].includes(
            String(
              payment.payment_type ||
                ""
            )
          )
      )
      .reduce(
        (
          total,
          payment
        ) =>
          total +
          numberValue(
            payment.net_amount ??
              payment.amount
          ),
        0
      );

  const tips =
    verifiedPayments
      .filter(
        (
          payment
        ) =>
          payment.payment_type ===
          "tip"
      )
      .reduce(
        (
          total,
          payment
        ) =>
          total +
          numberValue(
            payment.net_amount ??
              payment.amount
          ),
        0
      );

  const additionalCharges =
    verifiedPayments
      .filter(
        (
          payment
        ) =>
          payment.payment_type ===
          "additional_charge"
      )
      .reduce(
        (
          total,
          payment
        ) =>
          total +
          numberValue(
            payment.net_amount ??
              payment.amount
          ),
        0
      );

  const otherPayments =
    verifiedPayments
      .filter(
        (
          payment
        ) =>
          payment.payment_type ===
          "other"
      )
      .reduce(
        (
          total,
          payment
        ) =>
          total +
          numberValue(
            payment.net_amount ??
              payment.amount
          ),
        0
      );

  const balanceRemaining =
    Math.max(
      0,
      finalTotal -
        paidTowardBooking
    );

  const accessToken =
    booking.access_token ||
    null;

  const confirmationHref =
    accessToken
      ? `/confirmed/${accessToken}`
      : null;

  const bookingStatus =
    String(
      booking.status || ""
    );

  const promoName =
    String(
      booking.promo_name ||
        "Not Applicable"
    );

  const hasDiscount =
    promoName !==
      "Not Applicable" &&
    promoName !==
      "None" &&
    promoName.trim() !==
      "";

  const isStudentDiscount =
    promoName.startsWith(
      "Student / PWD / SC Discount"
    );

  const isReferral =
    promoName.startsWith(
      "Referral Program"
    );

  return (
    <main className="bd-page">
      <header className="bd-header">
        <div className="bd-header-copy">
          <div className="bd-kicker">
            Booking
          </div>

          <h1>
            Booking Details
          </h1>

          <p className="bd-reference">
            {booking.reference_code ||
              "Booking"}
          </p>
        </div>

        <Link
          href="/admin/bookings"
          className="bd-back-button"
        >
          ← Back to Bookings
        </Link>
      </header>

      <div className="bd-flow">
        {/* 1. CUSTOMER SUMMARY */}

        <section className="bd-card">
          <div className="bd-heading">
            <div>
              <h2>
                Customer
                Summary
              </h2>

              <p>
                Client
                information for
                this booking.
              </p>
            </div>
          </div>

          <div className="bd-grid bd-grid-4">
            <div className="bd-field">
              <span>
                Customer
              </span>

              <strong>
                {booking.customer_name ||
                  "—"}
              </strong>
            </div>

            <div className="bd-field">
              <span>
                Email
              </span>

              <strong>
                {booking.email ||
                  "—"}
              </strong>
            </div>

            <div className="bd-field">
              <span>
                Mobile
              </span>

              <strong>
                {booking.mobile_number ||
                  booking.mobile ||
                  booking.phone ||
                  "—"}
              </strong>
            </div>

            <div className="bd-field">
              <span>
                Status
              </span>

              <strong className="bd-status">
                {statusLabel(
                  booking.status
                )}
              </strong>
            </div>

            {booking.social_handle && (
              <div className="bd-field">
                <span>
                  IG /
                  Messenger
                </span>

                <strong>
                  {
                    booking.social_handle
                  }
                </strong>
              </div>
            )}
          </div>
        </section>

        {/* 2. APPOINTMENT DETAILS */}

        <section className="bd-card">
          <div className="bd-heading">
            <div>
              <h2>
                Appointment
                Details
              </h2>

              <p>
                Date, time,
                services and
                booking-form
                details.
              </p>
            </div>
          </div>

          <div className="bd-grid bd-grid-2">
            <div className="bd-info-box">
              <span>
                Date
              </span>

              <strong>
                {formatDate(
                  booking.preferred_date ||
                    booking.booking_date ||
                    null
                )}
              </strong>
            </div>

            <div className="bd-info-box">
              <span>
                Time
              </span>

              <strong>
                {formatTime(
                  booking.preferred_time ||
                    booking.booking_time ||
                    null
                )}
              </strong>
            </div>
          </div>

          <div className="bd-services">
            <h3>
              Services
            </h3>

            {services.length ===
            0 ? (
              <div className="bd-empty">
                No services
                found.
              </div>
            ) : (
              services.map(
                (
                  service
                ) => (
                  <div
                    key={
                      service.id
                    }
                    className="bd-service-row"
                  >
                    <div className="bd-service-details">
                      <strong>
                        {service.service_name ||
                          "Service"}
                      </strong>

                      {service.variation_name && (
                        <span>
                          {
                            service.variation_name
                          }
                        </span>
                      )}

                      {numberValue(
                        service.duration_minutes
                      ) >
                        0 && (
                        <small>
                          {
                            service.duration_minutes
                          }{" "}
                          min
                        </small>
                      )}
                    </div>

                    <strong className="bd-price">
                      {peso(
                        service.price
                      )}
                    </strong>
                  </div>
                )
              )
            )}
          </div>

          <div className="bd-booking-form-details">
            <div className="bd-field">
              <span>
                Removal
              </span>

              <strong>
                {booking.removal ||
                  "None"}
              </strong>
            </div>

            <div className="bd-field">
              <span>
                Selected
                Promo /
                Discount
              </span>

              <strong>
                {promoName}
              </strong>
            </div>

            {isReferral &&
              booking.referral_name && (
                <div className="bd-field">
                  <span>
                    Referred By
                  </span>

                  <strong>
                    {
                      booking.referral_name
                    }
                  </strong>
                </div>
              )}

            {booking.notes && (
              <div className="bd-field bd-full">
                <span>
                  Customer
                  Notes
                </span>

                <p className="bd-note">
                  {
                    booking.notes
                  }
                </p>
              </div>
            )}

            {booking.status ===
              "cancelled" && (
              <>
                <div className="bd-field">
                  <span>
                    Cancellation
                    Reason
                  </span>

                  <strong>
                    {booking.cancellation_reason ||
                      "—"}
                  </strong>
                </div>

                <div className="bd-field">
                  <span>
                    Cancelled At
                  </span>

                  <strong>
                    {formatDateTime(
                      booking.cancelled_at ||
                        null
                    )}
                  </strong>
                </div>

                {booking.cancellation_note && (
                  <div className="bd-field bd-full">
                    <span>
                      Cancellation
                      Note
                    </span>

                    <p className="bd-note">
                      {
                        booking.cancellation_note
                      }
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="bd-totals">
            <div>
              <span>
                Subtotal
              </span>

              <strong>
                {peso(
                  originalTotal
                )}
              </strong>
            </div>

            {requestedDiscount >
              0 && (
              <div className="bd-discount">
                <span>
                  Requested
                  Discount
                </span>

                <strong>
                  −
                  {peso(
                    requestedDiscount
                  )}
                </strong>
              </div>
            )}

            {requestedDiscount >
              0 &&
              !discountVerified && (
                <div>
                  <span>
                    Discount
                    Applied
                  </span>

                  <strong>
                    ₱0.00
                  </strong>
                </div>
              )}

            <div className="bd-grand-total">
              <span>
                Booking Total
              </span>

              <strong>
                {peso(
                  finalTotal
                )}
              </strong>
            </div>
          </div>
        </section>

        {/* 3. NAIL INSPIRATION */}

        {inspirationFiles.length >
          0 && (
          <section className="bd-card">
            <div className="bd-heading">
              <div>
                <h2>
                  Nail
                  Inspiration
                </h2>

                <p>
                  Inspiration
                  uploaded with
                  the booking
                  form.
                </p>
              </div>
            </div>

            <div className="bd-files">
              {inspirationFiles.map(
                (
                  file
                ) => (
                  <div
                    key={
                      file.id
                    }
                    className="bd-file-row"
                  >
                    <div>
                      <strong>
                        {file.file_name ||
                          "Nail inspiration"}
                      </strong>

                      <span>
                        {formatDateTime(
                          file.created_at
                        )}
                      </span>
                    </div>

                    {file.signedUrl && (
                      <a
                        href={
                          file.signedUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="bd-small-button"
                      >
                        View
                      </a>
                    )}
                  </div>
                )
              )}
            </div>
          </section>
        )}

        {/* 4. DISCOUNT VERIFICATION */}

        {hasDiscount && (
          <section className="bd-card">
            <div className="bd-heading">
              <div>
                <h2>
                  Discount
                  Verification
                </h2>

                <p>
                  Review the
                  discount or
                  promo selected
                  by the client.
                </p>
              </div>

              <span
                className={`bd-badge ${
                  discountVerified
                    ? "approved"
                    : "pending"
                }`}
              >
                {discountVerified
                  ? "Approved / Applied"
                  : "Not Approved"}
              </span>
            </div>

            <div className="bd-grid bd-grid-3">
              <div className="bd-field">
                <span>
                  Selected
                  Discount
                </span>

                <strong>
                  {promoName}
                </strong>
              </div>

              <div className="bd-field">
                <span>
                  Requested
                  Amount
                </span>

                <strong>
                  {peso(
                    requestedDiscount
                  )}
                </strong>
              </div>

              <div className="bd-field">
                <span>
                  Applied
                  Amount
                </span>

                <strong>
                  {peso(
                    appliedDiscount
                  )}
                </strong>
              </div>

              {isStudentDiscount && (
                <div className="bd-field">
                  <span>
                    Discount
                    Type
                  </span>

                  <strong>
                    {discountCategoryLabel(
                      booking.discount_category
                    )}
                  </strong>
                </div>
              )}

              {isReferral && (
                <div className="bd-field">
                  <span>
                    Referred By
                  </span>

                  <strong>
                    {booking.referral_name ||
                      "—"}
                  </strong>
                </div>
              )}

              {booking.discount_verified_at && (
                <div className="bd-field">
                  <span>
                    Verified At
                  </span>

                  <strong>
                    {formatDateTime(
                      booking.discount_verified_at
                    )}
                  </strong>
                </div>
              )}
            </div>

            {isStudentDiscount && (
              <div className="bd-student-docs">
                <h3>
                  Student /
                  PWD / SC
                  Verification
                </h3>

                <div className="bd-files">
                  <div className="bd-file-row">
                    <div>
                      <strong>
                        Valid ID
                      </strong>

                      <span>
                        {studentValidId
                          ? studentValidId.file_name ||
                            "Uploaded valid ID"
                          : "No valid ID uploaded"}
                      </span>
                    </div>

                    {studentValidId?.signedUrl && (
                      <a
                        href={
                          studentValidId.signedUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="bd-small-button"
                      >
                        View ID
                      </a>
                    )}
                  </div>

                  {booking.discount_category ===
                    "student" && (
                    <div className="bd-file-row">
                      <div>
                        <strong>
                          Registration
                          Card /
                          Form
                        </strong>

                        <span>
                          {studentRegistration
                            ? studentRegistration.file_name ||
                              "Uploaded registration"
                            : "No registration file uploaded"}
                        </span>
                      </div>

                      {studentRegistration?.signedUrl && (
                        <a
                          href={
                            studentRegistration.signedUrl
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="bd-small-button"
                        >
                          View
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* 5. BOOKING ACTIONS */}

        <section className="bd-card">
          <div className="bd-heading">
            <div>
              <h2>
                Booking
                Actions
              </h2>

              <p>
                Edit or manage
                the booking
                status.
              </p>
            </div>
          </div>

          <BookingActions
            id={booking.id}
            status={
              booking.status
            }
            confirmationHref={
              confirmationHref
            }
            promoName={
              hasDiscount
                ? promoName
                : null
            }
            discountAmount={
              requestedDiscount
            }
            discountVerified={
              discountVerified
            }
          />
        </section>

        {/* 6. PAYMENT PROOF */}

        <section className="bd-card">
          <div className="bd-heading">
            <div>
              <h2>
                Payment Proof
              </h2>

              <p>
                Proofs uploaded
                by the client.
              </p>
            </div>
          </div>

          {signedPaymentProofs.length ===
          0 ? (
            <div className="bd-empty">
              No payment proof
              uploaded.
            </div>
          ) : (
            <div className="bd-files">
              {signedPaymentProofs.map(
                (
                  proof
                ) => (
                  <div
                    key={
                      proof.id
                    }
                    className="bd-file-row"
                  >
                    <div>
                      <strong>
                        Payment
                        Proof
                      </strong>

                      <span>
                        {formatDateTime(
                          proof.created_at
                        )}
                      </span>
                    </div>

                    {proof.signedUrl && (
                      <a
                        href={
                          proof.signedUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="bd-small-button"
                      >
                        View Proof
                      </a>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* 7. PAYMENT HISTORY */}

        <section className="bd-card">
          <div className="bd-heading">
            <div>
              <h2>
                Payment
                History
              </h2>

              <p>
                All payment
                records for this
                booking.
              </p>
            </div>
          </div>

          <div className="bd-payment-summary">
            <div>
              <span>
                Booking Total
              </span>

              <strong>
                {peso(
                  finalTotal
                )}
              </strong>
            </div>

            <div>
              <span>
                Paid Toward
                Booking
              </span>

              <strong>
                {peso(
                  paidTowardBooking
                )}
              </strong>
            </div>

            <div>
              <span>
                Remaining
              </span>

              <strong>
                {peso(
                  balanceRemaining
                )}
              </strong>
            </div>

            <div>
              <span>
                Tips
              </span>

              <strong>
                {peso(tips)}
              </strong>
            </div>

            <div>
              <span>
                Additional
                Charges
              </span>

              <strong>
                {peso(
                  additionalCharges
                )}
              </strong>
            </div>

            <div>
              <span>
                Other
              </span>

              <strong>
                {peso(
                  otherPayments
                )}
              </strong>
            </div>
          </div>

          {payments.length ===
          0 ? (
            <div className="bd-empty">
              No payments
              recorded.
            </div>
          ) : (
            <div className="bd-payment-list">
              {payments.map(
                (
                  payment
                ) => (
                  <div
                    key={
                      payment.id
                    }
                    className="bd-payment-row"
                  >
                    <div className="bd-payment-left">
                      <strong>
                        {peso(
                          payment.net_amount ??
                            payment.amount
                        )}
                      </strong>

                      <span>
                        {payment.method ||
                          "Payment"}
                      </span>

                      <small>
                        {paymentTypeLabel(
                          payment.payment_type
                        )}
                      </small>

                      {payment.note && (
                        <small>
                          Note:{" "}
                          {
                            payment.note
                          }
                        </small>
                      )}
                    </div>

                    <div className="bd-payment-right">
                      <span
                        className={`bd-payment-status ${
                          payment.status ||
                          ""
                        }`}
                      >
                        {statusLabel(
                          payment.status
                        )}
                      </span>

                      <span>
                        {formatDateTime(
                          payment.paid_at ||
                            payment.verified_at ||
                            payment.created_at
                        )}
                      </span>

                      {payment.processing_fee !==
                        null &&
                        numberValue(
                          payment.processing_fee
                        ) >
                          0 && (
                          <span>
                            Fee:{" "}
                            {peso(
                              payment.processing_fee
                            )}
                          </span>
                        )}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* 8. PAYMENT ACTIONS */}

        <section className="bd-card">
          <div className="bd-heading">
            <div>
              <h2>
                Payment
                Actions
              </h2>

              <p>
                Verify, reject,
                record payments,
                or open the
                client payment
                page.
              </p>
            </div>
          </div>

          <div className="bd-payment-actions">
            <AdminBookingPaymentManager
              bookingId={
                booking.id
              }
              bookingStatus={
                bookingStatus
              }
              bookingTotal={
                finalTotal
              }
              paidTowardBooking={
                paidTowardBooking
              }
              remainingBalance={
                balanceRemaining
              }
              payments={
                payments
              }
            />

            {accessToken &&
              bookingStatus ===
                "approved" && (
                <BookingPaymentActions
                  token={
                    accessToken
                  }
                />
              )}
          </div>
        </section>

        {/* 9. ACTIVITY LOGS — ALWAYS LAST */}

        <section
          id="booking-activity-log"
          className="bd-card bd-activity-card"
        >
          <details
            open={
              activityPaginationRequested
                ? true
                : undefined
            }
          >
            <summary className="bd-activity-summary">
              <div>
                <h2>
                  Activity Logs
                </h2>

                <p>
                  Changes and
                  actions
                  performed on
                  this booking.
                </p>
              </div>

              <span className="bd-count">
                {
                  activityTotal
                }
              </span>
            </summary>

            <div className="bd-activity-body">
              {activities.length ===
              0 ? (
                <div className="bd-empty">
                  No activity has
                  been recorded
                  yet.
                </div>
              ) : (
                <div className="bd-activity-list">
                  {activities.map(
                    (
                      activity
                    ) => (
                      <div
                        key={
                          activity.id
                        }
                        className="bd-activity-item"
                      >
                        <div className="bd-activity-dot" />

                        <div className="bd-activity-content">
                          <div className="bd-activity-top">
                            <strong>
                              {prettyAction(
                                activity.action
                              )}
                            </strong>

                            <span>
                              {formatDateTime(
                                activity.created_at
                              )}
                            </span>
                          </div>

                          {activity.description && (
                            <p>
                              {
                                activity.description
                              }
                            </p>
                          )}

                          {((activity.old_value !==
                            null &&
                            activity.old_value !==
                              undefined) ||
                            (activity.new_value !==
                              null &&
                            activity.new_value !==
                              undefined)) && (
                            <div className="bd-changes">
                              <div className="bd-change-box">
                                <span>
                                  Previous
                                </span>

                                <div className="bd-change-values">
                                  {activityValueRows(
                                    activity.old_value
                                  ).map(
                                    (
                                      row,
                                      index
                                    ) => (
                                      <div
                                        key={`${row.label}-${index}`}
                                        className="bd-change-row"
                                      >
                                        <small>
                                          {
                                            row.label
                                          }
                                        </small>

                                        <strong>
                                          {
                                            row.value
                                          }
                                        </strong>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>

                              <div className="bd-change-box">
                                <span>
                                  New
                                </span>

                                <div className="bd-change-values">
                                  {activityValueRows(
                                    activity.new_value
                                  ).map(
                                    (
                                      row,
                                      index
                                    ) => (
                                      <div
                                        key={`${row.label}-${index}`}
                                        className="bd-change-row"
                                      >
                                        <small>
                                          {
                                            row.label
                                          }
                                        </small>

                                        <strong>
                                          {
                                            row.value
                                          }
                                        </strong>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="bd-actor">
                            By{" "}
                            <strong>
                              {activity.actor_email ||
                                activity.actor_id ||
                                "System"}
                            </strong>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}

              {activityTotalPages > 1 && (
                <nav
                  className="bd-activity-pagination"
                  aria-label="Activity log pages"
                >
                  {activityPage > 1 && (
                    <Link
                      href={`/admin/bookings/${id}?activityPage=${
                        activityPage - 1
                      }#booking-activity-log`}
                      className="bd-page-link bd-page-nav"
                    >
                      Previous
                    </Link>
                  )}

                  <div className="bd-page-numbers">
                    {activityPageNumbers.map(
                      (pageNumber) => (
                        <Link
                          key={
                            pageNumber
                          }
                          href={`/admin/bookings/${id}?activityPage=${pageNumber}#booking-activity-log`}
                          className={`bd-page-link ${
                            pageNumber ===
                            activityPage
                              ? "active"
                              : ""
                          }`}
                          aria-current={
                            pageNumber ===
                            activityPage
                              ? "page"
                              : undefined
                          }
                        >
                          {pageNumber}
                        </Link>
                      )
                    )}
                  </div>

                  {activityPage <
                    activityTotalPages && (
                    <Link
                      href={`/admin/bookings/${id}?activityPage=${
                        activityPage + 1
                      }#booking-activity-log`}
                      className="bd-page-link bd-page-nav"
                    >
                      Next
                    </Link>
                  )}
                </nav>
              )}
            </div>
          </details>
        </section>
      </div>

      <style>{`
        .bd-page,
        .bd-page * {
          box-sizing: border-box;
        }

        .bd-page {
          width: 100%;
          max-width: 1050px;
          margin: 0 auto;
          padding: 28px;
          color: #111;
          overflow-x: hidden;
        }

        .bd-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 22px;
        }

        .bd-header-copy {
          min-width: 0;
          flex: 1;
        }

        .bd-kicker {
          margin-bottom: 5px;
          color: #777;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .bd-page h1 {
          margin: 0;
          font-family: inherit;
          font-size: 27px;
          font-weight: 700;
          line-height: 1.2;
        }

        .bd-reference {
          margin: 5px 0 0;
          color: #777;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .bd-back-button {
          flex: 0 0 auto;
          min-height: 42px;
          padding: 10px 14px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #fff;
          color: #111;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: inherit;
          font-size: 14px;
          font-weight: 600;
          line-height: 1.2;
          text-decoration: none;
          white-space: nowrap;
        }

        .bd-back-button:hover {
          background: #f7f7f7;
        }

        .bd-flow {
          display: grid;
          gap: 16px;
        }

        .bd-card {
          width: 100%;
          min-width: 0;
          padding: 22px;
          border: 1px solid #e4dfdd;
          border-radius: 14px;
          background: #fff;
          overflow: hidden;
        }

        .bd-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 18px;
        }

        .bd-heading h2,
        .bd-activity-summary h2 {
          margin: 0;
          font-size: 18px;
          line-height: 1.3;
        }

        .bd-heading p,
        .bd-activity-summary p {
          margin: 4px 0 0;
          color: #777;
          font-size: 12px;
          line-height: 1.45;
        }

        .bd-grid {
          display: grid;
          gap: 16px;
        }

        .bd-grid-4 {
          grid-template-columns:
            repeat(
              4,
              minmax(0, 1fr)
            );
        }

        .bd-grid-3 {
          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );
        }

        .bd-grid-2 {
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
        }

        .bd-field {
          min-width: 0;
        }

        .bd-full {
          grid-column: 1 / -1;
        }

        .bd-field > span,
        .bd-info-box > span,
        .bd-payment-summary span,
        .bd-change-box > span {
          display: block;
          margin-bottom: 5px;
          color: #777;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .04em;
          text-transform: uppercase;
        }

        .bd-field strong {
          display: block;
          min-width: 0;
          font-size: 14px;
          line-height: 1.45;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .bd-note {
          margin: 0;
          color: #333;
          font-size: 13px;
          line-height: 1.55;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .bd-status {
          text-transform: capitalize;
        }

        .bd-info-box {
          padding: 15px;
          border: 1px solid #e5e0de;
          border-radius: 10px;
          background: #faf9f8;
        }

        .bd-info-box strong {
          font-size: 15px;
        }

        .bd-services {
          margin-top: 22px;
        }

        .bd-services h3,
        .bd-student-docs h3 {
          margin: 0 0 10px;
          font-size: 13px;
        }

        .bd-service-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 13px 0;
          border-top: 1px solid #eee;
        }

        .bd-service-details {
          min-width: 0;
          flex: 1;
        }

        .bd-service-details strong {
          display: block;
          font-size: 14px;
          line-height: 1.4;
        }

        .bd-service-details span,
        .bd-service-details small {
          display: inline-block;
          margin-top: 3px;
          margin-right: 8px;
          color: #777;
          font-size: 12px;
          line-height: 1.4;
        }

        .bd-price {
          flex: 0 0 auto;
          font-size: 14px;
          white-space: nowrap;
        }

        .bd-booking-form-details {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
          gap: 16px;
          margin-top: 20px;
          padding-top: 18px;
          border-top: 1px solid #eee;
        }

        .bd-totals {
          margin-top: 18px;
          padding-top: 12px;
          border-top: 1px solid #ddd;
        }

        .bd-totals > div {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 5px 0;
          color: #444;
          font-size: 13px;
        }

        .bd-discount {
          color: #176b2c !important;
        }

        .bd-grand-total {
          margin-top: 5px;
          padding-top: 12px !important;
          border-top: 1px solid #ddd;
          color: #111 !important;
          font-size: 15px !important;
          font-weight: 700;
        }

        .bd-grand-total strong {
          font-size: 17px;
        }

        .bd-files {
          width: 100%;
        }

        .bd-file-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          padding: 13px 0;
          border-top: 1px solid #eee;
        }

        .bd-file-row > div {
          min-width: 0;
          flex: 1;
        }

        .bd-file-row strong {
          display: block;
          font-size: 13px;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .bd-file-row span {
          display: block;
          margin-top: 3px;
          color: #777;
          font-size: 11px;
          line-height: 1.4;
        }

        .bd-small-button {
          flex: 0 0 auto;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #fff;
          color: #111;
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
          white-space: nowrap;
        }

        .bd-small-button:hover {
          background: #f7f7f7;
        }

        .bd-badge {
          flex: 0 0 auto;
          padding: 6px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
        }

        .bd-badge.approved {
          background: #edf8f0;
          color: #176b2c;
        }

        .bd-badge.pending {
          background: #f3f3f3;
          color: #666;
        }

        .bd-student-docs {
          margin-top: 20px;
          padding-top: 18px;
          border-top: 1px solid #eee;
        }

        .bd-payment-summary {
          display: grid;
          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );
          gap: 10px;
          margin-bottom: 18px;
        }

        .bd-payment-summary > div {
          min-width: 0;
          padding: 12px;
          border-radius: 9px;
          background: #f7f6f5;
        }

        .bd-payment-summary strong {
          display: block;
          font-size: 14px;
          overflow-wrap: anywhere;
        }

        .bd-payment-list {
          width: 100%;
        }

        .bd-payment-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
          padding: 13px 0;
          border-top: 1px solid #eee;
        }

        .bd-payment-left {
          min-width: 0;
          flex: 1;
        }

        .bd-payment-left strong {
          display: block;
          font-size: 14px;
        }

        .bd-payment-left span,
        .bd-payment-left small {
          display: block;
          margin-top: 2px;
          color: #777;
          font-size: 12px;
          line-height: 1.4;
        }

        .bd-payment-right {
          max-width: 45%;
          text-align: right;
        }

        .bd-payment-right > span {
          display: block;
          color: #777;
          font-size: 11px;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .bd-payment-status {
          display: inline-block !important;
          margin-bottom: 4px;
          padding: 4px 8px;
          border-radius: 999px;
          background: #f1f1f1;
          color: #444 !important;
          font-weight: 600;
        }

        .bd-payment-status.verified {
          background: #edf8f0;
          color: #176b2c !important;
        }

        .bd-payment-status.rejected {
          background: #fff0ef;
          color: #a61b13 !important;
        }

        .bd-payment-actions {
          display: grid;
          gap: 20px;
        }

        .bd-activity-card {
          padding: 0;
        }

        .bd-activity-card details {
          width: 100%;
        }

        .bd-activity-summary {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 22px;
          cursor: pointer;
          list-style: none;
        }

        .bd-activity-summary::-webkit-details-marker {
          display: none;
        }

        .bd-activity-summary::after {
          content: "＋";
          flex: 0 0 auto;
          color: #777;
          font-size: 18px;
        }

        .bd-activity-card details[open]
          .bd-activity-summary::after {
          content: "−";
        }

        .bd-activity-summary > div {
          min-width: 0;
          flex: 1;
        }

        .bd-count {
          flex: 0 0 auto;
          min-width: 30px;
          padding: 5px 8px;
          border-radius: 999px;
          background: #f2f2f2;
          color: #555;
          font-size: 11px;
          font-weight: 700;
          text-align: center;
        }

        .bd-activity-body {
          padding: 0 22px 22px;
          border-top: 1px solid #eee;
        }

        .bd-activity-list {
          padding-top: 18px;
        }

        .bd-activity-item {
          display: flex;
          gap: 12px;
          padding-bottom: 24px;
        }

        .bd-activity-item:last-child {
          padding-bottom: 0;
        }

        .bd-activity-dot {
          flex: 0 0 9px;
          width: 9px;
          height: 9px;
          margin-top: 5px;
          border-radius: 50%;
          background: #111;
        }

        .bd-activity-content {
          min-width: 0;
          flex: 1;
        }

        .bd-activity-top {
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .bd-activity-top strong {
          font-size: 14px;
          line-height: 1.4;
        }

        .bd-activity-top span {
          max-width: 45%;
          color: #777;
          font-size: 11px;
          text-align: right;
        }

        .bd-activity-content > p {
          margin: 6px 0 10px;
          color: #444;
          font-size: 13px;
          line-height: 1.5;
        }

        .bd-changes {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
          gap: 10px;
          margin-bottom: 9px;
        }

        .bd-change-box {
          min-width: 0;
          padding: 9px;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          background: #fafafa;
        }

        .bd-change-values {
          display: grid;
          gap: 8px;
        }

        .bd-change-row {
          min-width: 0;
        }

        .bd-change-row small {
          display: block;
          margin-bottom: 2px;
          color: #777;
          font-size: 10px;
          font-weight: 600;
          line-height: 1.3;
        }

        .bd-change-row strong {
          display: block;
          color: #222;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.45;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .bd-actor {
          color: #777;
          font-size: 11px;
          line-height: 1.4;
        }

        .bd-actor strong {
          color: #555;
        }

        .bd-activity-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid #eee;
          flex-wrap: wrap;
        }

        .bd-page-numbers {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .bd-page-link {
          min-width: 32px;
          height: 32px;
          padding: 0 9px;
          border: 1px solid #ddd;
          border-radius: 7px;
          background: #fff;
          color: #333;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          line-height: 1;
          text-decoration: none;
        }

        .bd-page-link:hover {
          background: #f7f4f3;
        }

        .bd-page-link.active {
          border-color: #332b2d;
          background: #332b2d;
          color: #fff;
        }

        .bd-page-nav {
          min-width: auto;
          padding: 0 11px;
        }

        .bd-empty {
          padding: 16px 0;
          color: #777;
          font-size: 13px;
          line-height: 1.4;
        }

        @media (
          max-width: 850px
        ) {
          .bd-grid-4,
          .bd-grid-3 {
            grid-template-columns:
              repeat(
                2,
                minmax(
                  0,
                  1fr
                )
              );
          }

          .bd-payment-summary {
            grid-template-columns:
              repeat(
                2,
                minmax(
                  0,
                  1fr
                )
              );
          }
        }

        @media (
          max-width: 600px
        ) {
          .bd-page {
            padding: 18px 13px;
          }

          .bd-header {
            align-items: flex-start;
            gap: 12px;
          }

          .bd-back-button {
            min-height: 38px;
            padding: 8px 10px;
            font-size: 12px;
          }

          .bd-page h1 {
            font-size: 26px;
          }

          .bd-card {
            padding: 17px;
          }

          .bd-grid-4,
          .bd-grid-3,
          .bd-grid-2,
          .bd-booking-form-details,
          .bd-payment-summary,
          .bd-changes {
            grid-template-columns:
              1fr;
          }

          .bd-service-row,
          .bd-file-row,
          .bd-payment-row {
            flex-direction:
              column;
            align-items:
              flex-start;
          }

          .bd-payment-right {
            width: 100%;
            max-width: 100%;
            text-align: left;
          }

          .bd-small-button {
            width: 100%;
          }

          .bd-heading {
            flex-direction:
              column;
          }

          .bd-activity-summary {
            padding: 17px;
          }

          .bd-activity-body {
            padding:
              0 17px 17px;
          }

          .bd-activity-top {
            flex-direction:
              column;
            gap: 4px;
          }

          .bd-activity-top span {
            max-width: 100%;
            text-align: left;
          }
        }
      `}</style>
    </main>
  );
}
