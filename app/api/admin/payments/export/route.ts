import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function csvEscape(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  const normalized =
    typeof value === "object"
      ? JSON.stringify(value)
      : String(value);

  return `"${normalized.replace(/"/g, '""')}"`;
}

export async function GET(_request: NextRequest) {
  try {
    const supabase = await supabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const db = supabaseAdmin();

    const { data: admin, error: adminError } = await db
      .from("admins")
      .select("id")
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle();

    if (adminError || !admin) {
      return NextResponse.json(
        { error: "Forbidden." },
        { status: 403 }
      );
    }

    const { data: payments, error } = await db
      .from("payments")
      .select(
        `
          *,
          bookings (
            id,
            reference_code,
            customer_name,
            mobile_number,
            preferred_date,
            preferred_time,
            status,
            estimated_total
          )
        `
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Payments CSV export error:",
        error
      );

      return NextResponse.json(
        { error: "Failed to export payments." },
        { status: 500 }
      );
    }

    const realPayments = (payments ?? []).filter(
      (payment: any) =>
        payment.bookings?.status !== "draft"
    );

    if (realPayments.length === 0) {
      return new NextResponse(
        "﻿No payment records\n",
        {
          status: 200,
          headers: {
            "Content-Type":
              "text/csv; charset=utf-8",
            "Content-Disposition":
              'attachment; filename="payments.csv"',
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const rows = realPayments.map(
      (payment: any) => ({
        payment_id: payment.id,
        booking_id: payment.booking_id,
        booking_reference:
          payment.bookings?.reference_code ?? "",
        customer_name:
          payment.bookings?.customer_name ?? "",
        mobile_number:
          payment.bookings?.mobile_number ?? "",
        appointment_date:
          payment.bookings?.preferred_date ?? "",
        appointment_time:
          payment.bookings?.preferred_time ?? "",
        booking_status:
          payment.bookings?.status ?? "",
        booking_total:
          payment.bookings?.estimated_total ?? "",
        payment_type: payment.payment_type ?? "",
        method: payment.method ?? "",
        status: payment.status ?? "",
        amount: payment.amount ?? "",
        gross_amount: payment.gross_amount ?? "",
        processing_fee:
          payment.processing_fee ?? "",
        net_amount: payment.net_amount ?? "",
        note: payment.note ?? "",
        paid_at: payment.paid_at ?? "",
        verified_at: payment.verified_at ?? "",
        created_at: payment.created_at ?? "",
        updated_at: payment.updated_at ?? "",
      })
    );

    const headers = Object.keys(rows[0]);

    const csv = [
      headers.map(csvEscape).join(","),
      ...rows.map((row) =>
        headers
          .map((header) =>
            csvEscape(
              row[
                header as keyof typeof row
              ]
            )
          )
          .join(",")
      ),
    ].join("\n");

    const date = new Date()
      .toISOString()
      .slice(0, 10);

    return new NextResponse(
      `﻿${csv}`,
      {
        status: 200,
        headers: {
          "Content-Type":
            "text/csv; charset=utf-8",
          "Content-Disposition":
            `attachment; filename="payments-${date}.csv"`,
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Payments CSV export error:",
      error
    );

    return NextResponse.json(
      { error: "Failed to export payments." },
      { status: 500 }
    );
  }
}
