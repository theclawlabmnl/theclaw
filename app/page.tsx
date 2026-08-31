export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { peso } from "@/lib/utils";

export default async function Home() {
  let services: any[] = [];
  let reviews: any[] = [];
  let promo: any = null;

  try {
    const db = supabaseAdmin();

    const [
      servicesResult,
      reviewsResult,
      promoResult,
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
        .from("reviews")
        .select(
          "rating,review_text,display_name"
        )
        .eq("status", "approved")
        .eq("featured", true)
        .order("created_at", {
          ascending: false,
        })
        .limit(6),

      db
        .from("promos")
        .select("*")
        .eq("active", true)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle(),
    ]);

    services =
      servicesResult.data || [];

    reviews =
      reviewsResult.data || [];

    promo =
      promoResult.data;
  } catch {
    // Keep homepage available if Supabase temporarily fails.
  }

  return (
    <main>
      {/* HERO */}
      <section className="hero container">
        <div>
          <div className="hero-card">
            <div className="hero-card-content">
              <h1>
                The Claw Lab MNL
              </h1>

              <p>
                Homebased Nail Studio ·
                Quezon City
              </p>
            </div>
          </div>

          <div className="kicker">
            soft neutrals · clean details ·
            pretty claws ♡
          </div>

          <p>
            Your nails, but better. A soft,
            polished little nail studio in
            Novaliches, Quezon City.
          </p>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 25,
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
        </div>
      </section>

      {/* PROMO */}
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
                  whiteSpace:
                    "pre-wrap",
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

      {/* SERVICES */}
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
                    key={
                      service.id
                    }
                  >
                    <h3>
                      {
                        service.name
                      }
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
                  Services coming together
                  ♡
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

      {/* REVIEWS */}
      <section
        id="reviews"
        className="section"
      >
        <div className="container">
          <div className="section-head">
            <div>
              <div className="kicker">
                Client love
              </div>

              <h2>
                Loved by our clients ♡
              </h2>
            </div>
          </div>

          <div className="grid">
            {reviews.length ? (
              reviews.map(
                (
                  review,
                  index
                ) => (
                  <div
                    className="card review-card"
                    key={`${review.display_name}-${index}`}
                  >
                    <div>
                      ★★★★★
                    </div>

                    <p>
                      “
                      {
                        review.review_text
                      }
                      ”
                    </p>

                    <strong>
                      —{" "}
                      {
                        review.display_name
                      }
                    </strong>
                  </div>
                )
              )
            ) : (
              <div className="card">
                <p className="muted">
                  Client reviews will
                  appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section
        id="contact"
        className="section contact-section"
      >
        <div className="container">
          <div className="contact-card">
            {/* LOCATION */}
            <div className="contact-item">
              <div className="kicker">
                Location
              </div>

              <h2 className="serif">
                Novaliches, Quezon City
              </h2>

              <p className="muted">
                Home-based studio. For privacy
                and security, the exact location
                will only be shared after your
                appointment has been approved.
              </p>
            </div>

            {/* CONTACT */}
            <div className="contact-item">
              <div className="kicker">
                Get in touch
              </div>

              <div className="contact-details">
                <div className="contact-detail">
                  <span>
                    Email
                  </span>

                  <a
                    href="mailto:theclawlabmnl@gmail.com"
                  >
                    theclawlabmnl@gmail.com
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
        </div>
      </section>
    </main>
  );
}