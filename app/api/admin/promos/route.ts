import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  supabaseServer,
} from "@/lib/supabase-server";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

async function getAdminDb() {
  const supabase =
    await supabaseServer();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const db =
    supabaseAdmin();

  const {
    data: admin,
    error,
  } =
    await db
      .from("admins")
      .select("id")
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "active",
        true
      )
      .maybeSingle();

  if (error) {
    console.error(
      "Admin lookup error:",
      error
    );

    return null;
  }

  return admin
    ? db
    : null;
}

function cleanPromo(
  value: any
) {
  const name =
    String(
      value.name || ""
    ).trim();

  const description =
    String(
      value.description ||
        ""
    ).trim();

  const discountType =
    String(
      value.discount_type ||
        "fixed"
    );

  const discountValue =
    Number(
      value.discount_value ||
        0
    );

  if (!name) {
    throw new Error(
      "Promo name is required."
    );
  }

  if (
    ![
      "fixed",
      "percent",
    ].includes(
      discountType
    )
  ) {
    throw new Error(
      "Invalid discount type."
    );
  }

  if (
    !Number.isFinite(
      discountValue
    ) ||
    discountValue < 0
  ) {
    throw new Error(
      "Discount value must be zero or greater."
    );
  }

  if (
    discountType ===
      "percent" &&
    discountValue > 100
  ) {
    throw new Error(
      "Percentage discount cannot exceed 100."
    );
  }

  return {
    name:
      name.slice(0, 120),

    description:
      description.slice(
        0,
        3000
      ),

    discount_type:
      discountType,

    discount_value:
      discountValue,
  };
}

export async function POST(
  req: NextRequest
) {
  try {
    const db =
      await getAdminDb();

    if (!db) {
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

    const body =
      await req.json();

    const promo =
      cleanPromo(
        body
      );

    const {
      error,
    } = await db
      .from("promos")
      .insert({
        ...promo,
        active: true,
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (
    error: any
  ) {
    console.error(
      "Admin promos POST error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to create promo.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
  req: NextRequest
) {
  try {
    const db =
      await getAdminDb();

    if (!db) {
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

    const body =
      await req.json();

    const id =
      String(
        body.id || ""
      ).trim();

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Promo ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const update: Record<
      string,
      any
    > = {};

    if (
      body.name !==
        undefined ||
      body.description !==
        undefined ||
      body.discount_type !==
        undefined ||
      body.discount_value !==
        undefined
    ) {
      Object.assign(
        update,
        cleanPromo(
          body
        )
      );
    }

    if (
      body.active !==
      undefined
    ) {
      update.active =
        Boolean(
          body.active
        );
    }

    if (
      !Object.keys(
        update
      ).length
    ) {
      return NextResponse.json(
        {
          error:
            "No changes supplied.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: updatedPromo,
      error,
    } = await db
      .from("promos")
      .update(
        update
      )
      .eq(
        "id",
        id
      )
      .select("id")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!updatedPromo) {
      return NextResponse.json(
        {
          error:
            "Promo not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      ok: true,
      id,
    });
  } catch (
    error: any
  ) {
    console.error(
      "Admin promos PATCH error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to update promo.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  req: NextRequest
) {
  try {
    const db =
      await getAdminDb();

    if (!db) {
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

    const body =
      await req
        .json()
        .catch(
          () => ({})
        );

    const id =
      String(
        body.id || ""
      ).trim();

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Promo ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: deletedPromo,
      error,
    } = await db
      .from("promos")
      .delete()
      .eq(
        "id",
        id
      )
      .select("id")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!deletedPromo) {
      return NextResponse.json(
        {
          error:
            "Promo not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      ok: true,
      deleted: true,
      id,
    });
  } catch (
    error: any
  ) {
    console.error(
      "Admin promos DELETE error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to delete promo.",
      },
      {
        status: 500,
      }
    );
  }
}