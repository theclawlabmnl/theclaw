import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const PAYMENT_DEADLINE_HOURS = 3;
const PAYMENT_DEADLINE_MS =
  PAYMENT_DEADLINE_HOURS * 60 * 60 * 1000;

const PAYMENT_DEADLINE_REASON =
  "Payment deadline expired";

const PAYMENT_DEADLINE_NOTE =
  "Booking was automatically cancelled because payment was not submitted within 3 hours of approval.";

export async function GET(
  request: NextRequest
) {
  try {
    /*
     * Protect the cron endpoint.
     *
     * Set CRON_SECRET in your environment:
     *
     * CRON_SECRET=your-secret-value
     *
     * The scheduler must send:
     *
     * Authorization: Bearer your-secret-value
     */
    const cronSecret =
      process.env.CRON_SECRET;

    if (cronSecret) {
      const authorization =
        request.headers.get(
          "authorization"
        );

      const expected =
        `Bearer ${cronSecret}`;

      if (
        authorization !== expected
      ) {
        return NextResponse.json(
          {
            error:
              "Unauthorized",
          },
          {
            status: 401,
          }
        );
      }
    }

    const db =
      supabaseAdmin();

    const now =
      new Date();

    const nowIso =
      now.toISOString();

    /*
     * Only approved bookings are
     * eligible for automatic expiry.
     *
     * We deliberately do NOT include
     * payment_submitted here.
     *
     * Once payment has been submitted,
     * the booking will remain active while
     * the admin verifies the payment.
     */
    const {
      data: bookings,
      error: lookupError,
    } = await db
      .from("bookings")
      .select(
        "id,reference_code,status,approved_at"
      )
      .eq(
        "status",
        "approved"
      )
      .not(
        "approved_at",
        "is",
        null
      );

    if (lookupError) {
      throw lookupError;
    }

    const expiredBookings =
      (
        bookings || []
      ).filter(
        (booking) => {
          const approvedAt =
            new Date(
              booking.approved_at
            );

          if (
            Number.isNaN(
              approvedAt.getTime()
            )
          ) {
            return false;
          }

          const deadline =
            approvedAt.getTime() +
            PAYMENT_DEADLINE_MS;

          return (
            now.getTime() >=
            deadline
          );
        }
      );

    if (
      expiredBookings.length ===
      0
    ) {
      return NextResponse.json({
        ok: true,
        checked:
          bookings?.length || 0,
        cancelled: 0,
        message:
          "No approved bookings have expired.",
      });
    }

    /*
     * Cancel each expired booking
     * individually.
     *
     * The additional status condition
     * makes this safe if something changed
     * between the lookup and update.
     */
    const cancelledIds: string[] =
      [];

    for (
      const booking of
        expiredBookings
    ) {
      const {
        data: cancelled,
        error:
          cancellationError,
      } = await db
        .from("bookings")
        .update({
          status:
            "cancelled",
          cancellation_reason:
            PAYMENT_DEADLINE_REASON,
          cancellation_note:
            PAYMENT_DEADLINE_NOTE,
          cancelled_at:
            nowIso,
        })
        .eq(
          "id",
          booking.id
        )
        .eq(
          "status",
          "approved"
        )
        .select(
          "id"
        )
        .maybeSingle();

      if (
        cancellationError
      ) {
        console.error(
          "Failed to expire booking:",
          {
            bookingId:
              booking.id,
            referenceCode:
              booking.reference_code,
            error:
              cancellationError,
          }
        );

        continue;
      }

      if (cancelled) {
        cancelledIds.push(
          String(
            cancelled.id
          )
        );
      }
    }

    return NextResponse.json({
      ok: true,
      checked:
        bookings?.length || 0,
      expired:
        expiredBookings.length,
      cancelled:
        cancelledIds.length,
      cancelled_ids:
        cancelledIds,
    });
  } catch (error: any) {
    console.error(
      "Expire bookings cron error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "Unable to expire bookings.",
      },
      {
        status: 500,
      }
    );
  }
}