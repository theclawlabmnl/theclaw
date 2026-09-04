"use client";

import { useState } from "react";

type Promo = {
  id: string;
  name: string;
  description: string | null;
  discount_type: "fixed" | "percent";
  discount_value: number;
  active: boolean;
};

export default function PromoManager({
  promos,
}: {
  promos: Promo[];
}) {
  const [busy, setBusy] = useState(false);

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDiscountType, setNewDiscountType] = useState<
    "fixed" | "percent"
  >("fixed");
  const [newDiscountValue, setNewDiscountValue] = useState("");

  const request = async (
    method: "POST" | "PATCH" | "DELETE",
    body: Record<string, unknown>
  ) => {
    setBusy(true);

    try {
      const response = await fetch("/api/admin/promos", {
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

  const addPromo = async () => {
    const name = newName.trim();

    if (!name) {
      alert("Please enter a promo name.");
      return;
    }

    await request("POST", {
      name,
      description: newDescription,
      discount_type: newDiscountType,
      discount_value: Number(newDiscountValue) || 0,
      active: true,
    });
  };

  const updatePromo = (
    id: string,
    patch: Record<string, unknown>
  ) => {
    return request("PATCH", {
      id,
      ...patch,
    });
  };

  const deletePromo = async (id: string) => {
    if (!confirm("Delete this promo?")) return;

    await request("DELETE", { id });
  };

  return (
    <div className="promo-admin">
      <div className="card">
        <div className="kicker">Marketing</div>

        <h2 className="serif">Create a promo</h2>

        <div className="field">
          <label>Name</label>

          <input
            value={newName}
            onChange={(event) =>
              setNewName(event.target.value)
            }
            placeholder="e.g. September Promo"
          />
        </div>

        <div className="field">
          <label>Description</label>

          <textarea
            value={newDescription}
            onChange={(event) =>
              setNewDescription(event.target.value)
            }
            placeholder="Describe the promotion..."
          />
        </div>

        <div className="inline-grid">
          <div className="field">
            <label>Discount type</label>

            <select
              value={newDiscountType}
              onChange={(event) =>
                setNewDiscountType(
                  event.target.value as
                    | "fixed"
                    | "percent"
                )
              }
            >
              <option value="fixed">
                Fixed amount
              </option>

              <option value="percent">
                Percentage
              </option>
            </select>
          </div>

          <div className="field">
            <label>Discount value</label>

            <input
              type="number"
              min="0"
              value={newDiscountValue}
              onChange={(event) =>
                setNewDiscountValue(
                  event.target.value
                )
              }
              placeholder="0"
            />
          </div>
        </div>

        <button
          className="btn"
          disabled={busy}
          onClick={addPromo}
        >
          {busy ? "Saving..." : "+ Add Promo"}
        </button>
      </div>

      <div className="promo-admin-grid">
        {promos.length === 0 ? (
          <div className="card">
            <p className="muted">
              No promos yet. Create your first
              promotion above.
            </p>
          </div>
        ) : (
          promos.map((promo) => (
            <div
              className="card promo-admin-card"
              key={promo.id}
            >
              <div className="promo-admin-header">
                <div>
                  <div className="kicker">
                    Promotion
                  </div>

                  <h3 className="serif">
                    {promo.name}
                  </h3>
                </div>

                <button
                  className="btn danger small"
                  disabled={busy}
                  onClick={() =>
                    deletePromo(promo.id)
                  }
                >
                  Delete
                </button>
              </div>

              <div className="field">
                <label>Name</label>

                <input
                  defaultValue={promo.name}
                  onBlur={(event) =>
                    updatePromo(promo.id, {
                      name: event.target.value,
                    })
                  }
                />
              </div>

              <div className="field">
                <label>Description</label>

                <textarea
                  defaultValue={
                    promo.description || ""
                  }
                  onBlur={(event) =>
                    updatePromo(promo.id, {
                      description:
                        event.target.value,
                    })
                  }
                />
              </div>

              <div className="inline-grid">
                <div className="field">
                  <label>Discount type</label>

                  <select
                    defaultValue={
                      promo.discount_type
                    }
                    onChange={(event) =>
                      updatePromo(promo.id, {
                        discount_type:
                          event.target.value,
                      })
                    }
                  >
                    <option value="fixed">
                      Fixed amount
                    </option>

                    <option value="percent">
                      Percentage
                    </option>
                  </select>
                </div>

                <div className="field">
                  <label>Discount value</label>

                  <input
                    type="number"
                    min="0"
                    defaultValue={
                      promo.discount_value
                    }
                    onBlur={(event) =>
                      updatePromo(promo.id, {
                        discount_value:
                          Number(
                            event.target.value
                          ) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <label className="promo-active">
                <input
                  type="checkbox"
                  defaultChecked={
                    promo.active
                  }
                  onChange={(event) =>
                    updatePromo(promo.id, {
                      active:
                        event.target.checked,
                    })
                  }
                />{" "}
                Show on website
              </label>

              <div className="status-pill">
                {promo.active
                  ? "Active"
                  : "Inactive"}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}