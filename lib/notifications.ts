import { Resend } from "resend";

const apiKey =
  process.env.RESEND_API_KEY;

const adminEmail =
  process.env.ADMIN_NOTIFICATION_EMAIL;

const resend = apiKey
  ? new Resend(apiKey)
  : null;

const fromEmail =
  process.env.RESEND_FROM_EMAIL ||
  "The Claw Lab MNL <onboarding@resend.dev>";

function peso(
  amount: number | string | null | undefined
) {
  return `₱${Number(amount || 0).toLocaleString(
    "en-PH",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function escapeHtml(
  value: unknown
) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatBookingDate(
  value: string | undefined
) {
  if (!value) {
    return "";
  }

  const match =
    value.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!match) {
    return value;
  }

  const year =
    Number(match[1]);

  const month =
    Number(match[2]);

  const day =
    Number(match[3]);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }
  );
}

function formatBookingTime(
  value: string | undefined
) {
  if (!value) {
    return "";
  }

  const match =
    value.match(
      /^(\d{1,2}):(\d{2})/
    );

  if (!match) {
    return value;
  }

  let hours =
    Number(match[1]);

  const minutes =
    Number(match[2]);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return value;
  }

  const suffix =
    hours >= 12
      ? "PM"
      : "AM";

  hours =
    hours % 12 || 12;

  return `${hours}:${String(
    minutes
  ).padStart(2, "0")} ${suffix}`;
}

async function sendAdminEmail({
  subject,
  html,
}: {
  subject: string;
  html: string;
}) {
  if (!resend) {
    console.error(
      "Email notification skipped: RESEND_API_KEY is not configured."
    );
    return;
  }

  if (!adminEmail) {
    console.error(
      "Email notification skipped: ADMIN_NOTIFICATION_EMAIL is not configured."
    );
    return;
  }

  try {
    const result =
      await resend.emails.send({
        from: fromEmail,
        to: [adminEmail],
        subject,
        html,
      });

    if (result.error) {
      console.error(
        "Resend error:",
        result.error
      );
    }
  } catch (error) {
    console.error(
      "Admin email notification failed:",
      error
    );
  }
}

/*
 * CUSTOMER BOOKING EMAIL
 *
 * Sent once when a new booking request
 * is submitted and becomes pending.
 *
 * There are no customer emails for
 * normal later status changes.
 */
async function sendCustomerBookingEmail({
  booking,
  services,
}: {
  booking: {
    reference_code?: string;
    customer_name?: string;
    email?: string;
    preferred_date?: string;
    preferred_time?: string;
  };
  services: Array<{
    service_name?: string;
    variation_name?: string | null;
  }>;
}) {
  if (!resend) {
    console.error(
      "Customer email skipped: RESEND_API_KEY is not configured."
    );
    return;
  }

  const customerEmail =
    booking.email?.trim();

  if (!customerEmail) {
    console.error(
      "Customer email skipped: customer email address is missing."
    );
    return;
  }

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    ""
  ).replace(/\/$/, "");

  if (!siteUrl) {
    console.error(
      "Customer email skipped: NEXT_PUBLIC_SITE_URL is not configured."
    );
    return;
  }

  const reference =
    booking.reference_code ||
    "";

  if (!reference) {
    console.error(
      "Customer email skipped: booking reference is missing."
    );
    return;
  }

  const serviceText =
    services
      .map(
        (item) =>
          `${item.service_name || "Service"}${
            item.variation_name
              ? ` — ${item.variation_name}`
              : ""
          }`
      )
      .join(", ") ||
    "Service";

  const statusUrl =
    `${siteUrl}/status/${encodeURIComponent(
      reference
    )}`;

  const customerName =
    booking.customer_name ||
    "there";

  try {
    const result =
      await resend.emails.send({
        from: fromEmail,
        to: [customerEmail],
        subject:
          `Booking Request Received — ${reference}`,
        html: `
          <div
            style="
              font-family:Arial,sans-serif;
              max-width:620px;
              margin:0 auto;
              padding:20px;
              color:#3d3535;
              line-height:1.65;
            "
          >
            <div
              style="
                font-size:11px;
                letter-spacing:.14em;
                text-transform:uppercase;
                color:#9d7b7b;
                margin-bottom:18px;
              "
            >
              The Claw Lab MNL
            </div>

            <h1
              style="
                font-family:Georgia,serif;
                font-size:30px;
                font-weight:500;
                margin:0 0 12px;
              "
            >
              Booking Request Received ♡
            </h1>

            <p>
              Hi ${escapeHtml(customerName)}!
            </p>

            <p>
              Your booking request with
              <strong>
                The Claw Lab MNL
              </strong>
              has been received.
            </p>

            <div
              style="
                margin:24px 0;
                padding:22px;
                border:1px solid #eadede;
                border-radius:16px;
                background:#fcfaf9;
              "
            >
              <p style="margin:0 0 12px;">
                <strong>Booking ID:</strong><br />
                ${escapeHtml(reference)}
              </p>

              <p style="margin:0 0 12px;">
                <strong>Date:</strong><br />
                ${escapeHtml(
                  formatBookingDate(
                    booking.preferred_date
                  )
                )}
              </p>

              <p style="margin:0 0 12px;">
                <strong>Time:</strong><br />
                ${escapeHtml(
                  formatBookingTime(
                    booking.preferred_time
                  )
                )}
              </p>

              <p style="margin:0 0 12px;">
                <strong>Service:</strong><br />
                ${escapeHtml(serviceText)}
              </p>

              <p style="margin:0;">
                <strong>Status:</strong><br />

                <span
                  style="
                    display:inline-block;
                    margin-top:4px;
                    padding:5px 10px;
                    border-radius:999px;
                    background:#f1e4e6;
                    color:#73535a;
                    font-size:11px;
                    font-weight:700;
                    letter-spacing:.04em;
                  "
                >
                  PENDING
                </span>
              </p>
            </div>

            <p>
              Check your booking, payment instructions,
              updates, and status here:
            </p>

            <p style="margin:22px 0;">
              <a
                href="${escapeHtml(statusUrl)}"
                style="
                  display:inline-block;
                  background:#3d3535;
                  color:#fff;
                  text-decoration:none;
                  padding:12px 20px;
                  border-radius:999px;
                  font-size:13px;
                  font-weight:600;
                "
              >
                View My Booking →
              </a>
            </p>

            <p
              style="
                font-size:12px;
                color:#777;
                word-break:break-all;
              "
            >
              ${escapeHtml(statusUrl)}
            </p>

            <p>
              Please use this link for all booking
              updates. Thank you! 💅
            </p>

            <div
              style="
                margin-top:30px;
                padding-top:18px;
                border-top:1px solid #eee7e5;
                color:#8a7b7b;
                font-size:12px;
              "
            >
              <strong>
                The Claw Lab MNL
              </strong>
              <br />
              Novaliches, Quezon City, Philippines

              <p
                style="
                  margin:14px 0 0;
                  color:#8a7b7b;
                  font-size:11px;
                  line-height:1.5;
                "
              >
                Please do not reply to this email.
                This inbox is not monitored and replies
                will not be received.
              </p>
            </div>
          </div>
        `,
      });

    if (result.error) {
      console.error(
        "Customer email Resend error:",
        result.error
      );
    } else {
      console.log(
        "Customer booking email sent:",
        reference
      );
    }
  } catch (error) {
    console.error(
      "Customer booking email failed:",
      error
    );
  }
}

/*
 * CUSTOMER COMPLETED EMAIL
 *
 * Sent when an admin marks a booking
 * as COMPLETED.
 *
 * This invites the customer to leave
 * a review and explains the ₱50 referral
 * reward.
 */
export async function notifyBookingCompleted({
  booking,
}: {
  booking: {
    id?: string;
    reference_code?: string;
    customer_name?: string;
    email?: string;
  };
}) {
  if (!resend) {
    console.error(
      "Completed booking email skipped: RESEND_API_KEY is not configured."
    );
    return;
  }

  const customerEmail =
    booking.email?.trim();

  if (!customerEmail) {
    console.error(
      "Completed booking email skipped: customer email address is missing."
    );
    return;
  }

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    ""
  ).replace(/\/$/, "");

  if (!siteUrl) {
    console.error(
      "Completed booking email skipped: NEXT_PUBLIC_SITE_URL is not configured."
    );
    return;
  }

  const bookingId =
    booking.id?.trim();

  if (!bookingId) {
    console.error(
      "Completed booking email skipped: booking ID is missing."
    );
    return;
  }

  const reference =
    booking.reference_code ||
    "";

  const reviewUrl =
    `${siteUrl}/review?booking_id=${encodeURIComponent(
      bookingId
    )}`;

  const customerName =
    booking.customer_name ||
    "there";

  try {
    const result =
      await resend.emails.send({
        from: fromEmail,
        to: [customerEmail],
        subject:
          "Thank You for Visiting The Claw Lab MNL ♡",
        html: `
          <div
            style="
              font-family:Arial,sans-serif;
              max-width:620px;
              margin:0 auto;
              padding:20px;
              color:#3d3535;
              line-height:1.65;
            "
          >
            <div
              style="
                font-size:11px;
                letter-spacing:.14em;
                text-transform:uppercase;
                color:#9d7b7b;
                margin-bottom:18px;
              "
            >
              The Claw Lab MNL
            </div>

            <h1
              style="
                font-family:Georgia,serif;
                font-size:30px;
                font-weight:500;
                margin:0 0 12px;
              "
            >
              Thank You for Visiting ♡
            </h1>

            <p>
              Hi ${escapeHtml(customerName)}!
            </p>

            <p>
              Thank you for choosing
              <strong>
                The Claw Lab MNL
              </strong>
              and spending part of your day with us.
              We hope you enjoyed your appointment
              and left feeling extra happy with your nails.
            </p>

            <p>
              We truly appreciate your support,
              and we'd love to hear about your experience.
            </p>

            <div
              style="
                margin:24px 0;
                padding:22px;
                border:1px solid #eadede;
                border-radius:16px;
                background:#fcfaf9;
              "
            >
              <p
                style="
                  margin:0 0 14px;
                  font-family:Georgia,serif;
                  font-size:21px;
                "
              >
                Loved your nails? ♡
              </p>

              <p style="margin:0;">
                Leave us a quick review and let us know
                what you think. Your feedback means a lot
                to us!
              </p>
            </div>

            <p style="margin:22px 0;">
              <a
                href="${escapeHtml(reviewUrl)}"
                style="
                  display:inline-block;
                  background:#3d3535;
                  color:#fff;
                  text-decoration:none;
                  padding:12px 20px;
                  border-radius:999px;
                  font-size:13px;
                  font-weight:600;
                "
              >
                Leave a Review ♡
              </a>
            </p>

            <div
              style="
                margin:28px 0;
                padding:22px;
                border:1px solid #eadede;
                border-radius:16px;
                background:#fcfaf9;
              "
            >
              <p
                style="
                  margin:0 0 14px;
                  font-family:Georgia,serif;
                  font-size:21px;
                "
              >
                Loved it enough to share? 💅
              </p>

              <p style="margin:0 0 12px;">
                Refer a friend to
                <strong>
                  The Claw Lab MNL
                </strong>
                and get
                <strong>₱50 off your next booking</strong>
                once your referred friend completes
                their session.
              </p>

              <p
                style="
                  margin:0;
                  color:#6f6464;
                  font-size:13px;
                "
              >
                Just have them mention your name
                when they book. ♡
              </p>
            </div>

            <p
              style="
                font-size:12px;
                color:#777;
                word-break:break-all;
              "
            >
              Review link:<br />
              ${escapeHtml(reviewUrl)}
            </p>

            ${
              reference
                ? `
                  <p
                    style="
                      margin-top:22px;
                      font-size:12px;
                      color:#8a7b7b;
                    "
                  >
                    Booking ID:
                    <strong>
                      ${escapeHtml(reference)}
                    </strong>
                  </p>
                `
                : ""
            }

            <div
              style="
                margin-top:30px;
                padding-top:18px;
                border-top:1px solid #eee7e5;
                color:#8a7b7b;
                font-size:12px;
              "
            >
              <strong>
                The Claw Lab MNL
              </strong>
              <br />
              Novaliches, Quezon City, Philippines

              <p
                style="
                  margin:14px 0 0;
                  color:#8a7b7b;
                  font-size:11px;
                  line-height:1.5;
                "
              >
                Please do not reply to this email.
                This inbox is not monitored and replies
                will not be received.
              </p>
            </div>
          </div>
        `,
      });

    if (result.error) {
      console.error(
        "Completed booking customer email Resend error:",
        result.error
      );
    } else {
      console.log(
        "Completed booking customer email sent:",
        reference
      );
    }
  } catch (error) {
    console.error(
      "Completed booking customer email failed:",
      error
    );
  }
}

export async function notifyNewBooking({
  booking,
  services,
}: {
  booking: {
    id?: string;
    reference_code?: string;
    customer_name?: string;
    email?: string;
    mobile_number?: string;
    social_handle?: string;
    preferred_date?: string;
    preferred_time?: string;
    estimated_total?: number | string;
    removal?: string;
    notes?: string;
    access_token?: string;
  };
  services: Array<{
    service_name?: string;
    variation_name?: string | null;
    price?: number | string;
  }>;
}) {
  const serviceList =
    services
      .map(
        (item) =>
          `${item.service_name || "Service"}${
            item.variation_name
              ? ` — ${item.variation_name}`
              : ""
          }`
      )
      .join("<br />") ||
    "No services listed";

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    ""
  ).replace(/\/$/, "");

  const adminLink = booking.id
    ? `${siteUrl}/admin/bookings/${booking.id}`
    : `${siteUrl}/admin/bookings`;

  await sendAdminEmail({
    subject: `New Booking Request — ${
      booking.reference_code ||
      "The Claw Lab MNL"
    }`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#3d3535;line-height:1.6">

        <p style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#9d7b7b">
          The Claw Lab MNL
        </p>

        <h1 style="font-family:Georgia,serif;font-weight:500">
          New Booking Request
        </h1>

        <p>
          A new customer booking request has been submitted.
        </p>

        <div style="border:1px solid #eadede;border-radius:16px;padding:20px">

          <p>
            <strong>Reference:</strong>
            ${escapeHtml(
              booking.reference_code
            )}
          </p>

          <p>
            <strong>Customer:</strong>
            ${escapeHtml(
              booking.customer_name
            )}
          </p>

          <p>
            <strong>Email:</strong>
            ${escapeHtml(
              booking.email
            )}
          </p>

          <p>
            <strong>Mobile:</strong>
            ${escapeHtml(
              booking.mobile_number
            )}
          </p>

          <p>
            <strong>IG / Messenger:</strong>
            ${escapeHtml(
              booking.social_handle ||
                "Not provided"
            )}
          </p>

          <p>
            <strong>Date:</strong>
            ${escapeHtml(
              booking.preferred_date
            )}
          </p>

          <p>
            <strong>Time:</strong>
            ${escapeHtml(
              booking.preferred_time
            )}
          </p>

          <p>
            <strong>Services:</strong><br />
            ${serviceList}
          </p>

          <p>
            <strong>Estimated Total:</strong>
            ${peso(
              booking.estimated_total
            )}
          </p>

          <p>
            <strong>Removal:</strong>
            ${escapeHtml(
              booking.removal ||
                "None"
            )}
          </p>

          ${
            booking.notes
              ? `
                <p>
                  <strong>Notes:</strong><br />
                  ${escapeHtml(
                    booking.notes
                  ).replaceAll(
                    "\n",
                    "<br />"
                  )}
                </p>
              `
              : ""
          }

        </div>

        <p style="margin-top:24px">

          <a
            href="${escapeHtml(
              adminLink
            )}"
            style="display:inline-block;background:#3d3535;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px"
          >
            Open Booking in Admin →
          </a>

        </p>

        <p style="font-size:12px;color:#8a7b7b;margin-top:28px">
          Automated notification from The Claw Lab MNL.
        </p>

        <p
          style="
            margin-top:14px;
            padding-top:14px;
            border-top:1px solid #eee7e5;
            color:#8a7b7b;
            font-size:11px;
            line-height:1.5;
          "
        >
          Please do not reply to this email.
          This inbox is not monitored and replies
          will not be received.
        </p>

      </div>
    `,
  });

  await sendCustomerBookingEmail({
    booking,
    services,
  });
}

