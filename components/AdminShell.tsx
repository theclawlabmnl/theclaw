"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";

const navigation = [
  {
    href: "/admin",
    label: "Dashboard",
  },
  {
    href: "/admin/bookings",
    label: "Bookings",
  },
  {
    href: "/admin/calendar",
    label: "Calendar",
  },
  {
    href: "/admin/services",
    label: "Services",
  },
  {
    href: "/admin/promos",
    label: "Promos",
  },
  {
    href: "/admin/payments",
    label: "Payments",
  },
  {
    href: "/admin/reviews",
    label: "Reviews",
  },
  {
    href: "/admin/settings",
    label: "Settings",
  },
];

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <div className="admin-brand">
          <div className="brand">
            The Claw Lab MNL
          </div>

          <div className="admin-subtitle">
            Owner dashboard
          </div>
        </div>

        <nav className="admin-nav">
          {navigation.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "admin-nav-link active"
                    : "admin-nav-link"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="admin-logout">
          <LogoutButton />
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-main-inner">
          {children}
        </div>
      </main>
    </div>
  );
}