export const dynamic = "force-dynamic";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

import AvailabilityManager from "@/components/AvailabilityManager";

export default async function CalendarPage() {
  const db =
    supabaseAdmin();

  const [
    rulesResult,
    overridesResult,
  ] = await Promise.all([
    db
      .from(
        "availability_rules"
      )
      .select("*")
      .order(
        "day_of_week",
        {
          ascending: true,
        }
      ),

    db
      .from(
        "availability_overrides"
      )
      .select("*")
      .order(
        "override_date",
        {
          ascending: true,
        }
      )
      .order(
        "start_time",
        {
          ascending: true,
        }
      )
      .limit(200),
  ]);

  if (rulesResult.error) {
    console.error(
      "Calendar rules error:",
      rulesResult.error
    );
  }

  if (
    overridesResult.error
  ) {
    console.error(
      "Calendar overrides error:",
      overridesResult.error
    );
  }

  return (
    <>
      <div className="section-head">
        <div>
          <div className="kicker">
            Flexible schedule
          </div>

          <h1 className="serif">
            Calendar & Availability
          </h1>

          <p className="muted">
            Your weekly working hours are
            the baseline. Open and block
            overrides handle one-off changes.
          </p>
        </div>
      </div>

      <AvailabilityManager
        rules={
          rulesResult.data ||
          []
        }
        overrides={
          overridesResult.data ||
          []
        }
      />
    </>
  );
}