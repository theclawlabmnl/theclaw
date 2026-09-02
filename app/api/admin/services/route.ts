import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function getAdminDb() {
  const session = await supabaseServer();

  const {
    data: { user },
  } = await session.auth.getUser();

  if (!user) return null;

  const db = supabaseAdmin();

  const { data: admin } = await db
    .from("admins")
    .select("id")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  return admin ? db : null;
}

function numberOr(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function POST(req: NextRequest) {
  const db = await getAdminDb();

  if (!db) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const type = body.type || "service";

    if (type === "variation") {
      const serviceId = String(body.service_id || "").trim();
      const name = String(body.name || "").trim();

      if (!serviceId || !name) {
        return NextResponse.json(
          {
            error:
              "Service and variation name are required.",
          },
          { status: 400 }
        );
      }

      const { error } = await db
        .from("service_variations")
        .insert({
          service_id: serviceId,
          name: name.slice(0, 120),
          price_delta: numberOr(body.price_delta, 0),
          duration_delta_minutes: Math.round(
            numberOr(
              body.duration_delta_minutes,
              0
            )
          ),
          active: body.active !== false,
          sort_order: Math.round(
            numberOr(body.sort_order, 0)
          ),
        });

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    const name = String(body.name || "").trim();

    if (!name) {
      return NextResponse.json(
        { error: "Service name is required." },
        { status: 400 }
      );
    }

    const { error } = await db
      .from("services")
      .insert({
        name: name.slice(0, 120),
        description: String(
          body.description || ""
        ).slice(0, 2000),
        price: numberOr(body.price, 0),
        duration_minutes: Math.round(
          numberOr(body.duration_minutes, 60)
        ),
        active: body.active !== false,
        sort_order: Math.round(
          numberOr(body.sort_order, 0)
        ),
      });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const db = await getAdminDb();

  if (!db) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const type = body.type || "service";
    const id = String(body.id || "").trim();

    if (!id) {
      return NextResponse.json(
        { error: "Missing ID." },
        { status: 400 }
      );
    }

    if (type === "variation") {
      const patch: Record<string, unknown> = {};

      if ("name" in body) {
        const name = String(body.name || "").trim();

        if (!name) {
          return NextResponse.json(
            {
              error:
                "Variation name is required.",
            },
            { status: 400 }
          );
        }

        patch.name = name.slice(0, 120);
      }

      if ("price_delta" in body) {
        patch.price_delta = numberOr(
          body.price_delta,
          0
        );
      }

      if ("duration_delta_minutes" in body) {
        patch.duration_delta_minutes =
          Math.round(
            numberOr(
              body.duration_delta_minutes,
              0
            )
          );
      }

      if ("active" in body) {
        patch.active = Boolean(body.active);
      }

      if ("sort_order" in body) {
        patch.sort_order = Math.round(
          numberOr(body.sort_order, 0)
        );
      }

      const { error } = await db
        .from("service_variations")
        .update(patch)
        .eq("id", id);

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    const patch: Record<string, unknown> = {};

    if ("name" in body) {
      const name = String(body.name || "").trim();

      if (!name) {
        return NextResponse.json(
          {
            error: "Service name is required.",
          },
          { status: 400 }
        );
      }

      patch.name = name.slice(0, 120);
    }

    if ("description" in body) {
      patch.description = String(
        body.description || ""
      ).slice(0, 2000);
    }

    if ("price" in body) {
      patch.price = numberOr(body.price, 0);
    }

    if ("duration_minutes" in body) {
      patch.duration_minutes = Math.round(
        numberOr(body.duration_minutes, 60)
      );
    }

    if ("active" in body) {
      patch.active = Boolean(body.active);
    }

    if ("sort_order" in body) {
      patch.sort_order = Math.round(
        numberOr(body.sort_order, 0)
      );
    }

    const { error } = await db
      .from("services")
      .update(patch)
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const db = await getAdminDb();

  if (!db) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();

    const type = String(
      body.type || "service"
    ).trim();

    const id = String(
      body.id || ""
    ).trim();

    if (!id) {
      return NextResponse.json(
        { error: "Missing ID." },
        { status: 400 }
      );
    }

    /*
     * DELETE VARIATION
     */
    if (type === "variation") {
      const { data: variation, error: variationLookupError } =
        await db
          .from("service_variations")
          .select("id")
          .eq("id", id)
          .maybeSingle();

      if (variationLookupError) {
        return NextResponse.json(
          {
            error:
              variationLookupError.message,
          },
          { status: 500 }
        );
      }

      if (!variation) {
        return NextResponse.json(
          { error: "Variation not found." },
          { status: 404 }
        );
      }

      const { error: deleteError } = await db
        .from("service_variations")
        .delete()
        .eq("id", id);

      if (deleteError) {
        return NextResponse.json(
          { error: deleteError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        deleted: "variation",
        id,
      });
    }

    /*
     * DELETE SERVICE
     *
     * Delete variations first so the
     * service foreign-key relationship
     * cannot block the service deletion.
     */
    if (type === "service") {
      const {
        data: service,
        error: serviceLookupError,
      } = await db
        .from("services")
        .select("id")
        .eq("id", id)
        .maybeSingle();

      if (serviceLookupError) {
        return NextResponse.json(
          {
            error:
              serviceLookupError.message,
          },
          { status: 500 }
        );
      }

      if (!service) {
        return NextResponse.json(
          { error: "Service not found." },
          { status: 404 }
        );
      }

      const {
        error: variationDeleteError,
      } = await db
        .from("service_variations")
        .delete()
        .eq("service_id", id);

      if (variationDeleteError) {
        return NextResponse.json(
          {
            error:
              variationDeleteError.message,
          },
          { status: 500 }
        );
      }

      const { error: serviceDeleteError } =
        await db
          .from("services")
          .delete()
          .eq("id", id);

      if (serviceDeleteError) {
        return NextResponse.json(
          {
            error:
              serviceDeleteError.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        deleted: "service",
        id,
      });
    }

    return NextResponse.json(
      { error: "Invalid delete type." },
      { status: 400 }
    );
  } catch (error) {
    console.error(
      "Services DELETE error:",
      error
    );

    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }
}