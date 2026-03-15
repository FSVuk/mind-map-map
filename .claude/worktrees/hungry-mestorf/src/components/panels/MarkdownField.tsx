"use client";

import { useState } from "react";

interface MarkdownFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
}

export default function MarkdownField({
  value,
  onChange,
  placeholder = "Write markdown...",
  minRows = 6,
}: MarkdownFieldProps) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  return (
    <div>
      <div className="flex gap-1 mb-1">
        <button
          onClick={() => setMode("edit")}
          className={`text-[10px] px-2 py-0.5 rounded font-display tracking-wider ${
            mode === "edit"
              ? "bg-vanzemla-accent/20 text-vanzemla-accent-bright"
              : "text-vanzemla-text-dim hover:text-vanzemla-text"
          }`}
        >
          EDIT
        </button>
        <button
          onClick={() => setMode("preview")}
          className={`text-[10px] px-2 py-0.5 rounded font-display tracking-wider ${
            mode === "preview"
              ? "bg-vanzemla-accent/20 text-vanzemla-accent-bright"
              : "text-vanzemla-text-dim hover:text-vanzemla-text"
          }`}
        >
          PREVIEW
        </button>
      </div>

      {mode === "edit" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={minRows}
          className="w-full px-3 py-2 bg-vanzemla-bg border border-vanzemla-border rounded text-sm text-vanzemla-text resize-y font-mono leading-relaxed focus:outline-none focus:border-vanzemla-accent"
        />
      ) : (
        <div className="w-full px-3 py-2 bg-vanzemla-bg border border-vanzemla-border rounded text-sm text-vanzemla-text prose prose-invert prose-sm max-w-none min-h-[6rem]">
          {value ? (
            <div dangerouslySetInnerHTML={{ __html: simpleMarkdown(value) }} />
          ) : (
            <p className="text-vanzemla-text-dim italic">Nothing to preview</p>
          )}
        </div>
      )}
    </div>
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
