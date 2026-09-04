export const dynamic = "force-dynamic";

import { supabaseAdmin } from "@/lib/supabase-admin";
import GalleryManager from "@/components/GalleryManager";

export default async function Gallery() {
  const db = supabaseAdmin();

  const { data } = await db
    .from("gallery")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <>
      <div className="section-head">
        <div>
          <div className="kicker">Portfolio</div>
          <h1 className="serif">Gallery</h1>
          <p className="muted">
            Upload and manage the photos displayed on your website.
          </p>
        </div>
      </div>

      <GalleryManager photos={data || []} />
    </>
  );
}