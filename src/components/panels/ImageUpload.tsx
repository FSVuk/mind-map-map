"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import type { ImageAttachment } from "@/types";

interface ImageUploadProps {
  images: ImageAttachment[];
  onAdd: (file: File) => Promise<void>;
  onRemove: (imageId: string) => void;
}

export default function ImageUpload({ images, onAdd, onRemove }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      Array.from(files).forEach((f) => {
        if (f.type.startsWith("image/")) onAdd(f);
      });
    },
    [onAdd]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <div>
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-vanzemla-accent bg-vanzemla-accent/10"
            : "border-vanzemla-border hover:border-vanzemla-text-dim"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={20} className="mx-auto mb-1 text-vanzemla-text-dim" />
        <p className="text-xs text-vanzemla-text-dim">
          Drop images here or click to browse
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Thumbnail gallery */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-3">
          {images.map((img) => (
            <div key={img.id} className="relative group">
              <button
                className="w-full aspect-square rounded overflow-hidden border border-vanzemla-border bg-vanzemla-bg"
                onClick={() =>
                  setExpanded(expanded === img.id ? null : img.id)
                }
              >
                <img
                  src={img.dataUrl}
                  alt={img.filename}
                  className="w-full h-full object-cover"
                />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(img.id);
                }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} className="text-white" />
              </button>
              <p className="text-[9px] text-vanzemla-text-dim truncate mt-0.5">
                {img.filename}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Expanded view */}
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
    </div>
  );
}
