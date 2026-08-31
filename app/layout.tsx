import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "The Claw Lab — Your nails, but better.",
  description: "Boutique home-based nail studio in Novaliches, Quezon City.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <><header className="nav"><div className="container" style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%"}}>
    <Link href="/" className="brand">The Claw Lab</Link>
    <nav className="navlinks"><Link href="/#services">Services</Link><Link href="/#promo">Promo</Link><Link href="/#reviews">Reviews</Link><Link href="/#contact">Contact</Link></nav>
    <Link className="btn small" href="/book">Book</Link>
  </div></header>{children}<footer className="footer"><div className="container"><div className="brand">The Claw Lab</div><p className="muted">Novaliches, Quezon City, Philippines · Instagram @theclawlabmnl</p><small className="muted">© {new Date().getFullYear()} The Claw Lab</small></div></footer></>;
}