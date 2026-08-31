import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
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

export async function notifyNewBooking({
  booking,
  services,
}: {
  booking: {
    id?: string;
    reference_code?: string;
    customer_name?: string;
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
          <p><strong>Reference:</strong> ${escapeHtml(
            booking.reference_code
          )}</p>

          <p><strong>Customer:</strong> ${escapeHtml(
            booking.customer_name
          )}</p>

          <p><strong>Mobile:</strong> ${escapeHtml(
            booking.mobile_number
          )}</p>

          <p><strong>IG / Messenger:</strong> ${escapeHtml(
            booking.social_handle ||
              "Not provided"
          )}</p>

          <p><strong>Date:</strong> ${escapeHtml(
            booking.preferred_date
          )}</p>

          <p><strong>Time:</strong> ${escapeHtml(
            booking.preferred_time
          )}</p>

          <p><strong>Services:</strong><br />${serviceList}</p>

          <p><strong>Estimated Total:</strong> ${peso(
            booking.estimated_total
          )}</p>

          <p><strong>Removal:</strong> ${escapeHtml(
            booking.removal ||
              "None"
          )}</p>

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
      </div>
    `,
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
          <p><strong>Reference:</strong> ${escapeHtml(
            booking.reference_code
          )}</p>

          <p><strong>Customer:</strong> ${escapeHtml(
            booking.customer_name
          )}</p>

          <p><strong>Appointment:</strong> ${escapeHtml(
            booking.preferred_date
          )} · ${escapeHtml(
            booking.preferred_time
          )}</p>

          <p><strong>Payment Method:</strong> ${escapeHtml(
            method
          )}</p>

          <p><strong>Amount:</strong> ${peso(
            amount
          )}</p>
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
      </div>
    `,
  });
}