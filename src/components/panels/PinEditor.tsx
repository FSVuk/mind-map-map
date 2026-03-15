"use client";

import { useState } from "react";
import { useMap } from "@/lib/MapContext";
import { useAuth } from "@/lib/AuthContext";
import MarkdownField from "./MarkdownField";
import ImageUpload from "./ImageUpload";
import { Trash2, MapPin, Building2, X } from "lucide-react";
import type { ImageAttachment } from "@/types";

interface PinEditorProps {
  pinId: string;
}

export default function PinEditor({ pinId }: PinEditorProps) {
  const { state, updatePin, deletePin, addImage, removeImage, getPinsInCity } =
    useMap();
  const { role } = useAuth();
  const pin = state.pins.find((p) => p.id === pinId);
  const readOnly = role !== "author";

  if (!pin) {
    return (
      <div className="p-4 text-vanzemla-text-dim text-sm italic">
        Pin not found
      </div>
    );
  }

  const childPins = pin.type === "city" ? getPinsInCity(pinId) : [];

  return (
    <div className="p-4 space-y-5">
      {/* Pin label */}
      <div>
        <label className="block text-[10px] font-display tracking-wider text-vanzemla-text-dim uppercase mb-1">
          Label
        </label>
        {readOnly ? (
          <p className="px-3 py-2 text-sm text-vanzemla-text">
            {pin.label || <span className="text-vanzemla-text-dim italic">Unnamed Pin</span>}
          </p>
        ) : (
          <input
            type="text"
            value={pin.label}
            onChange={(e) => updatePin(pinId, { label: e.target.value })}
            placeholder="Pin name"
            className="w-full px-3 py-2 bg-vanzemla-bg border border-vanzemla-border rounded text-sm text-vanzemla-text focus:outline-none focus:border-vanzemla-accent"
          />
        )}
      </div>

      {/* Type toggle — author only */}
      {!readOnly && (
        <div>
          <label className="block text-[10px] font-display tracking-wider text-vanzemla-text-dim uppercase mb-1">
            Type
          </label>
          <div className="flex gap-1">
            <button
              onClick={() => updatePin(pinId, { type: "pin" })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-display tracking-wider ${
                pin.type === "pin"
                  ? "bg-vanzemla-accent/20 text-vanzemla-accent-bright"
                  : "text-vanzemla-text-dim hover:text-vanzemla-text bg-vanzemla-bg border border-vanzemla-border"
              }`}
            >
              <MapPin size={12} /> PIN
            </button>
            <button
              onClick={() => updatePin(pinId, { type: "city" })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-display tracking-wider ${
                pin.type === "city"
                  ? "bg-vanzemla-accent/20 text-vanzemla-accent-bright"
                  : "text-vanzemla-text-dim hover:text-vanzemla-text bg-vanzemla-bg border border-vanzemla-border"
              }`}
            >
              <Building2 size={12} /> CITY
            </button>
          </div>
        </div>
      )}

      {/* Type badge — reader only */}
      {readOnly && (
        <div className="flex items-center gap-1.5 text-xs text-vanzemla-text-dim">
          {pin.type === "city" ? <Building2 size={12} /> : <MapPin size={12} />}
          <span className="font-display tracking-wider uppercase">{pin.type}</span>
        </div>
      )}

      {/* Content / lore */}
      <div>
        <label className="block text-[10px] font-display tracking-wider text-vanzemla-text-dim uppercase mb-1">
          Content
        </label>
        {readOnly ? (
          <div className="px-3 py-2 text-sm text-vanzemla-text">
            {pin.content ? (
              <div dangerouslySetInnerHTML={{ __html: simpleMarkdown(pin.content) }} />
            ) : (
              <p className="text-vanzemla-text-dim italic">No content</p>
            )}
          </div>
        ) : (
          <MarkdownField
            value={pin.content}
            onChange={(content) => updatePin(pinId, { content })}
            placeholder="Lore, notes, details..."
          />
        )}
      </div>

      {/* Images */}
      <div>
        <label className="block text-[10px] font-display tracking-wider text-vanzemla-text-dim uppercase mb-1">
          Images ({pin.images.length})
        </label>
        {readOnly ? (
          pin.images.length > 0 ? (
            <ImageGallery images={pin.images} />
          ) : (
            <p className="text-xs text-vanzemla-text-dim italic">No images</p>
          )
        ) : (
          <ImageUpload
            images={pin.images}
            onAdd={(file) => addImage(pinId, file)}
            onRemove={(imageId) => removeImage(pinId, imageId)}
          />
        )}
      </div>

      {/* City children — disabled for this release */}
      {pin.type === "city" && (
        <div className="opacity-40 pointer-events-none select-none">
          <label className="block text-[10px] font-display tracking-wider text-vanzemla-text-dim uppercase mb-1">
            Child Pins ({childPins.length})
          </label>
          <p className="text-[10px] text-vanzemla-text-dim italic mb-2">
            Coming soon
          </p>
          {childPins.length === 0 ? (
            <p className="text-xs text-vanzemla-text-dim italic">
              No child pins yet
            </p>
          ) : (
            <div className="space-y-1">
              {childPins.map((cp) => (
                <div
                  key={cp.id}
                  className="flex items-center gap-2 px-3 py-2 bg-vanzemla-bg border border-vanzemla-border rounded text-sm text-vanzemla-text"
                >
                  <MapPin size={12} className="text-vanzemla-text-dim shrink-0" />
                  <span className="truncate">{cp.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete button — author only */}
      {!readOnly && (
        <div className="pt-2 border-t border-vanzemla-border">
          <button
            onClick={() => deletePin(pinId)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
          >
            <Trash2 size={12} /> Delete Pin
          </button>
        </div>
      )}
    </div>
  );
}

/** Read-only image gallery (view only, no upload/delete) */
function ImageGallery({ images }: { images: ImageAttachment[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {images.map((img) => (
          <div key={img.id}>
            <button
              className="w-full aspect-square rounded overflow-hidden border border-vanzemla-border bg-vanzemla-bg"
              onClick={() => setExpanded(expanded === img.id ? null : img.id)}
            >
              <img src={img.dataUrl} alt={img.filename} className="w-full h-full object-cover" />
            </button>
            <p className="text-[9px] text-vanzemla-text-dim truncate mt-0.5">{img.filename}</p>
          </div>
        ))}
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
          onClick={() => setExpanded(null)}
        >
          <div className="relative max-w-full max-h-full">
            <img
              src={images.find((i) => i.id === expanded)?.dataUrl}
              alt=""
              className="max-w-full max-h-[80vh] object-contain rounded"
            />
            <button
              className="absolute top-2 right-2 w-8 h-8 bg-vanzemla-sidebar rounded-full flex items-center justify-center"
              onClick={() => setExpanded(null)}
            >
              <X size={16} className="text-vanzemla-text" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function simpleMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}
