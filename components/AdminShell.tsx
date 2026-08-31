import Link from "next/link";
import LogoutButton from "./LogoutButton";

export default function AdminShell({children}:{children:React.ReactNode}) {
  return <div className="admin-shell">
    <aside className="admin-side">
      <div className="brand">The Claw Lab</div>
      <div className="muted">Owner dashboard</div>
      <nav>
        <Link href="/admin">Dashboard</Link>
        <Link href="/admin/bookings">Bookings</Link>
        <Link href="/admin/calendar">Calendar</Link>
        <Link href="/admin/services">Services</Link>
        <Link href="/admin/promos">Promos</Link>
        <Link href="/admin/payments">Payments</Link>
        <Link href="/admin/reviews">Reviews</Link>
        <Link href="/admin/settings">Payment & Settings</Link>
      </nav>
      <div style={{marginTop:20}}><LogoutButton/></div>
    </aside>
    <main className="admin-main">{children}</main>
  </div>
}
