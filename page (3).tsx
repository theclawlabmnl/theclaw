export const dynamic = "force-dynamic";
import { supabaseAdmin } from "@/lib/supabase-admin";
import BookingForm from "@/components/BookingForm";

export default async function BookPage(){
  const db=supabaseAdmin();
  const {data:services}=await db.from("services").select("id,name,description,price,duration_minutes,active,sort_order,service_variations(id,name,price_delta,duration_delta_minutes,active,sort_order)").eq("active",true).order("sort_order");
  const {data:promos}=await db.from("promos").select("id,name,description,discount_type,discount_value,active").eq("active",true).order("created_at",{ascending:false});
  const {data:settings}=await db.from("site_settings").select("key,value").in("key",["terms","removal_options","promo_options"]);
  const map=Object.fromEntries((settings||[]).map(x=>[x.key,x.value]));
  return <main className="form-page"><div className="container"><div className="section-head"><div><div className="kicker">The Claw Lab</div><h1 className="serif" style={{fontSize:48,margin:"8px 0"}}>Book an appointment ♡</h1><p className="muted">Send a request first — your appointment is only confirmed after owner approval and payment verification.</p></div></div><BookingForm services={services||[]} promos={promos||[]} settings={map}/></div></main>
}