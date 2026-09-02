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
  const [editingService, setEditingService] = useState<string | null>(null);

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
    if (!confirm("Delete this variation?")) return;

    await request("DELETE", {
      type: "variation",
      id,
    });
  };

  return (
    <div className="service-admin">
      {/* ADD SERVICE */}
      <div className="service-add-panel">
        <div className="service-add-head">
          <div>
            <div className="kicker">Menu editor</div>
            <h2 className="serif">Add a service</h2>
            <p className="muted">
              Create a service with its base price and appointment duration.
            </p>
          </div>
        </div>

        <div className="service-add-fields">
          <div className="field service-name-field">
            <label>Name</label>
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="e.g. Gel Manicure"
            />
          </div>

          <div className="field service-price-field">
            <label>Price</label>
            <input
              type="number"
              min="0"
              value={newPrice}
              onChange={(event) => setNewPrice(event.target.value)}
            />
          </div>

          <div className="field service-duration-field">
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

        <div className="service-add-actions">
          <button
            className="btn"
            disabled={busy}
            onClick={addService}
          >
            {busy ? "Saving..." : "+ Add Service"}
          </button>
        </div>
      </div>

      {/* SERVICE LIST */}
      <div className="service-list">
        <div className="service-list-head">
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
          <div className="service-empty">
            <h3 className="serif">No services yet</h3>
            <p className="muted">
              Add your first service above.
            </p>
          </div>
        ) : (
          <div className="service-table">
            <div className="service-table-header">
              <span>Service</span>
              <span>Price</span>
              <span>Duration</span>
              <span>Variations</span>
              <span>Status</span>
              <span></span>
            </div>

            {services.map((service) => {
              const variations =
                service.service_variations || [];

              const isEditing =
                editingService === service.id;

              return (
                <div
                  className={`service-row ${
                    isEditing
                      ? "service-row-editing"
                      : ""
                  }`}
                  key={service.id}
                >
                  <div className="service-row-main">
                    <strong>{service.name}</strong>

                    {service.description ? (
                      <span className="muted service-description">
                        {service.description}
                      </span>
                    ) : null}
                  </div>

                  <div className="service-row-price">
                    {peso(service.price)}
                  </div>

                  <div className="service-row-duration">
                    {durationText(
                      service.duration_minutes
                    )}
                  </div>

                  <div className="service-row-variations">
                    {variations.length}
                  </div>

                  <div>
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

                  <div className="service-row-action">
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

                  {/* EDITOR */}
                  {isEditing ? (
                    <div className="service-editor">
                      <div className="service-editor-head">
                        <div>
                          <div className="kicker">
                            Edit service
                          </div>

                          <h3 className="serif">
                            {service.name}
                          </h3>
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

                      <div className="service-editor-grid">
                        <div className="field">
                          <label>Name</label>
                          <input
                            defaultValue={
                              service.name
                            }
                            onBlur={(event) => {
                              const value =
                                event.target.value.trim();

                              if (
                                value &&
                                value !==
                                  service.name
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
                                        event.target.value,
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
                                        event.target.value
                                      ),
                                  }
                                );
                              }}
                              aria-label="Duration minutes"
                            />

                            <span>min</span>
                          </div>
                        </div>

                        <div className="field service-editor-description">
                          <label>Description</label>
                          <textarea
                            defaultValue={
                              service.description ||
                              ""
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
                        Active
                      </label>

                      {/* VARIATIONS */}
                      <div className="service-variations">
                        <div className="service-variations-head">
                          <div>
                            <h4>Variations</h4>
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

                        {variations.length ? (
                          <div className="variation-list">
                            {variations.map(
                              (variation) => {
                                const parts =
                                  durationParts(
                                    variation.duration_delta_minutes
                                  );

                                return (
                                  <div
                                    className="variation-row"
                                    key={
                                      variation.id
                                    }
                                  >
                                    <div className="variation-main">
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

                                    <div className="variation-fields">
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

                                    <div className="variation-actions">
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
                                        Active
                                      </label>

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

                        <div className="variation-add">
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

                          <div className="field">
                            <label>+ Price</label>
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
                            <label>+ Duration</label>

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

                          <button
                            className="btn secondary small"
                            disabled={busy}
                            onClick={() =>
                              addVariation(
                                service.id
                              )
                            }
                          >
                            + Variation
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
    </div>
  );
}