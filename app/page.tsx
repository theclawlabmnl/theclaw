export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { peso } from "@/lib/utils";
import FeaturedReviews from "@/components/FeaturedReviews";

export default async function Home() {
  let services: any[] = [];
  let promo: any = null;
  let settings: Record<string, string> = {};

  try {
    const db = supabaseAdmin();

    const [
      servicesResult,
      promoResult,
      settingsResult,
    ] = await Promise.all([
      db
        .from("services")
        .select(
          "id,name,description,price,duration_minutes"
        )
        .eq("active", true)
        .order("sort_order", {
          ascending: true,
        }),

      db
        .from("promos")
        .select("*")
        .eq("active", true)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle(),

      db
        .from("site_settings")
        .select("key,value"),
    ]);

    services =
      servicesResult.data || [];

    promo =
      promoResult.data;

    settings =
      Object.fromEntries(
        (
          settingsResult.data ||
          []
        ).map(
          (item) => [
            item.key,
            item.value,
          ]
        )
      );
  } catch {
    // Keep the homepage available if Supabase temporarily fails.
  }

  const email =
    settings.email ||
    settings.contact_email ||
    settings.business_email ||
    "theclawlabmnl@gmail.com";

  return (
    <main>
      {/* =====================================================
          HERO
      ====================================================== */}

      <section
        className="hero container home-hero"
        style={{
          width: "100%",
          maxWidth: 1200,
          margin: "0 auto",
          paddingTop: 42,
          paddingBottom: 72,
          paddingLeft: 16,
          paddingRight: 16,
          boxSizing: "border-box",
        }}
      >
        <div
          className="home-hero-inner"
          style={{
            width: "100%",
            maxWidth: 760,
            margin: "0 auto",
            textAlign: "center",
            boxSizing: "border-box",
          }}
        >
          <div
            className="home-hero-card"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "30px 26px",
              borderRadius: 24,
              border:
                "1px solid var(--line)",
              background: "#fffaf8",
              boxShadow:
                "0 10px 30px rgba(91, 65, 65, 0.08)",
              overflow: "hidden",
            }}
          >
            <div
              className="kicker"
              style={{
                marginBottom: 10,
              }}
            >
              THE CLAW LAB MNL
            </div>

            <h1
              className="serif home-hero-title"
              style={{
                margin: 0,
                color:
                  "var(--ink, #3f3535)",
                fontSize:
                  "clamp(34px, 7vw, 60px)",
                lineHeight: 1.05,
                fontWeight: 500,
                overflowWrap:
                  "anywhere",
              }}
            >
              Your nails, but better.
            </h1>

            <p
              className="home-hero-subtitle"
              style={{
                margin: "12px 0 0",
                color:
                  "var(--muted, #776a6a)",
                fontSize:
                  "clamp(14px, 2vw, 17px)",
                lineHeight: 1.5,
                overflowWrap:
                  "anywhere",
              }}
            >
              Homebased Nail Studio ·
              Quezon City
            </p>
          </div>

          <div
            className="kicker"
            style={{
              marginTop: 24,
            }}
          >
            soft neutrals · clean details ·
            pretty claws ♡
          </div>

          <p
            style={{
              maxWidth: 620,
              margin: "12px auto 0",
              lineHeight: 1.7,
            }}
          >
            A soft, polished little nail
            studio in Novaliches, Quezon
            City. Your appointment starts
            with a simple request, then
            Nailtech approval.
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 24,
            }}
          >
            <Link
              className="btn"
              href="/book"
            >
              Book an appointment
            </Link>

            <a
              className="btn secondary"
              href="https://instagram.com/theclawlabmnl"
              target="_blank"
              rel="noreferrer"
            >
              Instagram
            </a>
          </div>

          {/* BOOKING STATUS LINK */}

          <div
            style={{
              marginTop: 16,
              textAlign: "center",
            }}
          >
            <span
              className="muted"
              style={{
                fontSize: 13,
              }}
            >
              Booked already?{" "}
            </span>

            <Link
              href="/status"
              style={{
                fontSize: 13,
                fontWeight: 600,
                textDecoration:
                  "underline",
                textUnderlineOffset: 3,
              }}
            >
              Check your status here →
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================================
          PROMO
      ====================================================== */}

      <section
        id="promo"
        className="section"
      >
        <div className="container">
          <div className="promo">
            <div className="kicker">
              Promo of the Day
            </div>

            <h2 className="serif">
              SEPTEM-BER PROMO
            </h2>

            {promo ? (
              <p
                style={{
                  whiteSpace: "pre-wrap",
                }}
              >
                <strong>
                  {promo.name}
                </strong>

                <br />

                {promo.description}
              </p>
            ) : (
              <div className="promo-grid">
                <div className="card">
                  <div className="kicker">
                    Soft
                  </div>

                  <h3>
                    ₱1,099 · ANY DESIGN
                  </h3>

                  <p>
                    Soft Gel + Soft BIAB
                  </p>
                </div>

                <div className="card">
                  <div className="kicker">
                    Hard
                  </div>

                  <h3>
                    ₱1,399 · ANY DESIGN
                  </h3>

                  <p>
                    Hard Gel Extensions +
                    Hard Builder Gel
                  </p>
                </div>
              </div>
            )}

            <p className="muted">
              Removal is not included. If
              the chosen design is originally
              worth less than the promo price,
              regular rate applies with 10%
              discount.
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================
          SERVICES
      ====================================================== */}

      <section
        id="services"
        className="section"
      >
        <div className="container">
          <div className="section-head">
            <div>
              <div className="kicker">
                The menu
              </div>

              <h2>
                Services
              </h2>
            </div>

            <Link
              href="/book"
              className="btn secondary small"
            >
              View &amp; book
            </Link>
          </div>

          <div className="grid">
            {services.length ? (
              services.map(
                (service) => (
                  <div
                    className="card service-card"
                    key={service.id}
                  >
                    <h3>
                      {service.name}
                    </h3>

                    <p className="muted">
                      {service.description ||
                        "A polished Claw Lab MNL service."}
                    </p>

                    <div className="price">
                      {peso(
                        service.price
                      )}{" "}
                      <span className="muted">
                        ·{" "}
                        {
                          service.duration_minutes
                        }{" "}
                        min
                      </span>
                    </div>
                  </div>
                )
              )
            ) : (
              <div className="card">
                <h3>
                  Services coming together ♡
                </h3>

                <p className="muted">
                  Prices and details are
                  configurable from the admin
                  dashboard.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================
          REVIEWS
      ====================================================== */}

      <FeaturedReviews />

      {/* =====================================================
          CONTACT
      ====================================================== */}

      <section
        id="contact"
        className="section contact-section"
      >
        <div className="container">
          <div className="contact-card">
            <div className="contact-item">
              <div className="kicker">
                Location
              </div>

              <h2 className="serif">
                Novaliches, Quezon City
              </h2>

              <p className="muted">
                Home-based studio. For
                privacy and security, the
                exact location is shared only
                after your appointment is
                approved.
              </p>
            </div>

            <div className="contact-item">
              <div className="kicker">
                Get in touch
              </div>

              <div className="contact-detail">
                <span>
                  Email
                </span>

                <a
                  href={`mailto:${email}`}
                >
                  {email}
                </a>
              </div>

              <div className="contact-socials">
                <a
                  className="btn secondary small"
                  href="https://instagram.com/theclawlabmnl"
                  target="_blank"
                  rel="noreferrer"
                >
                  Instagram
                </a>

                <a
                  className="btn secondary small"
                  href="https://m.me/theclawlabmnl"
                  target="_blank"
                  rel="noreferrer"
                >
                  Messenger
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          HERO SAFEGUARDS
      ====================================================== */}

      <style>{`
        .home-hero,
        .home-hero * {
          min-width: 0;
        }

        .home-hero-card,
        .home-hero-card h1,
        .home-hero-card p,
        .home-hero-card .kicker {
          visibility: visible !important;
          opacity: 1 !important;
        }

        .home-hero-card h1 {
          display: block !important;
          position: static !important;
          color: var(--ink, #3f3535) !important;
        }

        .home-hero-card p {
          display: block !important;
          position: static !important;
          color: var(--muted, #776a6a) !important;
        }

        @media (max-width: 640px) {
          .home-hero {
            padding-top: 24px !important;
            padding-bottom: 52px !important;
          }

          .home-hero-card {
            padding: 24px 18px !important;
            border-radius: 20px !important;
          }
        }
      `}</style>
    </main>
  );
}