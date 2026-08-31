"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { label: "Dashboard", href: "/admin" },
  { label: "Bookings", href: "/admin/bookings" },
  { label: "Calendar", href: "/admin/calendar" },
  { label: "Services", href: "/admin/services" },
  { label: "Promos", href: "/admin/promos" },
  { label: "Payments", href: "/admin/payments" },
  { label: "Reviews", href: "/admin/reviews" },
  { label: "Settings", href: "/admin/settings" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const activeLabel =
    links.find((item) => isActive(pathname, item.href))?.label ??
    "Dashboard";

  return (
    <nav className="admin-navigation" aria-label="Admin navigation">
      <div className="admin-navigation-desktop">
        {links.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-navigation-link${active ? " active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="admin-navigation-mobile">
        <label htmlFor="admin-section">Section</label>
        <select
          id="admin-section"
          value={activeLabel}
          onChange={(event) => {
            const next = links.find((item) => item.label === event.target.value);
            if (next) router.push(next.href);
          }}
        >
          {links.map((item) => (
            <option key={item.href} value={item.label}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
    </nav>
  );
}
