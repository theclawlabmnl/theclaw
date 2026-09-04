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

type VariationDraft = {
  key: string;
  id?: string;
  name: string;
  price: string;
  hours: string;
  minutes: string;
  active: boolean;
  deleted?: boolean;
};

type ServiceDraft = {
  name: string;
  description: string;
  price: string;
  hours: string;
  minutes: string;
  active: boolean;
  variations: VariationDraft[];
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

function newVariationDraft(): VariationDraft {
  return {
    key: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "",
    price: "0",
    hours: "0",
    minutes: "0",
    active: true,
  };
}

function serviceToDraft(service: Service): ServiceDraft {
  const serviceDuration = durationParts(service.duration_minutes);

  return {
    name: service.name,
    description: service.description || "",
    price: String(service.price ?? 0),
    hours: String(serviceDuration.hours),
    minutes: String(serviceDuration.minutes),
    active: service.active,
    variations: (service.service_variations || []).map((variation) => {
      const parts = durationParts(variation.duration_delta_minutes);

      return {
        key: variation.id,
        id: variation.id,
        name: variation.name,
        price: String(variation.price_delta ?? 0),
        hours: String(parts.hours),
        minutes: String(parts.minutes),
        active: variation.active,
      };
    }),
  };
}

export default function ServiceManager({
  services,
}: {
  services: Service[];
}) {
  const [busy, setBusy] = useState(false);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(
    new Set()
  );
  const [editDrafts, setEditDrafts] = useState<Record<string, ServiceDraft>>({});

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPrice, setNewPrice] = useState("0");
  const [newHours, setNewHours] = useState("1");
  const [newMinutes, setNewMinutes] = useState("0");
  const [newVariations, setNewVariations] = useState<VariationDraft[]>([]);

  const apiRequest = async (
    method: "POST" | "PATCH" | "DELETE",
    body: Record<string, unknown>
  ) => {
    const response = await fetch("/api/admin/services", {
      method,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "Something went wrong.");
    }

    return result;
  };

  const validateVariations = (variations: VariationDraft[]) => {
    for (const variation of variations.filter((item) => !item.deleted)) {
      if (!variation.name.trim()) {
        alert("Please enter a name for every variation.");
        return false;
      }

      const minutes = Number(variation.minutes) || 0;
      if (minutes < 0 || minutes > 59) {
        alert("Variation minutes must be between 0 and 59.");
        return false;
      }
    }

    return true;
  };

  const addNewVariationRow = () => {
    setNewVariations((current) => [...current, newVariationDraft()]);
  };

  const updateNewVariation = (
    key: string,
    patch: Partial<VariationDraft>
  ) => {
    setNewVariations((current) =>
      current.map((item) =>
        item.key === key ? { ...item, ...patch } : item
      )
    );
  };

  const removeNewVariation = (key: string) => {
    setNewVariations((current) =>
      current.filter((item) => item.key !== key)
    );
  };

  const addService = async () => {
    const name = newName.trim();

    if (!name) {
      alert("Please enter a service name.");
      return;
    }

    const duration_minutes = durationToMinutes(newHours, newMinutes);

    if (duration_minutes <= 0) {
      alert("Please enter a valid duration.");
      return;
    }

    if (!validateVariations(newVariations)) {
      return;
    }

    setBusy(true);

    try {
      const result = await apiRequest("POST", {
        type: "service",
        name,
        description: newDescription,
        price: Number(newPrice) || 0,
        duration_minutes,
        active: true,
      });

      const serviceId =
        result?.service?.id ||
        result?.data?.id ||
        result?.id;

      if (!serviceId && newVariations.length > 0) {
        throw new Error(
          "The service was created, but its ID was not returned. Please refresh before adding variations."
        );
      }

      for (const variation of newVariations) {
        await apiRequest("POST", {
          type: "variation",
          service_id: serviceId,
          name: variation.name.trim(),
          price_delta: Number(variation.price) || 0,
          duration_delta_minutes: durationToMinutes(
            variation.hours,
            variation.minutes
          ),
          active: variation.active,
        });
      }

      location.reload();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setBusy(false);
    }
  };

  const beginEdit = (service: Service) => {
    if (editingService === service.id) {
      setEditingService(null);
      return;
    }

    setEditDrafts((current) => ({
      ...current,
      [service.id]: serviceToDraft(service),
    }));

    setEditingService(service.id);
  };

  const updateServiceDraft = (
    serviceId: string,
    patch: Partial<Omit<ServiceDraft, "variations">>
  ) => {
    setEditDrafts((current) => ({
      ...current,
      [serviceId]: {
        ...current[serviceId],
        ...patch,
      },
    }));
  };

  const updateEditVariation = (
    serviceId: string,
    key: string,
    patch: Partial<VariationDraft>
  ) => {
    setEditDrafts((current) => ({
      ...current,
      [serviceId]: {
        ...current[serviceId],
        variations: current[serviceId].variations.map((item) =>
          item.key === key ? { ...item, ...patch } : item
        ),
      },
    }));
  };

  const addEditVariationRow = (serviceId: string) => {
    setEditDrafts((current) => ({
      ...current,
      [serviceId]: {
        ...current[serviceId],
        variations: [
          ...current[serviceId].variations,
          newVariationDraft(),
        ],
      },
    }));
  };

  const removeEditVariation = (
    serviceId: string,
    variation: VariationDraft
  ) => {
    setEditDrafts((current) => ({
      ...current,
      [serviceId]: {
        ...current[serviceId],
        variations: variation.id
          ? current[serviceId].variations.map((item) =>
              item.key === variation.key
                ? { ...item, deleted: true }
                : item
            )
          : current[serviceId].variations.filter(
              (item) => item.key !== variation.key
            ),
      },
    }));
  };

  const saveService = async (service: Service) => {
    const draft = editDrafts[service.id];

    if (!draft) {
      return;
    }

    if (!draft.name.trim()) {
      alert("Please enter a service name.");
      return;
    }

    const duration_minutes = durationToMinutes(
      draft.hours,
      draft.minutes
    );

    if (duration_minutes <= 0) {
      alert("Please enter a valid duration.");
      return;
    }

    if (!validateVariations(draft.variations)) {
      return;
    }

    setBusy(true);

    try {
      await apiRequest("PATCH", {
        type: "service",
        id: service.id,
        name: draft.name.trim(),
        description: draft.description,
        price: Number(draft.price) || 0,
        duration_minutes,
        active: draft.active,
      });

      for (const variation of draft.variations) {
        if (variation.deleted && variation.id) {
          await apiRequest("DELETE", {
            type: "variation",
            id: variation.id,
          });
          continue;
        }

        if (variation.deleted) {
          continue;
        }

        const payload = {
          name: variation.name.trim(),
          price_delta: Number(variation.price) || 0,
          duration_delta_minutes: durationToMinutes(
            variation.hours,
            variation.minutes
          ),
          active: variation.active,
        };

        if (variation.id) {
          await apiRequest("PATCH", {
            type: "variation",
            id: variation.id,
            ...payload,
          });
        } else {
          await apiRequest("POST", {
            type: "variation",
            service_id: service.id,
            ...payload,
          });
        }
      }

      location.reload();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setBusy(false);
    }
  };

  const deleteService = async (id: string) => {
    if (
      !confirm(
        "Delete this service? Its variations will also be deleted."
      )
    ) {
      return;
    }

    setBusy(true);

    try {
      await apiRequest("DELETE", {
        type: "service",
        id,
      });

      location.reload();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setBusy(false);
    }
  };

  const renderVariationEditor = (
    variation: VariationDraft,
    onChange: (patch: Partial<VariationDraft>) => void,
    onRemove: () => void
  ) => (
    <div className="card variation-card" key={variation.key}>
      <div className="variation-card-head">
        <div>
          <div className="kicker">Variation</div>
          <strong>{variation.name.trim() || "New variation"}</strong>
        </div>

        <button
          type="button"
          className="btn danger small"
          disabled={busy}
          onClick={onRemove}
        >
          Remove
        </button>
      </div>

      <div className="field">
        <label>Name</label>
        <input
          value={variation.name}
          onChange={(event) =>
            onChange({ name: event.target.value })
          }
          placeholder="e.g. Long nails"
        />
      </div>

      <div className="inline-grid">
        <div className="field">
          <label>+ Price</label>
          <input
            type="number"
            min="0"
            value={variation.price}
            onChange={(event) =>
              onChange({ price: event.target.value })
            }
          />
        </div>

        <div className="field">
          <label>+ Duration</label>
          <div className="duration-inputs">
            <input
              type="number"
              min="0"
              value={variation.hours}
              onChange={(event) =>
                onChange({ hours: event.target.value })
              }
              aria-label="Variation hours"
            />
            <span>hr</span>
            <input
              type="number"
              min="0"
              max="59"
              value={variation.minutes}
              onChange={(event) =>
                onChange({ minutes: event.target.value })
              }
              aria-label="Variation minutes"
            />
            <span>min</span>
          </div>
        </div>
      </div>

      <label className="service-active">
        <input
          type="checkbox"
          checked={variation.active}
          onChange={(event) =>
            onChange({ active: event.target.checked })
          }
        />
        Show on website
      </label>
    </div>
  );

  return (
    <div className="service-admin">
      <div className="card">
        <div className="kicker">Menu editor</div>
        <h2 className="serif">Add a service</h2>
        <p className="muted">
          Create the service and add as many variations as you need,
          then save everything together.
        </p>

        <div className="field">
          <label>Name</label>
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
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
              onChange={(event) => setNewPrice(event.target.value)}
            />
          </div>

          <div className="field">
            <label>Duration</label>
            <div className="duration-inputs">
              <input
                type="number"
                min="0"
                value={newHours}
                onChange={(event) => setNewHours(event.target.value)}
                aria-label="Duration hours"
              />
              <span>hr</span>
              <input
                type="number"
                min="0"
                max="59"
                value={newMinutes}
                onChange={(event) => setNewMinutes(event.target.value)}
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

        <div className="service-variations">
          <div className="service-variations-head">
            <div>
              <div className="kicker">Options</div>
              <h4 className="serif">Variations</h4>
              <span className="muted">
                Add all variations before saving the service.
              </span>
            </div>

            <span className="muted">
              {newVariations.length}{" "}
              {newVariations.length === 1
                ? "variation"
                : "variations"}
            </span>
          </div>

          {newVariations.length > 0 && (
            <div className="variation-list">
              {newVariations.map((variation) =>
                renderVariationEditor(
                  variation,
                  (patch) =>
                    updateNewVariation(variation.key, patch),
                  () => removeNewVariation(variation.key)
                )
              )}
            </div>
          )}

          <button
            type="button"
            className="btn secondary"
            disabled={busy}
            onClick={addNewVariationRow}
          >
            + Add Variation
          </button>
        </div>

        <div className="save-row">
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={addService}
          >
            {busy ? "Saving..." : "Save Service"}
          </button>
        </div>
      </div>

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
              const draft = editDrafts[service.id];

              return (
                <div
                  className={`card service-admin-card ${
                    isEditing ? "is-editing" : "is-collapsed"
                  }`}
                  key={service.id}
                >
                  <div className="service-card-header">
                    <div>
                      <div className="kicker">Service</div>
                      <h3 className="serif">{service.name}</h3>
                    </div>

                    <button
                      type="button"
                      className="btn secondary small"
                      onClick={() => beginEdit(service)}
                    >
                      {isEditing ? "Close" : "Edit"}
                    </button>
                  </div>

                  {service.description ? (
                    <div className="service-description-wrap">
                      <p
                        className={`muted service-card-description ${
                          expandedDescriptions.has(service.id)
                            ? "is-expanded"
                            : ""
                        }`}
                      >
                        {service.description}
                      </p>

                      <button
                        type="button"
                        className="service-description-toggle"
                        onClick={() => {
                          setExpandedDescriptions((current) => {
                            const next = new Set(current);

                            if (next.has(service.id)) {
                              next.delete(service.id);
                            } else {
                              next.add(service.id);
                            }

                            return next;
                          });
                        }}
                      >
                        {expandedDescriptions.has(service.id)
                          ? "Show less"
                          : "Read more"}
                      </button>
                    </div>
                  ) : null}

                  <div className="service-summary">
                    <div>
                      <span className="service-summary-label">
                        Price
                      </span>
                      <strong>{peso(service.price)}</strong>
                    </div>

                    <div>
                      <span className="service-summary-label">
                        Duration
                      </span>
                      <strong>
                        {durationText(service.duration_minutes)}
                      </strong>
                    </div>

                    <div>
                      <span className="service-summary-label">
                        Variations
                      </span>
                      <strong>{variations.length}</strong>
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
                        {service.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  {isEditing && draft ? (
                    <div className="service-editor">
                      <div className="service-editor-head">
                        <div>
                          <div className="kicker">Edit service</div>
                          <h4 className="serif">
                            {service.name}
                          </h4>
                        </div>

                        <button
                          type="button"
                          className="btn danger small"
                          disabled={busy}
                          onClick={() =>
                            deleteService(service.id)
                          }
                        >
                          Delete Service
                        </button>
                      </div>

                      <div className="field">
                        <label>Name</label>
                        <input
                          value={draft.name}
                          onChange={(event) =>
                            updateServiceDraft(service.id, {
                              name: event.target.value,
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
                            value={draft.price}
                            onChange={(event) =>
                              updateServiceDraft(service.id, {
                                price: event.target.value,
                              })
                            }
                          />
                        </div>

                        <div className="field">
                          <label>Duration</label>
                          <div className="duration-inputs">
                            <input
                              type="number"
                              min="0"
                              value={draft.hours}
                              onChange={(event) =>
                                updateServiceDraft(service.id, {
                                  hours: event.target.value,
                                })
                              }
                              aria-label="Duration hours"
                            />
                            <span>hr</span>
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={draft.minutes}
                              onChange={(event) =>
                                updateServiceDraft(service.id, {
                                  minutes: event.target.value,
                                })
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
                          value={draft.description}
                          onChange={(event) =>
                            updateServiceDraft(service.id, {
                              description: event.target.value,
                            })
                          }
                        />
                      </div>

                      <label className="service-active">
                        <input
                          type="checkbox"
                          checked={draft.active}
                          onChange={(event) =>
                            updateServiceDraft(service.id, {
                              active: event.target.checked,
                            })
                          }
                        />
                        Show on website
                      </label>

                      <div className="service-variations">
                        <div className="service-variations-head">
                          <div>
                            <div className="kicker">Options</div>
                            <h4 className="serif">Variations</h4>
                            <span className="muted">
                              Edit existing variations or add
                              several new ones before saving.
                            </span>
                          </div>

                          <span className="muted">
                            {
                              draft.variations.filter(
                                (item) => !item.deleted
                              ).length
                            }{" "}
                            variations
                          </span>
                        </div>

                        {draft.variations.some(
                          (item) => !item.deleted
                        ) && (
                          <div className="variation-list">
                            {draft.variations
                              .filter((item) => !item.deleted)
                              .map((variation) =>
                                renderVariationEditor(
                                  variation,
                                  (patch) =>
                                    updateEditVariation(
                                      service.id,
                                      variation.key,
                                      patch
                                    ),
                                  () =>
                                    removeEditVariation(
                                      service.id,
                                      variation
                                    )
                                )
                              )}
                          </div>
                        )}

                        <button
                          type="button"
                          className="btn secondary"
                          disabled={busy}
                          onClick={() =>
                            addEditVariationRow(service.id)
                          }
                        >
                          + Add Variation
                        </button>
                      </div>

                      <div className="save-row">
                        <button
                          type="button"
                          className="btn"
                          disabled={busy}
                          onClick={() => saveService(service)}
                        >
                          {busy
                            ? "Saving..."
                            : "Save Service & Variations"}
                        </button>
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

        .service-admin-list-head h2 {
          margin: 4px 0 0;
        }

        .service-admin-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          column-gap: 16px;
          row-gap: 28px;
          align-items: start;
        }

        .service-admin-card {
          min-width: 0;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }

        @media (min-width: 1001px) {
          .service-admin-grid > .service-admin-card {
            margin-top: 0 !important;
            transform: none !important;
            align-self: start !important;
          }

          .service-admin-grid > .service-admin-card:nth-child(3n + 1),
          .service-admin-grid > .service-admin-card:nth-child(3n + 2),
          .service-admin-grid > .service-admin-card:nth-child(3n + 3) {
            margin-top: 0 !important;
            transform: none !important;
          }
        }

        .service-admin-card.is-collapsed {
          height: 202px;
          min-height: 202px;
          max-height: 202px;
        }

        .service-admin-card.is-editing {
          height: auto;
          min-height: 202px;
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
        .service-variations-head h4 {
          margin: 4px 0 0;
        }

        .service-card-description {
          margin: 14px 0 18px;
          white-space: normal;
        }

        .service-description-wrap {
          margin: 14px 0 18px;
        }

        .service-card-description {
          margin: 0;
        }

        .service-admin-card.is-collapsed .service-card-description {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          overflow: hidden;
          min-height: 30px;
          max-height: 30px;
        }

        .service-description-toggle {
          display: none;
          margin: 5px 0 0;
          padding: 0;
          border: 0;
          background: transparent;
          color: inherit;
          font: inherit;
          font-size: 10px;
          font-weight: 700;
          text-decoration: underline;
          cursor: pointer;
        }

        .service-card-header + .service-summary {
          margin-top: 36px;
        }

        .service-summary {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-top: auto;
          padding-top: 16px;
          border-top: 1px solid var(--border, #e5e5e5);
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
          border-top: 1px solid var(--border, #e5e5e5);
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
          border-top: 1px solid var(--border, #e5e5e5);
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

        .save-row {
          display: flex;
          justify-content: flex-end;
          padding-top: 4px;
        }

        @media (max-width: 1000px) and (min-width: 701px) {
          .service-admin-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .service-admin-grid {
            grid-template-columns: 1fr;
            row-gap: 16px;
          }

          .service-admin-card.is-collapsed {
            height: auto;
            min-height: 190px;
            max-height: none;
          }

          .service-card-description {
            font-size: 10px;
            line-height: 1.35;
          }

          .service-admin-card.is-collapsed .service-card-description {
            min-height: 27px;
            max-height: 27px;
          }

          .service-admin-card.is-collapsed
            .service-card-description.is-expanded {
            display: block;
            min-height: 0;
            max-height: none;
            overflow: visible;
          }

          .service-description-toggle {
            display: inline-block;
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

          .service-admin input,
          .service-admin select,
          .service-admin textarea {
            font-size: 16px;
          }

          .save-row .btn,
          .service-variations > .btn {
            width: 100%;
          }
        }

        @media (max-width: 420px) {
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
