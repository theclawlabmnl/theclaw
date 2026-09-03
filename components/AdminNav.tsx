"use client";

import Link from "next/link";
import {
  usePathname,
  useRouter,
} from "next/navigation";

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

type AdminNavProps = {
  variant?: "desktop" | "mobile";
};

export default function AdminNav({
  variant = "desktop",
}: AdminNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const current =
    links.find((link) =>
      link.href === "/admin"
        ? pathname === "/admin"
        : pathname.startsWith(link.href)
    ) || links[0];

  if (variant === "mobile") {
    return (
      <nav
        className="admin-navigation admin-navigation-mobile"
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
          .admin-navigation {
            width: 100%;
            min-width: 0;
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

          .admin-navigation-mobile {
            width: calc(100% - 32px);
            max-width: 720px;
            margin: 14px auto 0;
          }

          .admin-navigation-mobile select {
            width: 100%;
            min-width: 0;
            height: 42px;
            padding: 0 38px 0 14px;
            border: 1px solid #e4ddda;
            border-radius: 10px;
            background: #faf8f6;
            color: var(--admin-text);
            font-family: inherit;
            font-size: 13px;
            font-weight: 700;
            outline: none;
            appearance: auto;
            cursor: pointer;
            box-sizing: border-box;
          }

          .admin-navigation-mobile select:focus {
            border-color: #d5b8be;
          }

          @media (max-width: 800px) {
            .admin-sidebar {
              display: none !important;
            }

            .admin-workspace {
              width: 100% !important;
              margin-left: 0 !important;
            }

            .admin-mobile-header {
              display: flex !important;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
            }

            .admin-mobile-nav-wrap {
              display: block !important;
              width: 100%;
              box-sizing: border-box;
            }
          }

          @media (max-width: 560px) {
            .admin-navigation-mobile select {
              height: 40px;
              font-size: 12px;
            }
          }
        `}</style>
      </nav>
    );
  }

  return (
    <nav
      className="admin-navigation admin-navigation-desktop"
      aria-label="Admin navigation"
    >
      {links.map((link) => {
        const active =
          link.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`admin-nav-link${
              active ? " active" : ""
            }`}
          >
            {link.label}
          </Link>
        );
      })}

      <style jsx global>{`
        /*
         * DESKTOP ADMIN SHELL
         * Keep the sidebar fixed while only the workspace scrolls.
         */
        @media (min-width: 801px) {
          .admin-app-shell {
            min-height: 100vh;
          }

          .admin-sidebar {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            bottom: 0 !important;
            width: 240px !important;
            height: 100vh !important;
            box-sizing: border-box !important;
            overflow-y: auto !important;
            z-index: 40 !important;
          }

          .admin-workspace {
            width: calc(100% - 240px) !important;
            min-width: 0 !important;
            margin-left: 240px !important;
          }

          .admin-mobile-header,
          .admin-mobile-nav-wrap {
            display: none !important;
          }
        }

        .admin-navigation-desktop {
          display: flex;
          flex-direction: column;
          gap: 7px;
          width: 100%;

          padding: 0 !important;
          margin: 0 !important;
          background: transparent !important;
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          outline: none !important;
          overflow: visible !important;
        }

        .admin-navigation-desktop::before,
        .admin-navigation-desktop::after {
          display: none !important;
          content: none !important;
        }

        .admin-nav-link {
          display: flex;
          align-items: center;
          min-height: 40px;
          width: 100%;
          padding: 0 12px;
          border: 1px solid transparent;
          border-radius: 10px;
          box-sizing: border-box;
          color: var(--admin-text);
          text-decoration: none;
          font-size: 12px;
          font-weight: 700;
          transition:
            background 0.15s ease,
            border-color 0.15s ease;
        }

        .admin-nav-link:hover {
          background: #faf8f6;
          border-color: #eee5e2;
        }

        .admin-nav-link.active {
          background: #faf8f6;
          border-color: #e4ddda;
        }

        @media (max-width: 800px) {
          .admin-navigation-desktop {
            display: none;
          }
        }
      `}</style>
    </nav>
  );
}