export async function notifyPaymentProofSubmitted({
  booking,
  method,
  amount,
}: {
  booking: {
    id?: string;
    reference_code?: string;
    customer_name?: string;
    preferred_date?: string;
    preferred_time?: string;
  };
  method?: string;
  amount?: number | string;
}) {
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    ""
  ).replace(/\/$/, "");

  const adminLink =
    `${siteUrl}/admin/payments`;

  await sendAdminEmail({
    subject: `Payment Proof Submitted — ${
      booking.reference_code ||
      "The Claw Lab MNL"
    }`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#3d3535;line-height:1.6">

        <p style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#9d7b7b">
          The Claw Lab MNL
        </p>

        <h1 style="font-family:Georgia,serif;font-weight:500">
          Payment Proof Submitted
        </h1>

        <p>
          A customer has uploaded payment proof and it is ready for verification.
        </p>

        <div style="border:1px solid #eadede;border-radius:16px;padding:20px">

          <p>
            <strong>Reference:</strong>
            ${escapeHtml(
              booking.reference_code
            )}
          </p>

          <p>
            <strong>Customer:</strong>
            ${escapeHtml(
              booking.customer_name
            )}
          </p>

          <p>
            <strong>Appointment:</strong>
            ${escapeHtml(
              booking.preferred_date
            )}
            ·
            ${escapeHtml(
              booking.preferred_time
            )}
          </p>

          <p>
            <strong>Payment Method:</strong>
            ${escapeHtml(
              method
            )}
          </p>

          <p>
            <strong>Amount:</strong>
            ${peso(
              amount
            )}
          </p>

        </div>

        <p style="margin-top:24px">

          <a
            href="${escapeHtml(
              adminLink
            )}"
            style="display:inline-block;background:#3d3535;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px"
          >
            Review Payment →
          </a>

        </p>

        <p
          style="
            margin-top:28px;
            padding-top:14px;
            border-top:1px solid #eee7e5;
            color:#8a7b7b;
            font-size:11px;
            line-height:1.5;
          "
        >
          Please do not reply to this email.
          This inbox is not monitored and replies
          will not be received.
        </p>

      </div>
    `,
  });
}