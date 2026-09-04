import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

const STATUS_WINDOW_DAYS = 5;

type BookingRow = {
  id: string;
  access_token: string | null;
  reference_code: string | null;
  customer_name: string | null;
  mobile_number: string | null;
  email: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  status: string | null;
  created_at: string | null;
};

function getAppointmentDateTime(
  dateValue:
    | string
    | null
    | undefined,
  timeValue:
    | string
    | null
    | undefined
): Date | null {
  if (
    !dateValue ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      dateValue
    )
  ) {
    return null;
  }

  const time = String(
    timeValue || "00:00"
  ).slice(0, 5);

  if (
    !/^\d{2}:\d{2}$/.test(
      time
    )
  ) {
    return null;
  }

  const date = new Date(
    `${dateValue}T${time}:00+08:00`
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
}

function hasActiveStatusAccess(
  appointmentDate:
    | string
    | null
    | undefined,
  appointmentTime:
    | string
    | null
    | undefined
) {
  const appointment =
    getAppointmentDateTime(
      appointmentDate,
      appointmentTime
    );

  if (!appointment) {
    return false;
  }

  const expiry =
    appointment.getTime() +
    STATUS_WINDOW_DAYS *
      24 *
      60 *
      60 *
      1000;

  return (
    Date.now() <=
    expiry
  );
}

function publicBooking(
  booking: BookingRow
) {
  return {
    token:
      booking.access_token,

    reference_code:
      booking.reference_code ||
      "",

    customer_name:
      booking.customer_name ||
      "",

    preferred_date:
      booking.preferred_date ||
      "",

    preferred_time:
      booking.preferred_time ||
      "",

    status:
      booking.status ||
      "",

    status_active:
      hasActiveStatusAccess(
        booking.preferred_date,
        booking.preferred_time
      ),
  };
}

function isUuid(
  value: string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function ensureAccessToken(
  db: ReturnType<typeof supabaseAdmin>,
  booking: BookingRow
): Promise<BookingRow | null> {
  if (
    booking.access_token
  ) {
    return booking;
  }

  const token =
    crypto.randomUUID().replace(
      /-/g,
      ""
    );

  const {
    data: updatedBooking,
    error: tokenError,
  } = await db
    .from("bookings")
    .update({
      access_token:
        token,
    })
    .eq(
      "id",
      booking.id
    )
    .select(
      `
      id,
      access_token,
      reference_code,
      customer_name,
      mobile_number,
      email,
      preferred_date,
      preferred_time,
      status,
      created_at
      `
    )
    .single();

  if (
    tokenError ||
    !updatedBooking
  ) {
    console.error(
      "Booking access token creation error:",
      tokenError
    );

    return null;
  }

  return updatedBooking as BookingRow;
}

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request
        .json()
        .catch(
          () => ({})
        );

    const referenceCode =
      String(
        body.reference_code ||
          ""
      ).trim();

    const email =
      String(
        body.email ||
          ""
      )
        .trim()
        .toLowerCase();

    const db =
      supabaseAdmin();

    /*
     * =========================================================
     * BOOKING ID / REFERENCE CODE
     * =========================================================
     *
     * Accept either:
     *
     * 1. bookings.id
     * 2. bookings.reference_code
     *
     * Do not restrict this lookup based on booking status.
     */

    if (
      referenceCode
    ) {
      let booking:
        | BookingRow
        | null = null;

      /*
       * -------------------------------------------------------
       * FIRST: UUID / BOOKING DATABASE ID
       * -------------------------------------------------------
       */

      if (
        isUuid(
          referenceCode
        )
      ) {
        const {
          data,
          error,
        } =
          await db
            .from("bookings")
            .select(
              `
              id,
              access_token,
              reference_code,
              customer_name,
              mobile_number,
              email,
              preferred_date,
              preferred_time,
              status,
              created_at
              `
            )
            .eq(
              "id",
              referenceCode
            )
            .maybeSingle();

        if (
          error
        ) {
          console.error(
            "Booking ID status lookup error:",
            error
          );

          return NextResponse.json(
            {
              error:
                "Unable to check booking status.",
            },
            {
              status: 500,
            }
          );
        }

        booking =
          (data as BookingRow | null) ||
          null;
      }

      /*
       * -------------------------------------------------------
       * SECOND: REFERENCE CODE
       * -------------------------------------------------------
       */

      if (
        !booking
      ) {
        const {
          data,
          error,
        } =
          await db
            .from("bookings")
            .select(
              `
              id,
              access_token,
              reference_code,
              customer_name,
              mobile_number,
              email,
              preferred_date,
              preferred_time,
              status,
              created_at
              `
            )
            .ilike(
              "reference_code",
              referenceCode
            )
            .maybeSingle();

        if (
          error
        ) {
          console.error(
            "Booking reference status lookup error:",
            error
          );

          return NextResponse.json(
            {
              error:
                "Unable to check booking status.",
            },
            {
              status: 500,
            }
          );
        }

        booking =
          (data as BookingRow | null) ||
          null;
      }

      /*
       * -------------------------------------------------------
       * NOT FOUND
       * -------------------------------------------------------
       */

      if (
        !booking
      ) {
        return NextResponse.json(
          {
            error:
              "We couldn't find a booking with that ID.",
          },
          {
            status: 404,
          }
        );
      }

      /*
       * -------------------------------------------------------
       * ACCESS TOKEN
       * -------------------------------------------------------
       */

      const processedBooking =
        await ensureAccessToken(
          db,
          booking
        );

      if (
        !processedBooking
      ) {
        return NextResponse.json(
          {
            error:
              "We found your booking, but we couldn't open its status page.",
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json({
        ok: true,

        bookings: [
          publicBooking(
            processedBooking
          ),
        ],
      });
    }

    /*
     * =========================================================
     * EMAIL ADDRESS
     * =========================================================
     *
     * Search using the exact email address saved with the
     * booking.
     */

    if (!email) {
      return NextResponse.json(
        {
          error:
            "Please enter either your booking ID or the email address used for your booking.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: bookings,
      error,
    } =
      await db
        .from("bookings")
        .select(
          `
          id,
          access_token,
          reference_code,
          customer_name,
          mobile_number,
          email,
          preferred_date,
          preferred_time,
          status,
          created_at
          `
        )
        .ilike(
          "email",
          email
        )
        .order(
          "preferred_date",
          {
            ascending:
              false,
            nullsFirst:
              false,
          }
        )
        .order(
          "preferred_time",
          {
            ascending:
              false,
            nullsFirst:
              false,
          }
        );

    if (
      error
    ) {
      console.error(
        "Email status lookup error:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Unable to check booking status.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * -------------------------------------------------------
     * CREATE TOKENS FOR OLD BOOKINGS
     * -------------------------------------------------------
     */

    const processedBookings =
      await Promise.all(
        (
          bookings ||
          []
        ).map(
          async (
            booking: BookingRow
          ) =>
            ensureAccessToken(
              db,
              booking
            )
        )
      );

    const allBookings =
      processedBookings
        .filter(
          (
            booking
          ): booking is BookingRow =>
            Boolean(
              booking?.access_token
            )
        )
        .map(
          publicBooking
        );

    if (
      allBookings.length ===
      0
    ) {
      return NextResponse.json(
        {
          error:
            "We couldn't find any bookings matching that email address.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      ok: true,

      bookings:
        allBookings,
    });
  } catch (
    error: any
  ) {
    console.error(
      "Booking status lookup API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to check booking status.",
      },
      {
        status: 500,
      }
    );
  }
}