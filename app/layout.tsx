import type { Metadata } from "next";
import "./globals.css";

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
        {children}

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