import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const db = supabaseAdmin();

  const { data: admin } = await db
    .from("admins")
    .select("id")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (!admin) {
    redirect("/admin/login");
  }

  return <>{children}</>;
}