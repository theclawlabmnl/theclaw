export const dynamic = "force-dynamic";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { peso } from "@/lib/utils";

export default async function Home() {
  let services:any[] = [], reviews:any[] = [], promo:any = null;
  try {
    const db=supabaseAdmin();
    const [s,r,p]=await Promise.all([
      db.from("services").select("id,name,description,price,duration_minutes").eq("active",true).order("sort_order"),
      db.from("reviews").select("rating,review_text,display_name").eq("status","approved").eq("featured",true).order("created_at",{ascending:false}).limit(6),
      db.from("promos").select("*").eq("active",true).order("created_at",{ascending:false}).limit(1).maybeSingle()
    ]);
    services=s.data||[]; reviews=r.data||[]; promo=p.data;
  } catch {}
  return <main>
    <section className="hero container"><div><div className="kicker">Boutique home nail studio · Manila</div><h1>The Claw Lab</h1><p>Your nails, but better. A soft, polished little nail studio in Novaliches, Quezon City.</p><div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:25}}><Link className="btn" href="/book">Book an appointment</Link><a className="btn secondary" href="https://instagram.com/theclawlabmnl" target="_blank">Instagram</a></div></div><div className="hero-card"><span>soft neutrals · clean details · pretty claws ♡</span></div></section>
    <section id="services" className="section"><div className="container"><div className="section-head"><div><div className="kicker">The menu</div><h2>Services</h2></div><Link href="/book" className="btn secondary small">View & book</Link></div><div className="grid">{services.length?services.map(s=><div className="card service-card" key={s.id}><h3>{s.name}</h3><p className="muted">{s.description||"A polished Claw Lab service."}</p><div className="price">{peso(s.price)} <span className="muted">· {s.duration_minutes} min</span></div></div>):<div className="card"><h3>Services coming together ♡</h3><p className="muted">Prices and details are configurable from the admin dashboard.</p></div>}</div></div></section>
    <section id="promo" className="section"><div className="container"><div className="promo"><div className="kicker">September</div><h2 className="serif">SEPTEM-BER PROMO</h2>{promo?<p>{promo.title}<br/><strong>{promo.description}</strong></p>:<div className="promo-grid"><div className="card"><div className="kicker">Soft</div><h3>₱1,099 · ANY DESIGN</h3><p>Soft Gel + Soft BIAB</p></div><div className="card"><div className="kicker">Hard</div><h3>₱1,399 · ANY DESIGN</h3><p>Hard Gel Extensions + Hard Builder Gel</p></div></div>}<p className="muted">Removal is not included. If the chosen design is originally worth less than the promo price, regular rate applies with 10% discount.</p></div></div></section>
    <section className="section"><div className="container"><div className="section-head"><div><div className="kicker">A little gallery</div><h2>Pretty details</h2></div></div><div className="gallery"><div>clean sets</div><div>soft blush</div><div>tiny details</div><div>fresh tips</div><div>the studio</div></div></div></section>
    <section id="reviews" className="section"><div className="container"><div className="section-head"><div><div className="kicker">Client love</div><h2>Loved by our clients ♡</h2></div></div><div className="grid">{reviews.length?reviews.map((r,i)=><div className="card review-card" key={i}><div>★★★★★</div><p>“{r.review_text}”</p><strong>— {r.display_name}</strong></div>):<div className="card"><p className="muted">Approved client reviews will appear here.</p></div>}</div></div></section>
    <section id="contact" className="section"><div className="container"><div className="card" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}><div><div className="kicker">Visit</div><h2 className="serif">Novaliches, Quezon City</h2><p className="muted">Home-based studio. Exact location and appointment instructions are shared according to your configured studio policies.</p></div><div><div className="kicker">Say hi</div><p><strong>Instagram</strong><br/>@theclawlabmnl</p><Link className="btn" href="/book">Book your set ♡</Link></div></div></div></section>
  </main>;
}