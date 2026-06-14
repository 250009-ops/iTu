"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface SearchBarProps {
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  placeholder = "Search…",
  className,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [shortcutLabel, setShortcutLabel] = useState("⌘K");
  const { toast } = useToast();

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

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const query = inputRef.current?.value.trim();
    if (!query) return;
    toast(`Search: “${query}”`, {
      description: "Full search results are coming soon.",
      variant: "info",
    });
  }

  return (
    <form className={className} onSubmit={handleSubmit} role="search">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        ref={inputRef}
        type="search"
        placeholder={placeholder}
        className="h-10 w-full rounded-full border border-border bg-slate-50 pl-10 pr-[4.5rem] text-sm placeholder:text-slate-400 transition-colors focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:inline-block">
        {shortcutLabel}
      </kbd>
    </form>
  );
}
