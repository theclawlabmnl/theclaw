"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: "⌂",
  },
  {
    href: "/admin/bookings",
    label: "Bookings",
    icon: "▣",
  },
  {
    href: "/admin/payments",
    label: "Payments",
    icon: "₱",
  },
  {
    href: "/admin/calendar",
    label: "Availability",
    icon: "◷",
  },
  {
    href: "/admin/services",
    label: "Services",
    icon: "✦",
  },
  {
    href: "/admin/promos",
    label: "Promotions",
    icon: "%",
  },
  {
    href: "/admin/gallery",
    label: "Gallery",
    icon: "▧",
  },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-navigation" aria-label="Admin navigation">
      <div className="admin-navigation-list">
        {links.map((link) => {
          const active =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`admin-navigation-link ${
                active ? "active" : ""
              }`}
            >
              <span className="admin-navigation-icon">
                {link.icon}
              </span>

              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}