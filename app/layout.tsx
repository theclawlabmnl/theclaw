import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "The Claw Lab MNL — Your nails, but better.",
  description:
    "Boutique home-based nail studio in Novaliches, Quezon City.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="nav public-header">
          <div className="container public-header-inner">
            <nav className="navlinks">
              <Link href="/#services">Services</Link>
              <Link href="/#promo">Promo</Link>
              <Link href="/#reviews">Reviews</Link>
              <Link href="/#contact">Contact</Link>
            </nav>

            <Link
              className="btn small public-header-book"
              href="/book"
            >
              Book
            </Link>
          </div>
        </header>

        {children}

        <footer className="footer">
          <div className="container">
            <div className="brand">
              The Claw Lab MNL
            </div>

            <p className="muted">
              Novaliches, Quezon City, Philippines ·{" "}
              <a
                href="https://instagram.com/theclawlabmnl"
                target="_blank"
                rel="noreferrer"
              >
                @theclawlabmnl
              </a>
            </p>

            <small className="muted">
              © {new Date().getFullYear()} The Claw Lab MNL
            </small>
          </div>
        </footer>

        <style>{`
          .public-header-inner {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            width: 100%;
            gap: 18px;
          }

          .public-header-book {
            flex: 0 0 auto;
          }

          @media (max-width: 640px) {
            .public-header {
              display: none;
            }
          }
        `}</style>
      </body>
    </html>
  );
}