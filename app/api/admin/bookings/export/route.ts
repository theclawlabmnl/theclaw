import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = new Set([
  "pending",
  "approved",
  "payment_submitted",
  "confirmed",
  "completed",
  "cancelled",
  "rejected",
]);

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

export async function GET(request: NextRequest) {
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

    const requestedStatus =
      request.nextUrl.searchParams.get("status")?.trim() || "";

    if (
      requestedStatus &&
      !ALLOWED_STATUSES.has(requestedStatus)
    ) {
      return NextResponse.json(
        { error: "Invalid booking status." },
        { status: 400 }
      );
    }

    let query = db
      .from("bookings")
      .select("*")
      .neq("status", "draft")
      .order("created_at", { ascending: false });

    if (requestedStatus) {
      query = query.eq("status", requestedStatus);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error("Booking CSV export error:", error);

      return NextResponse.json(
        { error: "Failed to export bookings." },
        { status: 500 }
      );
    }

    const rows = bookings ?? [];

    if (rows.length === 0) {
      const csv = "No matching bookings\n";

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="bookings.csv"',
          "Cache-Control": "no-store",
        },
      });
    }

    const headerSet = rows.reduce<Set<string>>(
      (keys, row) => {
        Object.keys(row).forEach((key) => keys.add(key));
        return keys;
      },
      new Set<string>()
    );

    const headers: string[] = Array.from(headerSet);

    const csv = [
      headers.map(csvEscape).join(","),
      ...rows.map((row) =>
        headers
          .map((header) =>
            csvEscape(
              (row as Record<string, unknown>)[header]
            )
          )
          .join(",")
      ),
    ].join("\n");

    const statusSuffix = requestedStatus
      ? `-${requestedStatus.replace(/_/g, "-")}`
      : "";

    const date = new Date().toISOString().slice(0, 10);
    const filename = `bookings${statusSuffix}-${date}.csv`;

    return new NextResponse(`\uFEFF${csv}`, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Booking CSV export error:", error);

    return NextResponse.json(
      { error: "Failed to export bookings." },
      { status: 500 }
    );
  }
}
