"use client";

import { useRouter } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase-browser";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabaseBrowser().auth.signOut();

    router.push("/admin");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="admin-logout-button"
      style={{
        padding: "6px 10px",
        fontSize: 11,
        minHeight: 30,
        height: 30,
      }}
    >
      Log out
    </button>
  );
}