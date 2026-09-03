import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;

const resend = apiKey ? new Resend(apiKey) : null;

const fromEmail =
  process.env.RESEND_FROM_EMAIL ||
  "The Claw Lab MNL <onboarding@resend.dev>";

function peso(amount: number | string | null | undefined) {
  return `₱${Number(amount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatBookingDate(value: string | undefined) {
  if (!value) return "";

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;

  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  );

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatBookingTime(value: string | undefined) {
  if (!value) return "";

  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);

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

  const suffix = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${hours}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
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
    const result = await resend.emails.send({
      from: fromEmail,
      to: [adminEmail],
      subject,
      html,
    });

    if (result.error) {
      console.error("Resend error:", result.error);
    }
  } catch (error) {
    console.error("Admin email notification failed:", error);
  }
}

/*
 * CUSTOMER BOOKING REQUEST EMAIL
 *
 * Exactly one customer email is sent when the booking
 * is submitted and becomes pending.
 *
 * Later normal status changes do not send customer emails.
 */
async function sendCustomerBookingEmail({
  booking,
  services,
}: {
  booking: {
    id?: string;
    reference_code?: string;
    access_token?: string;
    customer_name?: string;
    email?: string;
    mobile_number?: string;
    social_handle?: string;
    preferred_date?: string;
    preferred_time?: string;
    estimated_total?: number | string;
    discount_amount?: number | string;
    removal?: string;
    notes?: string;
    referral_name?: string | null;
  };
  services: Array<{
    service_name?: string;
    variation_name?: string | null;
    price?: number | string;
  }>;
}) {
  if (!resend) {
    console.error(
      "Customer email skipped: RESEND_API_KEY is not configured."
    );
    return;
  }

  const customerEmail = booking.email?.trim();

  if (!customerEmail) {
    console.error(
      "Customer email skipped: customer email address is missing."
    );
    return;
  }

  const baseUrl = siteUrl();

  if (!baseUrl) {
    console.error(
      "Customer email skipped: NEXT_PUBLIC_SITE_URL is not configured."
    );
    return;
  }

  const reference = booking.reference_code || "";

  if (!reference) {
    console.error("Customer email skipped: booking reference is missing.");
    return;
  }

  const token = booking.access_token || "";

  if (!token) {
    console.error("Customer email skipped: booking access token is missing.");
    return;
  }

  const statusUrl = `${baseUrl}/status/${encodeURIComponent(token)}`;

  const serviceList =
    services.length > 0
      ? services
          .map(
            (item) =>
              `${item.service_name || "Service"}${
                item.variation_name ? ` — ${item.variation_name}` : ""
              }`
          )
          .join("<br />")
      : "Service";

  const baseTotal = Number(booking.estimated_total || 0);
  const discount = Number(booking.discount_amount || 0);
  const estimatedPayable = Math.max(0, baseTotal - discount);

  const customerName = booking.customer_name || "there";

  const details = [
    `<p style="margin:0 0 12px;"><strong>Booking ID:</strong><br />${escapeHtml(reference)}</p>`,
    `<p style="margin:0 0 12px;"><strong>Date:</strong><br />${escapeHtml(
      formatBookingDate(booking.preferred_date)
    )}</p>`,
    `<p style="margin:0 0 12px;"><strong>Time:</strong><br />${escapeHtml(
      formatBookingTime(booking.preferred_time)
    )}</p>`,
    `<p style="margin:0 0 12px;"><strong>Services:</strong><br />${serviceList}</p>`,
    `<p style="margin:0 0 12px;"><strong>Removal:</strong><br />${escapeHtml(
      booking.removal || "None"
    )}</p>`,
    `<p style="margin:0 0 12px;"><strong>Estimated Total:</strong><br />${peso(
      baseTotal
    )}</p>`,
    ...(discount > 0
      ? [
          `<p style="margin:0 0 12px;"><strong>Discount:</strong><br />-${peso(
            discount
          )}</p>`,
          `<p style="margin:0 0 12px;"><strong>Estimated Total After Discount:</strong><br />${peso(
            estimatedPayable
          )}</p>`,
        ]
      : []),
    ...(booking.notes?.trim()
      ? [
          `<p style="margin:0;"><strong>Notes:</strong><br />${escapeHtml(
            booking.notes
          ).replaceAll("\n", "<br />")}</p>`,
        ]
      : []),
  ].join("");

  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: [customerEmail],
      subject: `Booking Request Received — ${reference}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:20px;color:#3d3535;line-height:1.65">
          <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#9d7b7b;margin-bottom:18px">
            The Claw Lab MNL
          </div>

          <h1 style="font-family:Georgia,serif;font-size:30px;font-weight:500;margin:0 0 12px">
            Booking Request Received ♡
          </h1>

          <p>Hi ${escapeHtml(customerName)}!</p>

          <p>
            Your booking request with <strong>The Claw Lab MNL</strong> has been received
            and is currently <strong>pending review</strong>.
          </p>

          <div style="margin:24px 0;padding:22px;border:1px solid #eadede;border-radius:16px;background:#fcfaf9">
            ${details}

            <p style="margin:16px 0 0">
              <strong>Status:</strong><br />
              <span style="display:inline-block;margin-top:4px;padding:5px 10px;border-radius:999px;background:#f1e4e6;color:#73535a;font-size:11px;font-weight:700;letter-spacing:.04em">
                PENDING
              </span>
            </p>
          </div>

          <p>
            Please use your booking status page to check for updates.
            If your booking is approved, payment instructions and any available
            actions will appear there.
          </p>

          <p style="margin:22px 0">
            <a
              href="${escapeHtml(statusUrl)}"
              style="display:inline-block;background:#3d3535;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:13px;font-weight:600"
            >
              View Booking Status →
            </a>
          </p>

          <p style="font-size:12px;color:#777;word-break:break-all">
            ${escapeHtml(statusUrl)}
          </p>

          <p>
            Please save this link. This is where you can check your booking
            status and updates.
          </p>

          <div style="margin-top:30px;padding-top:18px;border-top:1px solid #eee7e5;color:#8a7b7b;font-size:12px">
            <strong>The Claw Lab MNL</strong><br />
            Novaliches, Quezon City, Philippines

            <p style="margin:14px 0 0;color:#8a7b7b;font-size:11px;line-height:1.5">
              Please do not reply to this email.
              This inbox is not monitored and replies will not be received.
            </p>
          </div>
        </div>
      `,
    });

    if (result.error) {
      console.error("Customer email Resend error:", result.error);
    } else {
      console.log("Customer booking email sent:", reference);
    }
  } catch (error) {
    console.error("Customer booking email failed:", error);
  }
}

/*
 * CUSTOMER BOOKING CONFIRMED EMAIL
 *
 * Sent when a verified booking payment moves the booking
 * into CONFIRMED status.
 */
export async function notifyBookingConfirmed({
  booking,
  services,
}: {
  booking: {
    id?: string;
    reference_code?: string;
    access_token?: string;
    customer_name?: string;
    email?: string;
    preferred_date?: string;
    preferred_time?: string;
    estimated_total?: number | string;
    discount_amount?: number | string;
    down_payment?: number | string;
    confirmed_at?: string;
    removal?: string;
    notes?: string;
  };
  services: Array<{
    service_name?: string;
    variation_name?: string | null;
    price?: number | string;
  }>;
}) {
  if (!resend) {
    console.error(
      "Booking confirmed email skipped: RESEND_API_KEY is not configured."
    );
    return;
  }

  const customerEmail = booking.email?.trim();

  if (!customerEmail) {
    console.error(
      "Booking confirmed email skipped: customer email address is missing."
    );
    return;
  }

  const baseUrl = siteUrl();

  if (!baseUrl) {
    console.error(
      "Booking confirmed email skipped: NEXT_PUBLIC_SITE_URL is not configured."
    );
    return;
  }

  const reference = booking.reference_code || "";
  const token = booking.access_token || "";

  const confirmationUrl = token
    ? `${baseUrl}/confirmed/${encodeURIComponent(token)}`
    : "";

  const customerName = booking.customer_name || "there";
  const baseTotal = Number(booking.estimated_total || 0);
  const discount = Number(booking.discount_amount || 0);
  const finalTotal = Math.max(0, baseTotal - discount);
  const paid = Number(booking.down_payment || 0);
  const remaining = Math.max(0, finalTotal - paid);

  const serviceList =
    services.length > 0
      ? services
          .map(
            (item) =>
              `<tr>
                <td style="padding:8px 0;border-bottom:1px solid #eee7e5">
                  ${escapeHtml(item.service_name || "Service")}${
                    item.variation_name
                      ? ` — ${escapeHtml(item.variation_name)}`
                      : ""
                  }
                </td>
                <td style="padding:8px 0;border-bottom:1px solid #eee7e5;text-align:right">
                  ${peso(item.price)}
                </td>
              </tr>`
          )
          .join("")
      : `<tr><td style="padding:8px 0">Service</td><td></td></tr>`;

  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: [customerEmail],
      subject: `Booking Confirmed — ${reference || "The Claw Lab MNL"}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:20px;color:#3d3535;line-height:1.65">
          <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#9d7b7b;margin-bottom:18px">
            The Claw Lab MNL
          </div>

          <h1 style="font-family:Georgia,serif;font-size:30px;font-weight:500;margin:0 0 12px">
            Your Booking Is Confirmed ♡
          </h1>

          <p>Hi ${escapeHtml(customerName)}!</p>

          <p>
            Your payment has been verified and your appointment with
            <strong>The Claw Lab MNL</strong> is now confirmed.
          </p>

          <div style="margin:24px 0;padding:22px;border:1px solid #eadede;border-radius:16px;background:#fcfaf9">
            <p style="margin:0 0 14px;font-family:Georgia,serif;font-size:21px">
              Booking Summary
            </p>

            <p style="margin:0 0 12px"><strong>Booking ID:</strong><br />${escapeHtml(reference)}</p>
            <p style="margin:0 0 12px"><strong>Date:</strong><br />${escapeHtml(
              formatBookingDate(booking.preferred_date)
            )}</p>
            <p style="margin:0 0 16px"><strong>Time:</strong><br />${escapeHtml(
              formatBookingTime(booking.preferred_time)
            )}</p>

            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <thead>
                <tr>
                  <th style="text-align:left;padding:0 0 8px;border-bottom:1px solid #ddd">Service</th>
                  <th style="text-align:right;padding:0 0 8px;border-bottom:1px solid #ddd">Price</th>
                </tr>
              </thead>
              <tbody>${serviceList}</tbody>
            </table>

            <div style="margin-top:14px;padding-top:14px;border-top:1px solid #eee7e5">
              <p style="margin:0 0 6px"><strong>Subtotal:</strong> ${peso(baseTotal)}</p>
              ${
                discount > 0
                  ? `<p style="margin:0 0 6px"><strong>Discount:</strong> -${peso(discount)}</p>`
                  : ""
              }
              <p style="margin:0 0 6px"><strong>Total:</strong> ${peso(finalTotal)}</p>
              <p style="margin:0 0 6px"><strong>Paid:</strong> ${peso(paid)}</p>
              <p style="margin:0"><strong>Remaining:</strong> ${peso(remaining)}</p>

              ${
                booking.removal
                  ? `<p style="margin:12px 0 0"><strong>Removal:</strong> ${escapeHtml(
                      booking.removal
                    )}</p>`
                  : ""
              }

              ${
                booking.notes?.trim()
                  ? `<p style="margin:12px 0 0"><strong>Notes:</strong><br />${escapeHtml(
                      booking.notes
                    ).replaceAll("\\n", "<br />")}</p>`
                  : ""
              }
            </div>
          </div>

          ${
            confirmationUrl
              ? `<p style="margin:22px 0">
                  <a
                    href="${escapeHtml(confirmationUrl)}"
                    style="display:inline-block;background:#3d3535;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:13px;font-weight:600"
                  >
                    View Confirmation →
                  </a>
                </p>`
              : ""
          }

          <div style="margin-top:30px;padding-top:18px;border-top:1px solid #eee7e5;color:#8a7b7b;font-size:12px">
            <strong>The Claw Lab MNL</strong><br />
            Novaliches, Quezon City, Philippines

            <p style="margin:14px 0 0;color:#8a7b7b;font-size:11px;line-height:1.5">
              Please do not reply to this email.
              This inbox is not monitored and replies will not be received.
            </p>
          </div>
        </div>
      `,
    });

    if (result.error) {
      console.error(
        "Booking confirmed customer email Resend error:",
        result.error
      );
    } else {
      console.log(
        "Booking confirmed customer email sent:",
        reference
      );
    }
  } catch (error) {
    console.error(
      "Booking confirmed customer email failed:",
      error
    );
  }
}

/*
 * CUSTOMER COMPLETED EMAIL
 *
 * Sent once when an admin marks a booking COMPLETED.
 *
 * Includes:
 * - booking summary
 * - review link
 * - referral reward instructions
 *
 * There is NO referral code or referral link.
 * The referred customer simply mentions the referrer's name.
 */
export async function notifyBookingCompleted({
  booking,
  services,
}: {
  booking: {
    id?: string;
    reference_code?: string;
    access_token?: string;
    customer_name?: string;
    email?: string;
    preferred_date?: string;
    preferred_time?: string;
    estimated_total?: number | string;
    discount_amount?: number | string;
    down_payment?: number | string;
    removal?: string;
    notes?: string;
  };
  services: Array<{
    service_name?: string;
    variation_name?: string | null;
    price?: number | string;
  }>;
}) {
  if (!resend) {
    console.error(
      "Completed booking email skipped: RESEND_API_KEY is not configured."
    );
    return;
  }

  const customerEmail = booking.email?.trim();

  if (!customerEmail) {
    console.error(
      "Completed booking email skipped: customer email address is missing."
    );
    return;
  }

  const baseUrl = siteUrl();

  if (!baseUrl) {
    console.error(
      "Completed booking email skipped: NEXT_PUBLIC_SITE_URL is not configured."
    );
    return;
  }

  const bookingId = booking.id?.trim();

  if (!bookingId) {
    console.error(
      "Completed booking email skipped: booking ID is missing."
    );
    return;
  }

  const reference = booking.reference_code || "";

  const reviewUrl = `${baseUrl}/review?booking_id=${encodeURIComponent(
    bookingId
  )}`;

  const statusUrl = booking.access_token
    ? `${baseUrl}/status/${encodeURIComponent(booking.access_token)}`
    : "";

  const customerName = booking.customer_name || "there";

  const baseTotal = Number(booking.estimated_total || 0);
  const discount = Number(booking.discount_amount || 0);
  const finalTotal = Math.max(0, baseTotal - discount);

  const serviceList =
    services.length > 0
      ? services
          .map(
            (item) =>
              `<tr>
                <td style="padding:8px 0;border-bottom:1px solid #eee7e5">
                  ${escapeHtml(item.service_name || "Service")}${
                    item.variation_name
                      ? ` — ${escapeHtml(item.variation_name)}`
                      : ""
                  }
                </td>
                <td style="padding:8px 0;border-bottom:1px solid #eee7e5;text-align:right">
                  ${peso(item.price)}
                </td>
              </tr>`
          )
          .join("")
      : `<tr><td style="padding:8px 0">Service</td><td></td></tr>`;

  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: [customerEmail],
      subject: `Thank You for Visiting The Claw Lab MNL ♡`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:20px;color:#3d3535;line-height:1.65">
          <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#9d7b7b;margin-bottom:18px">
            The Claw Lab MNL
          </div>

          <h1 style="font-family:Georgia,serif;font-size:30px;font-weight:500;margin:0 0 12px">
            Thank You for Visiting ♡
          </h1>

          <p>Hi ${escapeHtml(customerName)}!</p>

          <p>
            Thank you for choosing <strong>The Claw Lab MNL</strong>.
            We hope you loved your experience with us! 💅
          </p>

          <div style="margin:24px 0;padding:22px;border:1px solid #eadede;border-radius:16px;background:#fcfaf9">
            <p style="margin:0 0 14px;font-family:Georgia,serif;font-size:21px">
              Your Booking Summary
            </p>

            <p style="margin:0 0 12px">
              <strong>Booking ID:</strong><br />
              ${escapeHtml(reference)}
            </p>

            <p style="margin:0 0 12px">
              <strong>Date:</strong><br />
              ${escapeHtml(formatBookingDate(booking.preferred_date))}
            </p>

            <p style="margin:0 0 16px">
              <strong>Time:</strong><br />
              ${escapeHtml(formatBookingTime(booking.preferred_time))}
            </p>

            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <thead>
                <tr>
                  <th style="text-align:left;padding:0 0 8px;border-bottom:1px solid #ddd">Service</th>
                  <th style="text-align:right;padding:0 0 8px;border-bottom:1px solid #ddd">Price</th>
                </tr>
              </thead>
              <tbody>
                ${serviceList}
              </tbody>
            </table>

            <div style="margin-top:14px;padding-top:14px;border-top:1px solid #eee7e5">
              <p style="margin:0 0 6px">
                <strong>Subtotal:</strong> ${peso(baseTotal)}
              </p>

              ${
                discount > 0
                  ? `<p style="margin:0 0 6px">
                      <strong>Discount:</strong> -${peso(discount)}
                    </p>`
                  : ""
              }

              <p style="margin:0">
                <strong>Total:</strong> ${peso(finalTotal)}
              </p>

              ${
                booking.removal
                  ? `<p style="margin:12px 0 0">
                      <strong>Removal:</strong> ${escapeHtml(
                        booking.removal
                      )}
                    </p>`
                  : ""
              }

              ${
                booking.notes?.trim()
                  ? `<p style="margin:12px 0 0">
                      <strong>Notes:</strong><br />
                      ${escapeHtml(booking.notes).replaceAll("\n", "<br />")}
                    </p>`
                  : ""
              }
            </div>
          </div>

          <div style="margin:24px 0;padding:22px;border:1px solid #eadede;border-radius:16px;background:#fcfaf9">
            <p style="margin:0 0 14px;font-family:Georgia,serif;font-size:21px">
              Loved your experience? ♡
            </p>

            <p style="margin:0">
              We'd really appreciate it if you could leave us a review.
              Your feedback means a lot to us and helps other guests discover
              The Claw Lab MNL.
            </p>

            <p style="margin:22px 0 0">
              <a
                href="${escapeHtml(reviewUrl)}"
                style="display:inline-block;background:#3d3535;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:13px;font-weight:600"
              >
                Leave a Review ♡
              </a>
            </p>
          </div>

          <div style="margin:28px 0;padding:22px;border:1px solid #eadede;border-radius:16px;background:#fcfaf9">
            <p style="margin:0 0 14px;font-family:Georgia,serif;font-size:21px">
              🎁 Refer a Friend
            </p>

            <p style="margin:0 0 12px">
              If you loved your experience, refer a friend to
              <strong>The Claw Lab MNL</strong> and get
              <strong>₱50 OFF your next booking</strong> once your referred
              friend completes their session.
            </p>

            <p style="margin:0;color:#6f6464;font-size:13px">
              No code or link needed — just have your friend mention
              <strong>your name</strong> when they book. ♡
            </p>
          </div>

          ${
            statusUrl
              ? `<p style="margin:22px 0">
                  You can also view your booking details anytime:
                </p>
                <p>
                  <a
                    href="${escapeHtml(statusUrl)}"
                    style="color:#73535a;text-decoration:underline"
                  >
                    View Booking Status →
                  </a>
                </p>`
              : ""
          }

          <div style="margin-top:30px;padding-top:18px;border-top:1px solid #eee7e5;color:#8a7b7b;font-size:12px">
            <strong>The Claw Lab MNL</strong><br />
            Novaliches, Quezon City, Philippines

            <p style="margin:14px 0 0;color:#8a7b7b;font-size:11px;line-height:1.5">
              Please do not reply to this email.
              This inbox is not monitored and replies will not be received.
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

/*
 * NEW BOOKING NOTIFICATION
 *
 * Sends:
 * 1. One admin email
 * 2. One customer email
 */
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
    discount_amount?: number | string;
    removal?: string;
    notes?: string;
    access_token?: string;
    referral_name?: string | null;
  };
  services: Array<{
    service_name?: string;
    variation_name?: string | null;
    price?: number | string;
  }>;
}) {
  const baseUrl = siteUrl();

  const adminLink = booking.id
    ? `${baseUrl}/admin/bookings/${booking.id}`
    : `${baseUrl}/admin/bookings`;

  const serviceList =
    services
      .map(
        (item) =>
          `${item.service_name || "Service"}${
            item.variation_name ? ` — ${item.variation_name}` : ""
          }`
      )
      .join("<br />") || "No services listed";

  await sendAdminEmail({
    subject: `New Booking Request — ${
      booking.reference_code || "The Claw Lab MNL"
    }`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#3d3535;line-height:1.6">
        <p style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#9d7b7b">
          The Claw Lab MNL
        </p>

        <h1 style="font-family:Georgia,serif;font-weight:500">
          New Booking Request
        </h1>

        <p>A new customer booking request has been submitted.</p>

        <div style="border:1px solid #eadede;border-radius:16px;padding:20px">
          <p><strong>Reference:</strong> ${escapeHtml(booking.reference_code)}</p>
          <p><strong>Customer:</strong> ${escapeHtml(booking.customer_name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(booking.email)}</p>
          <p><strong>Mobile:</strong> ${escapeHtml(booking.mobile_number)}</p>
          <p><strong>IG / Messenger:</strong> ${escapeHtml(
            booking.social_handle || "Not provided"
          )}</p>
          <p><strong>Date:</strong> ${escapeHtml(
            formatBookingDate(booking.preferred_date)
          )}</p>
          <p><strong>Time:</strong> ${escapeHtml(
            formatBookingTime(booking.preferred_time)
          )}</p>
          <p><strong>Services:</strong><br />${serviceList}</p>
          <p><strong>Estimated Total:</strong> ${peso(
            booking.estimated_total
          )}</p>
          ${
            Number(booking.discount_amount || 0) > 0
              ? `<p><strong>Discount:</strong> -${peso(
                  booking.discount_amount
                )}</p>
                <p><strong>Estimated Payable:</strong> ${peso(
                  Math.max(
                    0,
                    Number(booking.estimated_total || 0) -
                      Number(booking.discount_amount || 0)
                  )
                )}</p>`
              : ""
          }
          <p><strong>Removal:</strong> ${escapeHtml(
            booking.removal || "None"
          )}</p>
          ${
            booking.referral_name
              ? `<p><strong>Referred By:</strong> ${escapeHtml(
                  booking.referral_name
                )}</p>`
              : ""
          }
          ${
            booking.notes
              ? `<p><strong>Notes:</strong><br />${escapeHtml(
                  booking.notes
                ).replaceAll("\n", "<br />")}</p>`
              : ""
          }
        </div>

        <p style="margin-top:24px">
          <a
            href="${escapeHtml(adminLink)}"
            style="display:inline-block;background:#3d3535;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px"
          >
            Open Booking in Admin →
          </a>
        </p>

        <p style="font-size:12px;color:#8a7b7b;margin-top:28px">
          Automated notification from The Claw Lab MNL.
        </p>

        <p style="margin-top:14px;padding-top:14px;border-top:1px solid #eee7e5;color:#8a7b7b;font-size:11px;line-height:1.5">
          Please do not reply to this email.
          This inbox is not monitored and replies will not be received.
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
  const baseUrl = siteUrl();
  const adminLink = `${baseUrl}/admin/payments`;

  await sendAdminEmail({
    subject: `Payment Proof Submitted — ${
      booking.reference_code || "The Claw Lab MNL"
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
          <p><strong>Reference:</strong> ${escapeHtml(
            booking.reference_code
          )}</p>
          <p><strong>Customer:</strong> ${escapeHtml(
            booking.customer_name
          )}</p>
          <p>
            <strong>Appointment:</strong>
            ${escapeHtml(formatBookingDate(booking.preferred_date))}
            ·
            ${escapeHtml(formatBookingTime(booking.preferred_time))}
          </p>
          <p><strong>Payment Method:</strong> ${escapeHtml(method)}</p>
          <p><strong>Amount:</strong> ${peso(amount)}</p>
        </div>

        <p style="margin-top:24px">
          <a
            href="${escapeHtml(adminLink)}"
            style="display:inline-block;background:#3d3535;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px"
          >
            Review Payment →
          </a>
        </p>

        <p style="margin-top:28px;padding-top:14px;border-top:1px solid #eee7e5;color:#8a7b7b;font-size:11px;line-height:1.5">
          Please do not reply to this email.
          This inbox is not monitored and replies will not be received.
        </p>
      </div>
    `,
  });
}
