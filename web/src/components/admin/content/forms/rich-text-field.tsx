"use client";

import { useCallback, useEffect, useRef } from "react";
import { Bold, Italic, Underline } from "lucide-react";
import { Label } from "@/components/ui/label";
import { sanitizePassageHtml } from "@/lib/admin/content/sanitize-html";
import { cn } from "@/lib/utils";

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
};

export function RichTextField({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value || "";
    }
  }, [value]);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    onChange(sanitizePassageHtml(el.innerHTML));
  }, [onChange]);

  function exec(cmd: string) {
    document.execCommand(cmd, false);
    sync();
    ref.current?.focus();
  }

  const minHeight = Math.max(80, rows * 24);

  return (
    <div className="space-y-2">
      {label && <Label className="text-xs">{label}</Label>}
      <div className="overflow-hidden rounded-lg border border-border bg-white">
        <div className="flex gap-1 border-b border-border bg-slate-50 px-2 py-1">
          <ToolbarBtn title="Bold" onClick={() => exec("bold")}>
            <Bold className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn title="Italic" onClick={() => exec("italic")}>
            <Italic className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn title="Underline" onClick={() => exec("underline")}>
            <Underline className="h-3.5 w-3.5" />
          </ToolbarBtn>
        </div>
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={sync}
          onBlur={sync}
          data-placeholder={placeholder}
          className={cn(
            "px-3 py-2 text-sm leading-relaxed text-navy outline-none",
            "empty:before:pointer-events-none empty:before:text-muted empty:before:content-[attr(data-placeholder)]",
          )}
          style={{ minHeight }}
        />
      </div>
    </div>
  );
}

function ToolbarBtn({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="flex h-7 w-7 items-center justify-center rounded text-muted hover:bg-white hover:text-navy"
    >
      {children}
    </button>
  );
}
