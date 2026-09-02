"use client";

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
    <nav
      className="admin-navigation"
      aria-label="Admin navigation"
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

      <style jsx global>{`
        /* =====================================================
           ADMIN NAVIGATION
           Section picker only
           ===================================================== */

        .admin-navigation {
          width: 100%;
          min-width: 0;

          display: flex;
          align-items: center;
          gap: 8px;
        }

        .admin-navigation label {
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

        .admin-navigation select {
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

          cursor: pointer;
        }

        .admin-navigation select:focus {
          border-color: #d5b8be;
        }

        @media (max-width: 800px) {
          .admin-navigation {
            flex: 1;
          }

          .admin-navigation select {
            height: 40px;
            font-size: 12px;
          }
        }

        @media (max-width: 560px) {
          .admin-navigation select {
            height: 38px;
            font-size: 11px;
          }
        }
      `}</style>
    </nav>
  );
}