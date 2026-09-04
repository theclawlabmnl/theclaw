import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const BUCKET = "site-assets";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type PaymentMethod = {
  id: string;
  name: string;
  account_name?: string;
  account_details?: string;
  instructions?: string;
  processing_fee?: number;
  qr_url?: string;
  active?: boolean;
};

function extensionForType(contentType: string) {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

function safeId(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeMethods(value: unknown): PaymentMethod[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();

  return value
    .map((item: any, index) => {
      const name = String(item?.name || "").trim();
      let id = safeId(item?.id || name || `method-${index + 1}`);

      if (!name || !id) return null;

      while (seen.has(id)) {
        id = `${id}-${index + 1}`;
      }
      seen.add(id);

      const fee = Number(item?.processing_fee || 0);

      return {
        id,
        name,
        account_name: String(item?.account_name || "").trim(),
        account_details: String(item?.account_details || "").trim(),
        instructions: String(item?.instructions || "").trim(),
        processing_fee:
          Number.isFinite(fee) && fee >= 0 ? fee : 0,
        qr_url: String(item?.qr_url || "").trim(),
        active: item?.active !== false,
      } satisfies PaymentMethod;
    })
    .filter(Boolean) as PaymentMethod[];
}

async function ensureBucket(
  db: ReturnType<typeof supabaseAdmin>
) {
  const existing = await db.storage.getBucket(BUCKET);

  if (!existing.data) {
    const created = await db.storage.createBucket(BUCKET, {
      public: true,
    });

    if (
      created.error &&
      !created.error.message?.toLowerCase().includes("already exists")
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
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("QR images must be JPG, PNG, or WEBP.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("QR image must be 5MB or smaller.");
  }

  const extension = extensionForType(file.type);
  const filename = `${safeId(prefix) || "payment"}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${extension}`;
  const path = `payment-qr/${filename}`;

  const uploaded = await db.storage.from(BUCKET).upload(
    path,
    Buffer.from(await file.arrayBuffer()),
    {
      contentType: file.type,
      upsert: true,
    }
  );

  if (uploaded.error) throw uploaded.error;

  return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function POST(request: Request) {
  try {
    const db = supabaseAdmin();
    const contentType = request.headers.get("content-type") || "";

    let settings: Record<string, any> = {};
    const paymentQrFiles = new Map<string, File>();

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const rawSettings = formData.get("settings");

      if (typeof rawSettings !== "string") {
        return NextResponse.json(
          { error: "Missing settings data." },
          { status: 400 }
        );
      }

      try {
        settings = JSON.parse(rawSettings);
      } catch {
        return NextResponse.json(
          { error: "Invalid settings data." },
          { status: 400 }
        );
      }

      for (const [key, value] of formData.entries()) {
        if (
          key.startsWith("payment_qr__") &&
          value instanceof File &&
          value.size > 0
        ) {
          paymentQrFiles.set(key.slice("payment_qr__".length), value);
        }
      }
    } else {
      settings = await request.json();
    }

    let paymentMethods: PaymentMethod[] | null = null;

    if (settings.payment_methods !== undefined) {
      let parsed = settings.payment_methods;

      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          return NextResponse.json(
            { error: "Invalid payment methods data." },
            { status: 400 }
          );
        }
      }

      paymentMethods = normalizeMethods(parsed);

      if (paymentMethods.length === 0) {
        return NextResponse.json(
          { error: "Please keep at least one payment method." },
          { status: 400 }
        );
      }

      await ensureBucket(db);

      for (const method of paymentMethods) {
        const file = paymentQrFiles.get(method.id);
        if (file) {
          method.qr_url = await uploadQr(db, file, method.id);
        }
      }

      settings.payment_methods = JSON.stringify(paymentMethods);
    }

    const allowedKeys = [
      "payment_methods",
      "gcash_name",
      "gcash_number",
      "gcash_qr",
      "qrph_qr",
      "qrph_fee",
      "terms",
      "removal_options",
    ];

    const rows = allowedKeys
      .filter((key) => settings[key] !== undefined)
      .map((key) => ({
        key,
        value: String(settings[key]),
      }));

    if (rows.length) {
      const result = await db
        .from("site_settings")
        .upsert(rows, { onConflict: "key" });

      if (result.error) throw result.error;
    }

    const saved = Object.fromEntries(
      rows.map((row) => [row.key, row.value])
    );

    if (paymentMethods) {
      saved.payment_methods = JSON.stringify(paymentMethods);
    }

    return NextResponse.json({
      ok: true,
      settings: saved,
      paymentMethods,
    });
  } catch (error: any) {
    console.error("Admin settings error:", error);

    return NextResponse.json(
      {
        error: error?.message || "Unable to save settings.",
      },
      { status: 500 }
    );
  }
}
