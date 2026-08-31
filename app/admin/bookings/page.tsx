export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatDate, peso } from "@/lib/utils";
import BookingActions from "@/components/BookingActions";
import PaymentLinkActions from "@/components/PaymentLinkActions";

export default async function Bookings() {
  const db = supabaseAdmin();

  const { data } = await db
    .from("bookings")
    .select(
      "id,reference_code,access_token,customer_name,mobile_number,preferred_date,preferred_time,status,estimated_total,down_payment,created_at"
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(100);

  return (
    <>
      <div className="section-head">
        <div>
          <div className="kicker">
            Operations
          </div>

          <h1 className="serif">
            Bookings
          </h1>

          <p className="muted">
            Manage booking requests, customer
            links, payments, and appointment
            status.
          </p>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>
                Customer
              </th>

              <th>
                Appointment
              </th>

              <th>
                Status
              </th>

              <th>
                Total
              </th>

              <th>
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {(data || []).map(
              (booking) => (
                <tr
                  key={
                    booking.id
                  }
                >
                  <td>
                    <strong>
                      {
                        booking.customer_name
                      }
                    </strong>

                    <br />

                    {
                      booking.reference_code
                    }

                    <br />

                    <span className="muted">
                      {
                        booking.mobile_number
                      }
                    </span>
                  </td>

                  <td>
                    {formatDate(
                      booking.preferred_date
                    )}

                    <br />

                    {
                      booking.preferred_time
                    }
                  </td>

                  <td>
                    <span className="status-pill">
                      {
                        booking.status
                      }
                    </span>
                  </td>

                  <td>
                    {peso(
                      booking.estimated_total ||
                        0
                    )}

                    <br />

                    <span className="muted">
                      Paid:{" "}
                      {peso(
                        booking.down_payment ||
                          0
                      )}
                    </span>
                  </td>

                  <td>
                    <div
                      className="actions"
                      style={{
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <Link
                        className="btn small secondary"
                        href={`/admin/bookings/${booking.id}`}
                      >
                        VIEW
                      </Link>

                      <BookingActions
                        id={
                          booking.id
                        }
                        status={
                          booking.status
                        }
                      />
                    </div>

                    <PaymentLinkActions
                      token={
                        booking.access_token
                      }
                      status={
                        booking.status
                      }
                    />
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>

        {!data?.length && (
          <div className="empty">
            No bookings yet.
          </div>
        )}
      </div>
    </>
  );
}