"use client";
import { supabaseBrowser } from "@/lib/supabase-browser";
export default function LogoutButton(){
  return <button className="btn small secondary" onClick={async()=>{
    await supabaseBrowser().auth.signOut();
    location.href="/admin/login";
  }}>Sign out</button>
}
