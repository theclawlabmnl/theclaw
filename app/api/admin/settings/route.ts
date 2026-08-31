import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const BUCKET = "site-assets";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function extensionForType(
  contentType: string
) {
  switch (contentType) {
    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    default:
      return "jpg";
  }
}

async function ensureBucket(
  db: ReturnType<typeof supabaseAdmin>
) {
  const existing =
    await db.storage.getBucket(BUCKET);

  if (!existing.data) {
    const created =
      await db.storage.createBucket(
        BUCKET,
        {
          public: true,
        }
      );

    if (
      created.error &&
      !created.error.message
        ?.toLowerCase()
        .includes("already exists")
    ) {
      throw created.error;
    }
  }
}

async function uploadQr(
  db: ReturnType<typeof supabaseAdmin>,
  file: File,
  prefix: string
) {
  if (
    !ALLOWED_TYPES.has(file.type)
  ) {
    throw new Error(
      "QR images must be JPG, PNG, or WEBP."
    );
  }

  if (
    file.size > MAX_FILE_SIZE
  ) {
    throw new Error(
      "QR image must be 5MB or smaller."
    );
  }

  const extension =
    extensionForType(file.type);

  const filename =
    `${prefix}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${extension}`;

  const path =
    `payment-qr/${filename}`;

  const buffer =
    Buffer.from(
      await file.arrayBuffer()
    );

  const uploaded =
    await db.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType:
          file.type,
        upsert: true,
      });

  if (uploaded.error) {
    throw uploaded.error;
  }

  const publicUrl =
    db.storage
      .from(BUCKET)
      .getPublicUrl(path)
      .data.publicUrl;

  return publicUrl;
}

export async function POST(
  request: Request
) {
  try {
    const db = supabaseAdmin();

    const contentType =
      request.headers.get(
        "content-type"
      ) || "";

    let settings: Record<
      string,
      string
    > = {};

    let gcashQrFile:
      | File
      | null = null;

    let qrphQrFile:
      | File
      | null = null;

    if (
      contentType.includes(
        "multipart/form-data"
      )
    ) {
      const formData =
        await request.formData();

      const rawSettings =
        formData.get("settings");

      if (
        typeof rawSettings !==
        "string"
      ) {
        return NextResponse.json(
          {
            error:
              "Missing settings data.",
          },
          { status: 400 }
        );
      }

      try {
        settings =
          JSON.parse(
            rawSettings
          );
      } catch {
        return NextResponse.json(
          {
            error:
              "Invalid settings data.",
          },
          { status: 400 }
        );
      }

      const gcashFile =
        formData.get(
          "gcash_qr"
        );

      const qrphFile =
        formData.get(
          "qrph_qr"
        );

      if (
        gcashFile instanceof File &&
        gcashFile.size > 0
      ) {
        gcashQrFile =
          gcashFile;
      }

      if (
        qrphFile instanceof File &&
        qrphFile.size > 0
      ) {
        qrphQrFile =
          qrphFile;
      }
    } else {
      settings =
        await request.json();
    }

    await ensureBucket(db);

    if (gcashQrFile) {
      settings.gcash_qr =
        await uploadQr(
          db,
          gcashQrFile,
          "gcash"
        );
    }

    if (qrphQrFile) {
      settings.qrph_qr =
        await uploadQr(
          db,
          qrphQrFile,
          "qrph"
        );
    }

    const allowedKeys = [
      "gcash_name",
      "gcash_number",
      "gcash_qr",
      "qrph_qr",
      "qrph_fee",
      "terms",
      "removal_options",
    ];

    const rows = allowedKeys
      .filter(
        (key) =>
          settings[key] !==
          undefined
      )
      .map((key) => ({
        key,
        value:
          String(
            settings[key]
          ),
      }));

    if (rows.length) {
      const result =
        await db
          .from("site_settings")
          .upsert(rows, {
            onConflict: "key",
          });

      if (result.error) {
        throw result.error;
      }
    }

    const saved =
      Object.fromEntries(
        rows.map((row) => [
          row.key,
          row.value,
        ])
      );

    return NextResponse.json({
      ok: true,
      settings: saved,
    });
  } catch (error: any) {
    console.error(
      "Admin settings error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to save settings.",
      },
      { status: 500 }
    );
  }
}