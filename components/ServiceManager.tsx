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

export default function ServiceManager({
  services,
}: {
  services: Service[];
}) {
  const [busy, setBusy] = useState(false);

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPrice, setNewPrice] = useState("0");
  const [newDuration, setNewDuration] = useState("60");

  const [variationName, setVariationName] = useState<
    Record<string, string>
  >({});
  const [variationPrice, setVariationPrice] = useState<
    Record<string, string>
  >({});
  const [variationDuration, setVariationDuration] = useState<
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

    await request("POST", {
      type: "service",
      name,
      description: newDescription,
      price: Number(newPrice) || 0,
      duration_minutes: Number(newDuration) || 60,
      active: true,
    });
  };

  const addVariation = async (serviceId: string) => {
    const name = (variationName[serviceId] || "").trim();

    if (!name) {
      alert("Please enter a variation name.");
      return;
    }

    await request("POST", {
      type: "variation",
      service_id: serviceId,
      name,
      price_delta: Number(variationPrice[serviceId]) || 0,
      duration_delta_minutes:
        Number(variationDuration[serviceId]) || 0,
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
      <div className="card">
        <div className="kicker">Menu editor</div>
        <h2 className="serif">Add a service</h2>

        <div className="inline-grid">
          <div className="field">
            <label>Name</label>
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="e.g. Gel Manicure"
            />
          </div>

          <div className="field">
            <label>Price</label>
            <input
              type="number"
              min="0"
              value={newPrice}
              onChange={(event) => setNewPrice(event.target.value)}
            />
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

        <div className="field">
          <label>Duration (minutes)</label>
          <input
            type="number"
            min="1"
            value={newDuration}
            onChange={(event) => setNewDuration(event.target.value)}
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

      <div className="service-admin-grid">
        {services.length === 0 ? (
          <div className="card">
            <p className="muted">
              No services yet. Add your first service above.
            </p>
          </div>
        ) : (
          services.map((service) => {
            const variations = service.service_variations || [];

            return (
              <div className="card service-admin-card" key={service.id}>
                <div className="service-admin-header">
                  <div>
                    <div className="kicker">
                      Service
                    </div>

                    <h3 className="serif">
                      {service.name}
                    </h3>
                  </div>

                  <button
                    className="btn danger small"
                    disabled={busy}
                    onClick={() => deleteService(service.id)}
                  >
                    Delete
                  </button>
                </div>

                <div className="field">
                  <label>Name</label>
                  <input
                    defaultValue={service.name}
                    onBlur={(event) =>
                      updateService(service.id, {
                        name: event.target.value,
                      })
                    }
                  />
                </div>

                <div className="field">
                  <label>Description</label>
                  <textarea
                    defaultValue={service.description || ""}
                    onBlur={(event) =>
                      updateService(service.id, {
                        description: event.target.value,
                      })
                    }
                  />
                </div>

                <div className="inline-grid">
                  <div className="field">
                    <label>Price</label>
                    <input
                      type="number"
                      min="0"
                      defaultValue={service.price}
                      onBlur={(event) =>
                        updateService(service.id, {
                          price: Number(event.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="field">
                    <label>Duration (minutes)</label>
                    <input
                      type="number"
                      min="1"
                      defaultValue={service.duration_minutes}
                      onBlur={(event) =>
                        updateService(service.id, {
                          duration_minutes:
                            Number(event.target.value) || 60,
                        })
                      }
                    />
                  </div>
                </div>

                <label className="service-active">
                  <input
                    type="checkbox"
                    defaultChecked={service.active}
                    onChange={(event) =>
                      updateService(service.id, {
                        active: event.target.checked,
                      })
                    }
                  />{" "}
                  Active
                </label>

                <div className="service-variations">
                  <div className="service-variations-head">
                    <h4>Variations</h4>
                    <span className="muted">
                      {variations.length}{" "}
                      {variations.length === 1
                        ? "variation"
                        : "variations"}
                    </span>
                  </div>

                  {variations.length ? (
                    <div className="variation-list">
                      {variations.map((variation) => (
                        <div
                          className="variation-row"
                          key={variation.id}
                        >
                          <div className="variation-main">
                            <input
                              defaultValue={variation.name}
                              aria-label="Variation name"
                              onBlur={(event) =>
                                updateVariation(
                                  variation.id,
                                  {
                                    name: event.target.value,
                                  }
                                )
                              }
                            />

                            <span className="variation-summary">
                              {peso(variation.price_delta)} · +
                              {
                                variation.duration_delta_minutes
                              }{" "}
                              min
                            </span>
                          </div>

                          <div className="variation-fields">
                            <input
                              type="number"
                              min="0"
                              defaultValue={variation.price_delta}
                              aria-label="Price adjustment"
                              onBlur={(event) =>
                                updateVariation(
                                  variation.id,
                                  {
                                    price_delta:
                                      Number(
                                        event.target.value
                                      ) || 0,
                                  }
                                )
                              }
                            />

                            <input
                              type="number"
                              min="0"
                              defaultValue={
                                variation.duration_delta_minutes
                              }
                              aria-label="Duration adjustment"
                              onBlur={(event) =>
                                updateVariation(
                                  variation.id,
                                  {
                                    duration_delta_minutes:
                                      Number(
                                        event.target.value
                                      ) || 0,
                                  }
                                )
                              }
                            />

                            <button
                              className="btn danger small"
                              disabled={busy}
                              onClick={() =>
                                deleteVariation(variation.id)
                              }
                            >
                              Delete
                            </button>
                          </div>

                          <label>
                            <input
                              type="checkbox"
                              defaultChecked={
                                variation.active
                              }
                              onChange={(event) =>
                                updateVariation(
                                  variation.id,
                                  {
                                    active:
                                      event.target.checked,
                                  }
                                )
                              }
                            />{" "}
                            Active
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">
                      No variations yet.
                    </p>
                  )}

                  <div className="variation-add">
                    <input
                      value={variationName[service.id] || ""}
                      onChange={(event) =>
                        setVariationName((current) => ({
                          ...current,
                          [service.id]: event.target.value,
                        }))
                      }
                      placeholder="Variation name"
                    />

                    <input
                      type="number"
                      min="0"
                      value={variationPrice[service.id] || ""}
                      onChange={(event) =>
                        setVariationPrice((current) => ({
                          ...current,
                          [service.id]: event.target.value,
                        }))
                      }
                      placeholder="+ Price"
                    />

                    <input
                      type="number"
                      min="0"
                      value={variationDuration[service.id] || ""}
                      onChange={(event) =>
                        setVariationDuration((current) => ({
                          ...current,
                          [service.id]: event.target.value,
                        }))
                      }
                      placeholder="+ Minutes"
                    />

                    <button
                      className="btn secondary small"
                      disabled={busy}
                      onClick={() =>
                        addVariation(service.id)
                      }
                    >
                      + Variation
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}