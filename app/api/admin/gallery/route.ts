import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function getAdmin() {
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
    .single();

  return admin ? db : null;
}

export async function POST(req: NextRequest) {
  const db = await getAdmin();

  if (!db) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const form = await req.formData();

    const file = form.get("file");
    const caption = String(form.get("caption") || "").slice(0, 200);

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please select an image." },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed." },
        { status: 400 }
      );
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image must be smaller than 8MB." },
        { status: 400 }
      );
    }

    const extension =
      file.name.split(".").pop()?.toLowerCase() || "jpg";

    const filename = `${crypto.randomUUID()}.${extension}`;

    const bytes = await file.arrayBuffer();

    const { error: uploadError } = await db.storage
      .from("gallery")
      .upload(filename, bytes, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    const { data: publicUrl } = db.storage
      .from("gallery")
      .getPublicUrl(filename);

    const { error: insertError } = await db
      .from("gallery")
      .insert({
        image_path: publicUrl.publicUrl,
        caption,
        sort_order: 0,
        active: true,
      });

    if (insertError) {
      await db.storage.from("gallery").remove([filename]);

      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Upload failed." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const db = await getAdmin();

  if (!db) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();

    const id = String(body.id || "");

    if (!id) {
      return NextResponse.json(
        { error: "Missing photo ID." },
        { status: 400 }
      );
    }

    const patch: Record<string, unknown> = {};

    if ("caption" in body) {
      patch.caption = String(body.caption || "").slice(0, 200);
    }

    if ("sort_order" in body) {
      patch.sort_order = Number(body.sort_order) || 0;
    }

    if ("active" in body) {
      patch.active = Boolean(body.active);
    }

    const { error } = await db
      .from("gallery")
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
      { error: "Update failed." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const db = await getAdmin();

  if (!db) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const id = String(body.id || "");

    if (!id) {
      return NextResponse.json(
        { error: "Missing photo ID." },
        { status: 400 }
      );
    }

    const { data: photo, error: findError } = await db
      .from("gallery")
      .select("image_path")
      .eq("id", id)
      .single();

    if (findError || !photo) {
      return NextResponse.json(
        { error: "Photo not found." },
        { status: 404 }
      );
    }

    const { error: deleteError } = await db
      .from("gallery")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Delete failed." },
      { status: 500 }
    );
  }
}