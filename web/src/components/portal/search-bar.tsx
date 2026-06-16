"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { searchPortal, type SearchResultItem } from "@/lib/api/search";
import { getErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  placeholder?: string;
  className?: string;
}

const TYPE_LABELS: Record<string, string> = {
  enrollment: "Enrollment",
  order: "Order",
  content: "Content",
  ticket: "Ticket",
  session: "Session",
  grading: "Grading",
  speaking: "Speaking",
};

export function SearchBar({
  placeholder = "Search…",
  className,
}: SearchBarProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [shortcutLabel, setShortcutLabel] = useState("⌘K");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isMac = navigator.platform.toLowerCase().includes("mac");
    setShortcutLabel(isMac ? "⌘K" : "Ctrl+K");
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const timer = window.setTimeout(() => {
      void searchPortal(trimmed)
        .then((items) => {
          setResults(items);
          setOpen(true);
        })
        .catch((err) => {
          setResults([]);
          setError(getErrorMessage(err, "Search failed"));
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (query.trim().length >= 2) {
      setOpen(true);
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <form onSubmit={handleSubmit} role="search">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0 || error) setOpen(true);
          }}
          placeholder={placeholder}
          className="h-10 w-full rounded-full border border-border bg-slate-50 pl-10 pr-[4.5rem] text-sm placeholder:text-slate-400 transition-colors focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:inline-block">
          {shortcutLabel}
        </kbd>
      </form>

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-xl border border-border bg-white shadow-lg">
          {loading && (
            <p className="px-4 py-3 text-sm text-muted">Searching…</p>
          )}
          {!loading && error && (
            <p className="px-4 py-3 text-sm text-red-600">{error}</p>
          )}
          {!loading && !error && results.length === 0 && (
            <p className="px-4 py-3 text-sm text-muted">No results found.</p>
          )}
          {!loading && !error && results.length > 0 && (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((item) => (
                <li key={`${item.type}-${item.id}`}>
                  <Link
                    href={item.href}
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                    }}
                    className="flex flex-col gap-0.5 px-4 py-2.5 transition-colors hover:bg-slate-50"
                  >
                    <span className="text-sm font-medium text-navy">
                      {item.label}
                    </span>
                    <span className="text-xs text-muted">
                      {TYPE_LABELS[item.type] ?? item.type}
                      {item.subtitle ? ` · ${item.subtitle}` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
