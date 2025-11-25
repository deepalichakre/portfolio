"use client";

import { useState } from "react";

export default function GalleryLightbox({ gallery }) {
  const [selected, setSelected] = useState(null);

  return (
    <>
      {/* Thumbnails */}
      <div className="gallery">
        {gallery.map((g) => (
          <figure
            key={g.id}
            className="gallery-item"
            title={g.caption || ""}
            onClick={() => setSelected(g)}
            style={{ cursor: "pointer" }}
          >
            <img
              src={g.url}
              alt={g.caption || "project image"}
            />
            {g.caption && <figcaption>{g.caption}</figcaption>}
          </figure>
        ))}
      </div>

      {/* Lightbox overlay */}
      {selected && (
        <div
          className="lightbox"
          onClick={() => setSelected(null)}
        >
          <div
            className="lightbox-inner"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="lightbox-close"
              onClick={() => setSelected(null)}
              aria-label="Close"
            >
              &times;
            </button>

            <img
              src={selected.url}
              alt={selected.caption || "project image"}
              className="lightbox-image"
            />
            {selected.caption && (
              <p className="lightbox-caption">{selected.caption}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
