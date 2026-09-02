"use client";

import { useState } from "react";
import { peso } from "@/lib/utils";

type Variation = {
  id: string;
  service_id: string;
  name: string;
  price_delta: number;
  duration_delta_minutes: number;
  active: boolean;
  sort_order: number;
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  active: boolean;
  sort_order: number;
  service_variations?: Variation[];
};

function durationParts(minutes: number) {
  const total = Math.max(0, Number(minutes) || 0);

  return {
    hours: Math.floor(total / 60),
    minutes: total % 60,
  };
}

function durationText(minutes: number) {
  const { hours, minutes: mins } = durationParts(minutes);

  if (hours && mins) {
    return `${hours} hr${hours === 1 ? "" : "s"} ${mins} min${
      mins === 1 ? "" : "s"
    }`;
  }

  if (hours) {
    return `${hours} hr${hours === 1 ? "" : "s"}`;
  }

  return `${mins} min${mins === 1 ? "" : "s"}`;
}

function durationToMinutes(hours: string, minutes: string) {
  const h = Math.max(0, Number(hours) || 0);
  const m = Math.max(0, Number(minutes) || 0);

  return h * 60 + m;
}

export default function ServiceManager({
  services,
}: {
  services: Service[];
}) {
  const [busy, setBusy] = useState(false);
  const [editingService, setEditingService] = useState<string | null>(
    null
  );

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPrice, setNewPrice] = useState("0");
  const [newHours, setNewHours] = useState("1");
  const [newMinutes, setNewMinutes] = useState("0");

  const [variationName, setVariationName] = useState<
    Record<string, string>
  >({});
  const [variationPrice, setVariationPrice] = useState<
    Record<string, string>
  >({});
  const [variationHours, setVariationHours] = useState<
    Record<string, string>
  >({});
  const [variationMinutes, setVariationMinutes] = useState<
    Record<string, string>
  >({});

  const request = async (
    method: "POST" | "PATCH" | "DELETE",
    body: Record<string, unknown>
  ) => {
    setBusy(true);

    try {
      const response = await fetch("/api/admin/services", {
        method,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || "Something went wrong.");
        return false;
      }

      location.reload();
      return true;
    } catch {
      alert("Something went wrong.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const addService = async () => {
    const name = newName.trim();

    if (!name) {
      alert("Please enter a service name.");
      return;
    }

    const duration_minutes = durationToMinutes(
      newHours,
      newMinutes
    );

    if (duration_minutes <= 0) {
      alert("Please enter a valid duration.");
      return;
    }

    await request("POST", {
      type: "service",
      name,
      description: newDescription,
      price: Number(newPrice) || 0,
      duration_minutes,
      active: true,
    });
  };

  const addVariation = async (serviceId: string) => {
    const name = (variationName[serviceId] || "").trim();

    if (!name) {
      alert("Please enter a variation name.");
      return;
    }

    const duration_delta_minutes = durationToMinutes(
      variationHours[serviceId] || "0",
      variationMinutes[serviceId] || "0"
    );

    await request("POST", {
      type: "variation",
      service_id: serviceId,
      name,
      price_delta: Number(variationPrice[serviceId]) || 0,
      duration_delta_minutes,
      active: true,
    });
  };

  const updateService = (
    id: string,
    patch: Record<string, unknown>
  ) => {
    return request("PATCH", {
      type: "service",
      id,
      ...patch,
    });
  };

  const updateVariation = (
    id: string,
    patch: Record<string, unknown>
  ) => {
    return request("PATCH", {
      type: "variation",
      id,
      ...patch,
    });
  };

  const deleteService = async (id: string) => {
    if (
      !confirm(
        "Delete this service? Its variations will also be deleted."
      )
    ) {
      return;
    }

    await request("DELETE", {
      type: "service",
      id,
    });
  };

  const deleteVariation = async (id: string) => {
    if (!confirm("Delete this variation?")) {
      return;
    }

    await request("DELETE", {
      type: "variation",
      id,
    });
  };

  return (
    <div className="service-admin">
      {/* CREATE SERVICE */}

      <div className="card">
        <div className="kicker">Menu editor</div>

        <h2 className="serif">Add a service</h2>

        <p className="muted">
          Create a service with its base price and appointment duration.
        </p>

        <div className="field">
          <label>Name</label>

          <input
            value={newName}
            onChange={(event) =>
              setNewName(event.target.value)
            }
            placeholder="e.g. Gel Manicure"
          />
        </div>

        <div className="inline-grid">
          <div className="field">
            <label>Price</label>

            <input
              type="number"
              min="0"
              value={newPrice}
              onChange={(event) =>
                setNewPrice(event.target.value)
              }
            />
          </div>

          <div className="field">
            <label>Duration</label>

            <div className="duration-inputs">
              <input
                type="number"
                min="0"
                value={newHours}
                onChange={(event) =>
                  setNewHours(event.target.value)
                }
                aria-label="Duration hours"
              />

              <span>hr</span>

              <input
                type="number"
                min="0"
                max="59"
                value={newMinutes}
                onChange={(event) =>
                  setNewMinutes(event.target.value)
                }
                aria-label="Duration minutes"
              />

              <span>min</span>
            </div>
          </div>
        </div>

        <div className="field">
          <label>Description</label>

          <textarea
            value={newDescription}
            onChange={(event) =>
              setNewDescription(event.target.value)
            }
            placeholder="Describe the service..."
          />
        </div>

        <button
          className="btn"
          disabled={busy}
          onClick={addService}
        >
          {busy ? "Saving..." : "+ Add Service"}
        </button>
      </div>

      {/* SERVICE LIST */}

      <div className="service-admin-list">
        <div className="service-admin-list-head">
          <div>
            <div className="kicker">Your menu</div>

            <h2 className="serif">Services</h2>
          </div>

          <span className="muted">
            {services.length}{" "}
            {services.length === 1 ? "service" : "services"}
          </span>
        </div>

        {services.length === 0 ? (
          <div className="card">
            <p className="muted">
              No services yet. Create your first service above.
            </p>
          </div>
        ) : (
          <div className="service-admin-grid">
            {services.map((service) => {
              const variations =
                service.service_variations || [];

              const isEditing =
                editingService === service.id;

              return (
                <div
                  className="card service-admin-card"
                  key={service.id}
                >
                  {/* CARD HEADER */}

                  <div className="service-card-header">
                    <div>
                      <div className="kicker">Service</div>

                      <h3 className="serif">
                        {service.name}
                      </h3>
                    </div>

                    <button
                      className="btn secondary small"
                      onClick={() =>
                        setEditingService(
                          isEditing
                            ? null
                            : service.id
                        )
                      }
                    >
                      {isEditing ? "Close" : "Edit"}
                    </button>
                  </div>

                  {/* SUMMARY */}

                  {service.description ? (
                    <p className="muted service-card-description">
                      {service.description}
                    </p>
                  ) : null}

                  <div className="service-summary">
                    <div>
                      <span className="service-summary-label">
                        Price
                      </span>

                      <strong>
                        {peso(service.price)}
                      </strong>
                    </div>

                    <div>
                      <span className="service-summary-label">
                        Duration
                      </span>

                      <strong>
                        {durationText(
                          service.duration_minutes
                        )}
                      </strong>
                    </div>

                    <div>
                      <span className="service-summary-label">
                        Variations
                      </span>

                      <strong>
                        {variations.length}
                      </strong>
                    </div>

                    <div>
                      <span className="service-summary-label">
                        Status
                      </span>

                      <span
                        className={`service-status ${
                          service.active
                            ? "service-status-active"
                            : "service-status-inactive"
                        }`}
                      >
                        {service.active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </div>
                  </div>

                  {/* EDITOR */}

                  {isEditing ? (
                    <div className="service-editor">
                      <div className="service-editor-head">
                        <div>
                          <div className="kicker">
                            Edit service
                          </div>

                          <h4 className="serif">
                            {service.name}
                          </h4>
                        </div>

                        <button
                          className="btn danger small"
                          disabled={busy}
                          onClick={() =>
                            deleteService(
                              service.id
                            )
                          }
                        >
                          Delete Service
                        </button>
                      </div>

                      <div className="field">
                        <label>Name</label>

                        <input
                          defaultValue={service.name}
                          onBlur={(event) => {
                            const value =
                              event.target.value.trim();

                            if (
                              value &&
                              value !== service.name
                            ) {
                              updateService(
                                service.id,
                                {
                                  name: value,
                                }
                              );
                            }
                          }}
                        />
                      </div>

                      <div className="inline-grid">
                        <div className="field">
                          <label>Price</label>

                          <input
                            type="number"
                            min="0"
                            defaultValue={
                              service.price
                            }
                            onBlur={(event) =>
                              updateService(
                                service.id,
                                {
                                  price:
                                    Number(
                                      event.target
                                        .value
                                    ) || 0,
                                }
                              )
                            }
                          />
                        </div>

                        <div className="field">
                          <label>Duration</label>

                          <div className="duration-inputs">
                            <input
                              type="number"
                              min="0"
                              defaultValue={
                                durationParts(
                                  service.duration_minutes
                                ).hours
                              }
                              onBlur={(event) => {
                                const parts =
                                  durationParts(
                                    service.duration_minutes
                                  );

                                updateService(
                                  service.id,
                                  {
                                    duration_minutes:
                                      durationToMinutes(
                                        event.target
                                          .value,
                                        String(
                                          parts.minutes
                                        )
                                      ),
                                  }
                                );
                              }}
                              aria-label="Duration hours"
                            />

                            <span>hr</span>

                            <input
                              type="number"
                              min="0"
                              max="59"
                              defaultValue={
                                durationParts(
                                  service.duration_minutes
                                ).minutes
                              }
                              onBlur={(event) => {
                                const parts =
                                  durationParts(
                                    service.duration_minutes
                                  );

                                updateService(
                                  service.id,
                                  {
                                    duration_minutes:
                                      durationToMinutes(
                                        String(
                                          parts.hours
                                        ),
                                        event.target
                                          .value
                                      ),
                                  }
                                );
                              }}
                              aria-label="Duration minutes"
                            />

                            <span>min</span>
                          </div>
                        </div>
                      </div>

                      <div className="field">
                        <label>Description</label>

                        <textarea
                          defaultValue={
                            service.description || ""
                          }
                          onBlur={(event) =>
                            updateService(
                              service.id,
                              {
                                description:
                                  event.target
                                    .value,
                              }
                            )
                          }
                        />
                      </div>

                      <label className="service-active">
                        <input
                          type="checkbox"
                          defaultChecked={
                            service.active
                          }
                          onChange={(event) =>
                            updateService(
                              service.id,
                              {
                                active:
                                  event.target
                                    .checked,
                              }
                            )
                          }
                        />{" "}
                        Show on website
                      </label>

                      {/* VARIATIONS */}

                      <div className="service-variations">
                        <div className="service-variations-head">
                          <div>
                            <div className="kicker">
                              Options
                            </div>

                            <h4 className="serif">
                              Variations
                            </h4>

                            <span className="muted">
                              Add optional price or time
                              adjustments.
                            </span>
                          </div>

                          <span className="muted">
                            {variations.length}{" "}
                            {variations.length === 1
                              ? "variation"
                              : "variations"}
                          </span>
                        </div>

                        {variations.length > 0 ? (
                          <div className="variation-list">
                            {variations.map(
                              (variation) => {
                                const parts =
                                  durationParts(
                                    variation.duration_delta_minutes
                                  );

                                return (
                                  <div
                                    className="card variation-card"
                                    key={
                                      variation.id
                                    }
                                  >
                                    <div className="variation-card-head">
                                      <div>
                                        <div className="kicker">
                                          Variation
                                        </div>

                                        <strong>
                                          {
                                            variation.name
                                          }
                                        </strong>
                                      </div>

                                      <button
                                        className="btn danger small"
                                        disabled={
                                          busy
                                        }
                                        onClick={() =>
                                          deleteVariation(
                                            variation.id
                                          )
                                        }
                                      >
                                        Delete
                                      </button>
                                    </div>

                                    <div className="field">
                                      <label>
                                        Name
                                      </label>

                                      <input
                                        defaultValue={
                                          variation.name
                                        }
                                        onBlur={(
                                          event
                                        ) => {
                                          const value =
                                            event.target.value.trim();

                                          if (
                                            value &&
                                            value !==
                                              variation.name
                                          ) {
                                            updateVariation(
                                              variation.id,
                                              {
                                                name: value,
                                              }
                                            );
                                          }
                                        }}
                                      />
                                    </div>

                                    <div className="inline-grid">
                                      <div className="field">
                                        <label>
                                          Price adjustment
                                        </label>

                                        <input
                                          type="number"
                                          min="0"
                                          defaultValue={
                                            variation.price_delta
                                          }
                                          onBlur={(
                                            event
                                          ) =>
                                            updateVariation(
                                              variation.id,
                                              {
                                                price_delta:
                                                  Number(
                                                    event
                                                      .target
                                                      .value
                                                  ) || 0,
                                              }
                                            )
                                          }
                                        />
                                      </div>

                                      <div className="field">
                                        <label>
                                          Time adjustment
                                        </label>

                                        <div className="duration-inputs">
                                          <input
                                            type="number"
                                            min="0"
                                            defaultValue={
                                              parts.hours
                                            }
                                            onBlur={(
                                              event
                                            ) =>
                                              updateVariation(
                                                variation.id,
                                                {
                                                  duration_delta_minutes:
                                                    durationToMinutes(
                                                      event
                                                        .target
                                                        .value,
                                                      String(
                                                        parts.minutes
                                                      )
                                                    ),
                                                }
                                              )
                                            }
                                            aria-label="Variation duration hours"
                                          />

                                          <span>
                                            hr
                                          </span>

                                          <input
                                            type="number"
                                            min="0"
                                            max="59"
                                            defaultValue={
                                              parts.minutes
                                            }
                                            onBlur={(
                                              event
                                            ) =>
                                              updateVariation(
                                                variation.id,
                                                {
                                                  duration_delta_minutes:
                                                    durationToMinutes(
                                                      String(
                                                        parts.hours
                                                      ),
                                                      event
                                                        .target
                                                        .value
                                                    ),
                                                }
                                              )
                                            }
                                            aria-label="Variation duration minutes"
                                          />

                                          <span>
                                            min
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <label className="service-active">
                                      <input
                                        type="checkbox"
                                        defaultChecked={
                                          variation.active
                                        }
                                        onChange={(
                                          event
                                        ) =>
                                          updateVariation(
                                            variation.id,
                                            {
                                              active:
                                                event
                                                  .target
                                                  .checked,
                                            }
                                          )
                                        }
                                      />{" "}
                                      Show on website
                                    </label>

                                    <div className="variation-summary">
                                      {peso(
                                        variation.price_delta
                                      )}{" "}
                                      · +
                                      {durationText(
                                        variation.duration_delta_minutes
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        ) : (
                          <p className="muted">
                            No variations yet.
                          </p>
                        )}

                        {/* ADD VARIATION */}

                        <div className="variation-add card">
                          <div className="kicker">
                            Add variation
                          </div>

                          <h5 className="serif">
                            New option
                          </h5>

                          <div className="field">
                            <label>Name</label>

                            <input
                              value={
                                variationName[
                                  service.id
                                ] || ""
                              }
                              onChange={(event) =>
                                setVariationName(
                                  (current) => ({
                                    ...current,
                                    [service.id]:
                                      event.target
                                        .value,
                                  })
                                )
                              }
                              placeholder="e.g. Long nails"
                            />
                          </div>

                          <div className="inline-grid">
                            <div className="field">
                              <label>
                                + Price
                              </label>

                              <input
                                type="number"
                                min="0"
                                value={
                                  variationPrice[
                                    service.id
                                  ] || ""
                                }
                                onChange={(event) =>
                                  setVariationPrice(
                                    (current) => ({
                                      ...current,
                                      [service.id]:
                                        event.target
                                          .value,
                                    })
                                  )
                                }
                                placeholder="0"
                              />
                            </div>

                            <div className="field">
                              <label>
                                + Duration
                              </label>

                              <div className="duration-inputs">
                                <input
                                  type="number"
                                  min="0"
                                  value={
                                    variationHours[
                                      service.id
                                    ] || ""
                                  }
                                  onChange={(event) =>
                                    setVariationHours(
                                      (current) => ({
                                        ...current,
                                        [service.id]:
                                          event.target
                                            .value,
                                      })
                                    )
                                  }
                                  placeholder="0"
                                  aria-label="Variation hours"
                                />

                                <span>hr</span>

                                <input
                                  type="number"
                                  min="0"
                                  max="59"
                                  value={
                                    variationMinutes[
                                      service.id
                                    ] || ""
                                  }
                                  onChange={(event) =>
                                    setVariationMinutes(
                                      (current) => ({
                                        ...current,
                                        [service.id]:
                                          event.target
                                            .value,
                                      })
                                    )
                                  }
                                  placeholder="0"
                                  aria-label="Variation minutes"
                                />

                                <span>min</span>
                              </div>
                            </div>
                          </div>

                          <button
                            className="btn secondary small"
                            disabled={busy}
                            onClick={() =>
                              addVariation(
                                service.id
                              )
                            }
                          >
                            + Add Variation
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .service-admin {
          display: grid;
          gap: 24px;
        }

        .service-admin-list {
          display: grid;
          gap: 16px;
        }

        .service-admin-list-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
        }

        .service-admin-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fit,
            minmax(320px, 1fr)
          );
          gap: 16px;
        }

        .service-admin-card {
          min-width: 0;
        }

        .service-card-header,
        .service-editor-head,
        .service-variations-head,
        .variation-card-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .service-card-header h3,
        .service-editor-head h4,
        .service-variations-head h4,
        .variation-add h5 {
          margin: 4px 0 0;
        }

        .service-card-description {
          margin: 14px 0 0;
          white-space: pre-wrap;
        }

        .service-summary {
          display: grid;
          grid-template-columns: repeat(
            4,
            minmax(0, 1fr)
          );
          gap: 12px;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid
            var(--border, #e5e5e5);
        }

        .service-summary > div {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .service-summary-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          opacity: 0.55;
        }

        .service-summary strong {
          font-size: 13px;
          font-weight: 600;
        }

        .service-status {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.03em;
        }

        .service-status-active {
          background: rgba(50, 120, 70, 0.09);
        }

        .service-status-inactive {
          background: rgba(0, 0, 0, 0.06);
          opacity: 0.65;
        }

        .service-editor {
          display: grid;
          gap: 16px;
          margin-top: 22px;
          padding-top: 20px;
          border-top: 1px solid
            var(--border, #e5e5e5);
        }

        .service-active {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
        }

        .service-active input {
          margin: 0;
        }

        .service-variations {
          display: grid;
          gap: 14px;
          margin-top: 4px;
          padding-top: 18px;
          border-top: 1px solid
            var(--border, #e5e5e5);
        }

        .variation-list {
          display: grid;
          gap: 12px;
        }

        .variation-card {
          display: grid;
          gap: 12px;
          padding: 16px;
          background: rgba(0, 0, 0, 0.018);
        }

        .variation-card-head strong {
          display: block;
          margin-top: 4px;
          font-size: 14px;
        }

        .variation-summary {
          font-size: 11px;
          opacity: 0.7;
        }

        .variation-add {
          display: grid;
          gap: 12px;
          margin-top: 2px;
          padding: 16px;
        }

        @media (max-width: 700px) {
          .service-admin-grid {
            grid-template-columns: 1fr;
          }

          .service-summary {
            grid-template-columns: repeat(2, 1fr);
          }

          .service-card-header,
          .service-editor-head,
          .service-variations-head,
          .variation-card-head {
            gap: 10px;
          }
        }

        @media (max-width: 420px) {
          .service-summary {
            grid-template-columns: 1fr 1fr;
          }

          .service-card-header,
          .service-editor-head,
          .service-variations-head,
          .variation-card-head {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  );
}