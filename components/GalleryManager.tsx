"use client";

import { useRef, useState } from "react";

type GalleryPhoto = {
  id: string;
  image_path: string;
  caption: string | null;
  sort_order: number;
  active: boolean;
};

export default function GalleryManager({
  photos,
}: {
  photos: GalleryPhoto[];
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);

  const upload = async () => {
    const file = fileRef.current?.files?.[0];

    if (!file) {
      alert("Please choose a photo first.");
      return;
    }

    setBusy(true);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("caption", caption);

      const response = await fetch("/api/admin/gallery", {
        method: "POST",
        body: form,
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || "Upload failed.");
        return;
      }

      location.reload();
    } catch {
      alert("Something went wrong while uploading.");
    } finally {
      setBusy(false);
    }
  };

  const update = async (id: string, patch: Partial<GalleryPhoto>) => {
    setBusy(true);

    try {
      const response = await fetch("/api/admin/gallery", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id,
          ...patch,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || "Update failed.");
        return;
      }

      location.reload();
    } catch {
      alert("Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this gallery photo?")) return;

    setBusy(true);

    try {
      const response = await fetch("/api/admin/gallery", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || "Delete failed.");
        return;
      }

      location.reload();
    } catch {
      alert("Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gallery-admin">
      <div className="card">
        <h3 className="serif">Upload a gallery photo</h3>

        <div className="field">
          <label>Photo</label>

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
          />
        </div>

        <div className="field">
          <label>Caption</label>

          <input
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="e.g. Soft blush set"
          />
        </div>

        <button className="btn" onClick={upload} disabled={busy}>
          {busy ? "Uploading..." : "Upload photo"}
        </button>
      </div>

      <div className="gallery-admin-grid">
        {photos.length === 0 ? (
          <div className="card">
            <p className="muted">
              No gallery photos yet. Upload your first nail set above.
            </p>
          </div>
        ) : (
          photos.map((photo) => (
            <div className="card gallery-admin-card" key={photo.id}>
              <img
                src={`/api/gallery/${photo.id}`}
                alt={photo.caption || "The Claw Lab gallery photo"}
              />

              <div className="field">
                <label>Caption</label>

                <input
                  defaultValue={photo.caption || ""}
                  onBlur={(event) =>
                    update(photo.id, {
                      caption: event.target.value,
                    })
                  }
                />
              </div>

              <div className="field">
                <label>Display order</label>

                <input
                  type="number"
                  defaultValue={photo.sort_order}
                  onBlur={(event) =>
                    update(photo.id, {
                      sort_order: Number(event.target.value),
                    })
                  }
                />
              </div>

              <label>
                <input
                  type="checkbox"
                  defaultChecked={photo.active}
                  onChange={(event) =>
                    update(photo.id, {
                      active: event.target.checked,
                    })
                  }
                />{" "}
                Show on website
              </label>

              <button
                className="btn danger small"
                onClick={() => remove(photo.id)}
                disabled={busy}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}