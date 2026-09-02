export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";

export default async function Home() {
  let services: any[] = [];
  let reviews: any[] = [];
  let promo: any = null;
  let settings: Record<string, string> = {};

  try {
    const db = supabaseAdmin();

    const [
      servicesResult,
      reviewsResult,
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

      db
        .from("site_settings")
        .select("key,value"),
    ]);

    services = servicesResult.data || [];
    reviews = reviewsResult.data || [];
    promo = promoResult.data;

    settings = Object.fromEntries(
      (settingsResult.data || []).map(
        (item) => [item.key, item.value]
      )
    );
  } catch {
    // Keep homepage available if Supabase is temporarily unavailable.
  }

  const email =
    settings.email ||
    settings.contact_email ||
    settings.business_email ||
    "theclawlabmnl@gmail.com";

  return (
    <main className="claw-home">
      {/* HEADER */}

      <header className="home-header">
        <div className="home-header-inner">
          <Link
            href="/"
            className="home-logo"
          >
            <span>The Claw Lab</span>
            <small>MNL</small>
          </Link>

          <nav className="home-nav">
            <a href="#services">
              Services
            </a>

            <a href="#promo">
              Promo
            </a>

            <a href="#reviews">
              Reviews
            </a>

            <a href="#contact">
              Contact
            </a>
          </nav>

          <Link
            href="/book"
            className="home-header-button"
          >
            Book
          </Link>
        </div>
      </header>

      {/* HERO */}

      <section className="home-hero">
        <div className="home-hero-inner">
          <div className="home-hero-copy">
            <div className="home-eyebrow">
              HOME-BASED NAIL STUDIO · NOVALICHES
            </div>

            <h1>
              Your nails,
              <br />
              <em>but better.</em>
            </h1>

            <p className="home-hero-description">
              A soft, polished little nail studio
              in Quezon City for pretty claws,
              thoughtful details, and a little
              time to yourself.
            </p>

            <div className="home-hero-actions">
              <Link
                href="/book"
                className="home-button home-button-primary"
              >
                Book an appointment
              </Link>

              <Link
                href="/status"
                className="home-text-link"
              >
                Check booking status
              </Link>
            </div>

            <div className="home-hero-note">
              <span>♡</span>

              <span>
                Appointment requests are personally
                reviewed before confirmation.
              </span>
            </div>
          </div>

          {/* ONLY HOMEPAGE PHOTO */}

          <div className="home-hero-image-wrap">
            <div className="home-hero-image">
              <img
                src="/hero-nails.jpg"
                alt="Elegant pink manicure"
              />
            </div>

            <div className="home-hero-caption">
              <span>The Claw Lab MNL</span>
              <span>Quezon City</span>
            </div>
          </div>
        </div>
      </section>

      {/* PROMO — ADMIN DATA ONLY */}

      <section
        id="promo"
        className="home-promo"
      >
        <div className="home-promo-inner">
          <div className="home-promo-content">
            <div className="home-eyebrow">
              CURRENT OFFER
            </div>

            <h2>
              A little something
              <br />
              <em>extra.</em>
            </h2>

            {promo ? (
              <>
                <div className="home-promo-name">
                  {promo.name}
                </div>

                {promo.description && (
                  <p className="home-promo-description">
                    {promo.description}
                  </p>
                )}

                <Link
                  href="/book"
                  className="home-button home-button-dark"
                >
                  Book this offer
                </Link>
              </>
            ) : (
              <div className="home-promo-default">
                <strong>
                  Check back soon.
                </strong>

                <p>
                  New promotions and special
                  offers will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* INTRO */}

      <section className="home-intro">
        <div className="home-intro-inner">
          <div className="home-intro-label">
            THE CLAW LAB
          </div>

          <p>
            Pretty nails don't have to feel
            complicated. We keep things personal,
            comfortable, and beautifully simple.
          </p>

          <div className="home-intro-location">
            Novaliches · Quezon City · Philippines
          </div>
        </div>
      </section>

      {/* SERVICES */}

      <section
        id="services"
        className="home-section home-services"
      >
        <div className="home-section-inner">
          <div className="home-section-heading">
            <div>
              <div className="home-eyebrow">
                THE MENU
              </div>

              <h2>
                Choose your
                <br />
                <em>kind of pretty.</em>
              </h2>
            </div>

            <Link
              href="/book"
              className="home-outline-link"
            >
              View &amp; book
            </Link>
          </div>

          <div className="home-services-grid">
            {services.length ? (
              services.map(
                (
                  service,
                  index
                ) => (
                  <article
                    className="home-service-card"
                    key={service.id}
                  >
                    <div className="home-service-card-number">
                      {String(
                        index + 1
                      ).padStart(
                        2,
                        "0"
                      )}
                    </div>

                    <h3>
                      {service.name}
                    </h3>

                    <p>
                      {service.description ||
                        "A polished Claw Lab MNL service."}
                    </p>
                  </article>
                )
              )
            ) : (
              <div className="home-empty">
                <h3>
                  Services coming together ♡
                </h3>

                <p>
                  Services and descriptions
                  are managed from the
                  admin dashboard.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* EXPERIENCE */}

      <section className="home-experience">
        <div className="home-experience-inner">
          <div className="home-eyebrow">
            THE EXPERIENCE
          </div>

          <h2>
            Soft details.
            <br />
            <em>Pretty results.</em>
          </h2>

          <p>
            From your first booking request to
            the final little detail, every
            appointment is designed to feel
            personal, relaxed, and worth the time.
          </p>

          <div className="home-experience-points">
            <div>
              <span>01</span>

              <strong>
                Personal booking review
              </strong>

              <p>
                Every appointment request is
                reviewed before your schedule
                is confirmed.
              </p>
            </div>

            <div>
              <span>02</span>

              <strong>
                Thoughtful nail care
              </strong>

              <p>
                Clean, polished work with
                attention to the small details.
              </p>
            </div>

            <div>
              <span>03</span>

              <strong>
                A little time for you
              </strong>

              <p>
                A cozy home-based studio where
                you can simply sit back and enjoy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* REVIEWS */}

      <section
        id="reviews"
        className="home-section home-reviews"
      >
        <div className="home-section-inner">
          <div className="home-section-heading">
            <div>
              <div className="home-eyebrow">
                CLIENT LOVE
              </div>

              <h2>
                Loved by our
                <br />
                <em>clients ♡</em>
              </h2>
            </div>
          </div>

          <div className="home-review-grid">
            {reviews.length ? (
              reviews.map(
                (
                  review,
                  index
                ) => (
                  <article
                    className="home-review"
                    key={`${review.display_name}-${index}`}
                  >
                    <div className="home-review-stars">
                      {"★".repeat(
                        Math.min(
                          5,
                          Math.max(
                            1,
                            Number(
                              review.rating ||
                                5
                            )
                          )
                        )
                      )}
                    </div>

                    <p>
                      “
                      {review.review_text}
                      ”
                    </p>

                    <strong>
                      {review.display_name}
                    </strong>
                  </article>
                )
              )
            ) : (
              <div className="home-empty">
                <p>
                  Client reviews will appear
                  here.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CONTACT */}

      <section
        id="contact"
        className="home-contact"
      >
        <div className="home-contact-inner">
          <div className="home-eyebrow">
            FIND US
          </div>

          <h2>
            A little studio
            <br />
            in <em>Novaliches.</em>
          </h2>

          <div className="home-contact-grid">
            <div>
              <span>
                LOCATION
              </span>

              <strong>
                Novaliches,
                <br />
                Quezon City
              </strong>

              <p>
                Home-based studio.
                The exact location is
                shared only after your
                appointment is approved.
              </p>
            </div>

            <div>
              <span>
                EMAIL
              </span>

              <a
                href={`mailto:${email}`}
              >
                {email}
              </a>

              <span className="home-contact-spaced">
                SOCIAL
              </span>

              <div className="home-contact-links">
                <a
                  href="https://instagram.com/theclawlabmnl"
                  target="_blank"
                  rel="noreferrer"
                >
                  Instagram
                </a>

                <a
                  href="https://m.me/theclawlabmnl"
                  target="_blank"
                  rel="noreferrer"
                >
                  Messenger
                </a>
              </div>
            </div>
          </div>

          <a
            href="#"
            className="home-back-to-top"
            aria-label="Back to top"
          >
            Back to top ↑
          </a>
        </div>
      </section>

      <style>{`
        .claw-home {
          --home-cream: #faf6f2;
          --home-warm: #f3e7e1;
          --home-blush: #ead0d1;
          --home-rose: #c99fa5;
          --home-ink: #332c2c;
          --home-muted: #766a68;
          --home-line: rgba(71, 57, 57, 0.14);
          --home-white: #fffdfb;

          width: 100%;
          overflow: clip;
          background: var(--home-cream);
          color: var(--home-ink);
        }

        .claw-home *,
        .claw-home *::before,
        .claw-home *::after {
          box-sizing: border-box;
        }

        .home-header {
          position: sticky;
          top: 0;
          z-index: 1000;
          width: 100%;
          border-bottom: 1px solid var(--home-line);
          background: rgba(250, 246, 242, 0.94);
        }

        .home-header-inner {
          width: 100%;
          max-width: 1240px;
          min-height: 72px;
          margin: 0 auto;
          padding: 0 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .home-logo {
          display: inline-flex;
          align-items: baseline;
          gap: 7px;
          color: var(--home-ink);
          text-decoration: none;
          white-space: nowrap;
        }

        .home-logo span {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 21px;
          line-height: 1;
        }

        .home-logo small {
          font-size: 8px;
          letter-spacing: 0.22em;
          font-weight: 700;
        }

        .home-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 30px;
        }

        .home-nav a {
          color: var(--home-muted);
          text-decoration: none;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .home-nav a:hover {
          color: var(--home-ink);
        }

        .home-header-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 38px;
          padding: 0 17px;
          border: 1px solid var(--home-ink);
          border-radius: 999px;
          background: var(--home-ink);
          color: #fff;
          text-decoration: none;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .home-hero {
          width: 100%;
          padding: 68px 28px 86px;
        }

        .home-hero-inner {
          width: 100%;
          max-width: 1240px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(0, 0.86fr) minmax(0, 1.14fr);
          align-items: center;
          gap: clamp(42px, 7vw, 100px);
        }

        .home-hero-copy {
          min-width: 0;
          padding-left: clamp(0px, 3vw, 42px);
        }

        .home-eyebrow {
          color: var(--home-muted);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.19em;
          line-height: 1.4;
          text-transform: uppercase;
        }

        .home-hero h1,
        .home-section h2,
        .home-promo h2,
        .home-experience h2,
        .home-contact h2 {
          margin: 0;
          font-family: Georgia, "Times New Roman", serif;
          font-weight: 400;
          letter-spacing: -0.045em;
        }

        .home-hero h1 {
          max-width: 620px;
          margin-top: 20px;
          font-size: clamp(54px, 7vw, 96px);
          line-height: 0.92;
        }

        .home-hero h1 em,
        .home-section h2 em,
        .home-promo h2 em,
        .home-experience h2 em,
        .home-contact h2 em {
          font-style: italic;
          font-weight: 400;
        }

        .home-hero-description {
          max-width: 480px;
          margin: 28px 0 0;
          color: var(--home-muted);
          font-size: 14px;
          line-height: 1.8;
        }

        .home-hero-actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 22px;
          margin-top: 30px;
        }

        .home-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 0 21px;
          border-radius: 999px;
          text-decoration: none;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition:
            transform 0.18s ease,
            background 0.18s ease;
        }

        .home-button:hover {
          transform: translateY(-2px);
        }

        .home-button-primary {
          background: #e7c4ca;
          border: 1px solid #e7c4ca;
          color: #332c2c;
        }

        .home-button-primary:hover {
          background: #dfb9c0;
          border-color: #dfb9c0;
        }

        .home-button-dark {
          background: var(--home-ink);
          border: 1px solid var(--home-ink);
          color: #fff;
        }

        .home-text-link {
          color: var(--home-ink);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-decoration: none;
          border-bottom: 1px solid var(--home-ink);
          padding-bottom: 4px;
        }

        .home-hero-note {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          max-width: 390px;
          margin-top: 25px;
          color: var(--home-muted);
          font-size: 10px;
          line-height: 1.6;
        }

        .home-hero-note span:first-child {
          flex: 0 0 auto;
          color: var(--home-rose);
          font-size: 13px;
        }

        .home-hero-image-wrap {
          min-width: 0;
        }

        .home-hero-image {
          position: relative;
          width: 100%;
          aspect-ratio: 1.16 / 1;
          overflow: hidden;
          background: var(--home-warm);
        }

        .home-hero-image::after {
          content: "";
          position: absolute;
          inset: 0;
          border: 1px solid rgba(255,255,255,0.3);
          pointer-events: none;
        }

        .home-hero-image img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .home-hero-caption {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding-top: 10px;
          color: var(--home-muted);
          font-size: 8px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .home-promo {
          width: 100%;
          padding: 0 28px 90px;
          background: var(--home-cream);
        }

        .home-promo-inner {
          width: 100%;
          max-width: 1240px;
          margin: 0 auto;
          background: var(--home-warm);
        }

        .home-promo-content {
          min-height: 390px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          max-width: 850px;
          margin: 0 auto;
          padding: clamp(48px, 7vw, 85px);
        }

        .home-promo h2 {
          margin-top: 17px;
          font-size: clamp(44px, 5vw, 68px);
          line-height: 0.95;
        }

        .home-promo-name {
          margin-top: 30px;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 22px;
        }

        .home-promo-description {
          max-width: 620px;
          margin: 10px 0 0;
          color: var(--home-muted);
          font-size: 13px;
          line-height: 1.7;
          white-space: pre-wrap;
        }

        .home-promo-default {
          margin-top: 30px;
        }

        .home-promo-default strong {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 22px;
          font-weight: 400;
        }

        .home-promo-default p {
          margin: 8px 0 0;
          color: var(--home-muted);
          font-size: 12px;
        }

        .home-promo .home-button {
          align-self: flex-start;
          margin-top: 28px;
        }

        .home-intro {
          border-top: 1px solid var(--home-line);
          border-bottom: 1px solid var(--home-line);
          background: var(--home-white);
        }

        .home-intro-inner {
          max-width: 1240px;
          margin: 0 auto;
          padding: 36px 28px;
          display: grid;
          grid-template-columns: 0.55fr 1.4fr 0.55fr;
          align-items: center;
          gap: 30px;
        }

        .home-intro-label,
        .home-intro-location {
          color: var(--home-muted);
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .home-intro-location {
          text-align: right;
          line-height: 1.6;
        }

        .home-intro p {
          margin: 0;
          text-align: center;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(19px, 2.2vw, 28px);
          line-height: 1.35;
        }

        .home-section {
          width: 100%;
          padding: 110px 28px;
        }

        .home-section-inner {
          width: 100%;
          max-width: 1240px;
          margin: 0 auto;
        }

        .home-section-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 30px;
          margin-bottom: 54px;
        }

        .home-section h2 {
          margin-top: 16px;
          font-size: clamp(42px, 5vw, 68px);
          line-height: 0.96;
        }

        .home-outline-link {
          display: inline-flex;
          align-items: center;
          flex-shrink: 0;
          color: var(--home-ink);
          text-decoration: none;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          border-bottom: 1px solid var(--home-ink);
          padding-bottom: 6px;
        }

        .home-services {
          background: var(--home-cream);
        }

        .home-services-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .home-service-card {
          min-width: 0;
          min-height: 300px;
          display: flex;
          flex-direction: column;
          padding: 30px;
          border: 1px solid var(--home-line);
          border-radius: 14px;
          background: var(--home-white);
        }

        .home-service-card-number {
          color: var(--home-rose);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.14em;
        }

        .home-service-card h3 {
          margin: 42px 0 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 28px;
          font-weight: 400;
          line-height: 1.05;
        }

        .home-service-card p {
          margin: 13px 0 0;
          color: var(--home-muted);
          font-size: 11px;
          line-height: 1.7;
        }

        .home-empty {
          grid-column: 1 / -1;
          padding: 30px;
          border: 1px solid var(--home-line);
          border-radius: 14px;
          background: var(--home-white);
        }

        .home-empty h3 {
          margin: 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 24px;
          font-weight: 400;
        }

        .home-empty p {
          margin: 8px 0 0;
          color: var(--home-muted);
          font-size: 12px;
          line-height: 1.6;
        }

        .home-experience {
          padding: 115px 28px;
          background: var(--home-ink);
          color: #fff;
        }

        .home-experience-inner {
          width: 100%;
          max-width: 1240px;
          margin: 0 auto;
        }

        .home-experience .home-eyebrow {
          color: rgba(255,255,255,0.55);
        }

        .home-experience h2 {
          max-width: 750px;
          margin-top: 18px;
          font-size: clamp(48px, 6vw, 80px);
          line-height: 0.94;
        }

        .home-experience-inner > p {
          max-width: 600px;
          margin: 30px 0 0;
          color: rgba(255,255,255,0.68);
          font-size: 13px;
          line-height: 1.8;
        }

        .home-experience-points {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 40px;
          margin-top: 75px;
        }

        .home-experience-points > div {
          padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,0.18);
        }

        .home-experience-points span {
          display: block;
          color: rgba(255,255,255,0.45);
          font-size: 9px;
          letter-spacing: 0.12em;
        }

        .home-experience-points strong {
          display: block;
          margin-top: 28px;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 21px;
          font-weight: 400;
        }

        .home-experience-points p {
          margin: 10px 0 0;
          color: rgba(255,255,255,0.58);
          font-size: 11px;
          line-height: 1.7;
        }

        .home-reviews {
          background: var(--home-white);
        }

        .home-review-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .home-review {
          min-width: 0;
          padding: 30px;
          border: 1px solid var(--home-line);
          background: var(--home-cream);
        }

        .home-review-stars {
          color: var(--home-rose);
          font-size: 11px;
          letter-spacing: 0.1em;
        }

        .home-review p {
          min-height: 125px;
          margin: 25px 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 18px;
          line-height: 1.5;
        }

        .home-review strong {
          color: var(--home-muted);
          font-size: 9px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .home-contact {
          padding: 115px 28px 70px;
          background: var(--home-cream);
        }

        .home-contact-inner {
          width: 100%;
          max-width: 1000px;
          margin: 0 auto;
          text-align: center;
        }

        .home-contact h2 {
          margin-top: 18px;
          font-size: clamp(47px, 6vw, 78px);
          line-height: 0.95;
        }

        .home-contact-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 70px;
          margin-top: 75px;
          text-align: left;
        }

        .home-contact-grid > div {
          padding-top: 20px;
          border-top: 1px solid var(--home-line);
        }

        .home-contact-grid span {
          display: block;
          color: var(--home-muted);
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.15em;
        }

        .home-contact-grid strong {
          display: block;
          margin-top: 18px;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 24px;
          font-weight: 400;
          line-height: 1.3;
        }

        .home-contact-grid p {
          max-width: 390px;
          margin: 13px 0 0;
          color: var(--home-muted);
          font-size: 11px;
          line-height: 1.7;
        }

        .home-contact-grid a {
          display: inline-block;
          margin-top: 17px;
          color: var(--home-ink);
          font-family: Georgia, "Times New Roman", serif;
          font-size: 19px;
          text-decoration: none;
          overflow-wrap: anywhere;
        }

        .home-contact-spaced {
          margin-top: 38px;
        }

        .home-contact-links {
          display: flex;
          flex-wrap: wrap;
          gap: 22px;
        }

        .home-contact-links a {
          margin-top: 10px;
          font-family: inherit;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          border-bottom: 1px solid var(--home-ink);
          padding-bottom: 4px;
        }

        .home-back-to-top {
          display: inline-block;
          margin-top: 70px;
          color: var(--home-muted);
          text-decoration: none;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          border-bottom: 1px solid var(--home-line);
          padding-bottom: 5px;
        }

        .home-back-to-top:hover {
          color: var(--home-ink);
        }

        @media (max-width: 900px) {
          .home-nav {
            display: none;
          }

          .home-hero-inner {
            grid-template-columns: 1fr;
            gap: 42px;
          }

          .home-hero-copy {
            padding-left: 0;
          }

          .home-hero-image-wrap {
            max-width: 760px;
            width: 100%;
            margin: 0 auto;
          }

          .home-intro-inner {
            grid-template-columns: 1fr;
            gap: 12px;
            text-align: center;
          }

          .home-intro-location {
            text-align: center;
          }

          .home-review-grid {
            grid-template-columns: 1fr;
          }

          .home-review p {
            min-height: 0;
          }
        }

        @media (max-width: 700px) {
          .home-header-inner {
            min-height: 58px;
            padding: 0 16px;
            gap: 12px;
          }

          .home-logo span {
            font-size: 18px;
          }

          .home-logo small {
            font-size: 7px;
          }

          .home-header-button {
            min-height: 34px;
            padding: 0 15px;
            font-size: 9px;
          }

          .home-hero {
            padding: 34px 16px 45px;
          }

          .home-hero-inner {
            gap: 27px;
          }

          .home-hero-copy {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .home-eyebrow {
            font-size: 8px;
            letter-spacing: 0.14em;
          }

          .home-hero h1 {
            margin-top: 13px;
            font-size: clamp(44px, 13vw, 60px);
            line-height: 0.93;
          }

          .home-hero-description {
            max-width: 100%;
            margin-top: 19px;
            font-size: 12px;
            line-height: 1.65;
          }

          .home-hero-actions {
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 12px;
            margin-top: 23px;
          }

          .home-button {
            min-height: 44px;
            padding: 0 18px;
            font-size: 9px;
          }

          .home-text-link {
            font-size: 9px;
          }

          .home-hero-note {
            align-items: center;
            justify-content: center;
            max-width: 100%;
            margin-top: 19px;
            font-size: 9px;
            line-height: 1.55;
            text-align: center;
          }

          .home-hero-note span:first-child {
            display: none;
          }

          .home-hero-image {
            aspect-ratio: 0.95 / 1;
          }

          .home-hero-caption {
            padding-top: 7px;
            font-size: 7px;
          }

          .home-promo {
            padding: 0 16px 45px;
          }

          .home-promo-content {
            min-height: 0;
            padding: 38px 21px 42px;
            text-align: center;
            align-items: center;
          }

          .home-promo h2 {
            margin-top: 11px;
            font-size: clamp(39px, 11.5vw, 51px);
          }

          .home-promo-name {
            margin-top: 22px;
            font-size: 18px;
          }

          .home-promo-description {
            font-size: 11px;
            line-height: 1.6;
          }

          .home-promo-default {
            margin-top: 22px;
          }

          .home-promo-default strong {
            font-size: 19px;
          }

          .home-promo-default p {
            font-size: 10px;
            line-height: 1.6;
          }

          .home-promo .home-button {
            align-self: center;
            margin-top: 21px;
          }

          .home-intro-inner {
            padding: 25px 18px;
            gap: 9px;
          }

          .home-intro-label,
          .home-intro-location {
            font-size: 7px;
          }

          .home-intro p {
            font-size: 17px;
            line-height: 1.35;
          }

          .home-section {
            padding: 58px 16px;
          }

          .home-section-heading {
            align-items: flex-start;
            flex-direction: column;
            gap: 16px;
            margin-bottom: 27px;
          }

          .home-section h2 {
            margin-top: 11px;
            font-size: clamp(38px, 11.5vw, 51px);
            line-height: 0.95;
          }

          .home-services-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 7px;
          }

          .home-service-card {
            min-height: 155px;
            padding: 12px 9px;
            border-radius: 9px;
          }

          .home-service-card-number {
            font-size: 6px;
          }

          .home-service-card h3 {
            margin-top: 18px;
            font-size: 13px;
            line-height: 1.05;
            overflow-wrap: anywhere;
          }

          .home-service-card p {
            margin-top: 7px;
            font-size: 7px;
            line-height: 1.45;
            overflow-wrap: anywhere;
          }

          .home-experience {
            padding: 61px 18px;
          }

          .home-experience h2 {
            margin-top: 12px;
            font-size: clamp(42px, 12.5vw, 56px);
            line-height: 0.94;
          }

          .home-experience-inner > p {
            margin-top: 20px;
            font-size: 11px;
            line-height: 1.65;
          }

          .home-experience-points {
            grid-template-columns: 1fr;
            gap: 25px;
            margin-top: 39px;
          }

          .home-experience-points > div {
            padding-top: 14px;
          }

          .home-experience-points strong {
            margin-top: 17px;
            font-size: 18px;
          }

          .home-experience-points p {
            margin-top: 6px;
            font-size: 10px;
            line-height: 1.55;
          }

          .home-review-grid {
            gap: 11px;
          }

          .home-review {
            padding: 21px;
          }

          .home-review p {
            margin: 18px 0;
            font-size: 16px;
            line-height: 1.42;
          }

          .home-contact {
            padding: 62px 18px 45px;
          }

          .home-contact h2 {
            margin-top: 12px;
            font-size: clamp(42px, 12.5vw, 56px);
          }

          .home-contact-grid {
            grid-template-columns: 1fr;
            gap: 27px;
            margin-top: 42px;
          }

          .home-contact-grid > div {
            padding-top: 14px;
          }

          .home-contact-grid strong {
            margin-top: 12px;
            font-size: 20px;
          }

          .home-contact-grid p {
            margin-top: 9px;
            font-size: 10px;
            line-height: 1.6;
          }

          .home-contact-grid a {
            margin-top: 12px;
            font-size: 16px;
          }

          .home-contact-spaced {
            margin-top: 26px;
          }

          .home-back-to-top {
            margin-top: 43px;
            font-size: 9px;
          }
        }

        @media (max-width: 420px) {
          .home-header-inner {
            padding: 0 14px;
          }

          .home-logo span {
            font-size: 17px;
          }

          .home-hero {
            padding-top: 30px;
          }

          .home-hero h1 {
            font-size: 45px;
          }

          .home-hero-description {
            font-size: 11px;
          }

          .home-hero-image {
            aspect-ratio: 0.93 / 1;
          }

          .home-intro-inner {
            padding-left: 16px;
            padding-right: 16px;
          }

          .home-intro p {
            font-size: 16px;
          }

          .home-section {
            padding-left: 14px;
            padding-right: 14px;
          }

          .home-section h2 {
            font-size: 39px;
          }

          .home-services-grid {
            gap: 5px;
          }

          .home-service-card {
            min-height: 145px;
            padding: 10px 7px;
          }

          .home-service-card h3 {
            margin-top: 16px;
            font-size: 12px;
          }

          .home-service-card p {
            font-size: 6.5px;
          }

          .home-promo {
            padding-left: 14px;
            padding-right: 14px;
          }

          .home-promo-content {
            padding-left: 19px;
            padding-right: 19px;
          }

          .home-promo h2 {
            font-size: 39px;
          }

          .home-experience {
            padding-left: 16px;
            padding-right: 16px;
          }

          .home-experience h2 {
            font-size: 41px;
          }

          .home-contact {
            padding-left: 16px;
            padding-right: 16px;
          }

          .home-contact h2 {
            font-size: 42px;
          }
        }
      `}</style>
    </main>
  );
}