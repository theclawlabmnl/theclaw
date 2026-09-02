"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  {
    href: "/admin",
    label: "Dashboard",
  },
  {
    href: "/admin/bookings",
    label: "Bookings",
  },
  {
    href: "/admin/payments",
    label: "Payments",
  },
  {
    href: "/admin/calendar",
    label: "Availability",
  },
  {
    href: "/admin/services",
    label: "Services",
  },
  {
    href: "/admin/promos",
    label: "Promotions",
  },
  {
    href: "/admin/gallery",
    label: "Gallery",
  },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const current =
    links.find((link) =>
      link.href === "/admin"
        ? pathname === "/admin"
        : pathname.startsWith(link.href)
    ) || links[0];

  return (
    <>
      {/* Desktop / sidebar navigation */}
      <nav
        className="admin-navigation admin-navigation-desktop"
        aria-label="Admin navigation"
      >
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
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile navigation */}
      <nav
        className="admin-navigation-mobile"
        aria-label="Mobile admin navigation"
      >
        <label htmlFor="admin-page-select">
          Admin page
        </label>

        <select
          id="admin-page-select"
          value={current.href}
          onChange={(event) => {
            router.push(event.target.value);
          }}
        >
          {links.map((link) => (
            <option
              key={link.href}
              value={link.href}
            >
              {link.label}
            </option>
          ))}
        </select>
      </nav>

      <style jsx global>{`
        /* =====================================================
           ADMIN NAVIGATION — CLEAN VERSION
           ===================================================== */

        .admin-navigation-desktop {
          display: block;
          min-width: 0;
        }

        .admin-navigation-desktop
          .admin-navigation-list {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .admin-navigation-desktop
          .admin-navigation-link {
          min-height: 42px;

          display: flex;
          align-items: center;

          padding: 9px 12px;

          border: 1px solid transparent;
          border-radius: 10px;

          color: #655d5f;

          font-size: 12px;
          font-weight: 600;
          line-height: 1;

          text-decoration: none;

          transition:
            background 0.15s ease,
            border-color 0.15s ease,
            color 0.15s ease;
        }

        .admin-navigation-desktop
          .admin-navigation-link:hover {
          background: #f8f5f3;
          border-color: #eee8e4;
          color: var(--admin-text);
        }

        .admin-navigation-desktop
          .admin-navigation-link.active {
          background: var(--admin-rose-soft);
          border-color: #ead1d6;
          color: var(--admin-text);
        }

        /* =====================================================
           MOBILE SELECTOR
           ===================================================== */

        .admin-navigation-mobile {
          display: none;
        }

        /* =====================================================
           MOBILE
           ===================================================== */

        @media (max-width: 800px) {
          .admin-navigation-desktop {
            display: none !important;
          }

          .admin-navigation-mobile {
            min-width: 0;

            display: flex;
            align-items: center;
            gap: 8px;

            flex: 1;
          }

          .admin-navigation-mobile label {
            position: absolute;

            width: 1px;
            height: 1px;

            padding: 0;
            margin: -1px;

            overflow: hidden;
            clip: rect(0, 0, 0, 0);

            white-space: nowrap;
            border: 0;
          }

          .admin-navigation-mobile select {
            width: 100%;
            min-width: 0;
            height: 40px;

            padding: 0 34px 0 13px;

            border: 1px solid #e4ddda;
            border-radius: 10px;

            background: #faf8f6;

            color: var(--admin-text);

            font-family: inherit;
            font-size: 12px;
            font-weight: 700;

            outline: none;

            appearance: auto;
          }

          .admin-navigation-mobile select:focus {
            border-color: #d5b8be;
          }
        }

        @media (max-width: 560px) {
          .admin-navigation-mobile select {
            height: 38px;
            font-size: 11px;
          }
        }
      `}</style>
    </>
  );
}