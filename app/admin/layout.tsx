import type { ReactNode } from "react";

import AdminShell from "@/components/AdminShell";

import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <>{children}</>;
  }

  const db = supabaseAdmin();

  const { data: admin } = await db
    .from("admins")
    .select("id")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (!admin) {
    return <>{children}</>;
  }

  return <AdminShell>{children}</AdminShell>;
}