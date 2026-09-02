export const dynamic = "force-dynamic";

import AdminLogin from "@/components/AdminLogin";
import AdminDashboard from "@/components/AdminDashboard";

import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export default async function AdminPage() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <AdminLogin />;
  }

  const db = supabaseAdmin();

  const { data: admin } = await db
    .from("admins")
    .select("id")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (!admin) {
    return <AdminLogin />;
  }

  return <AdminDashboard />;
}