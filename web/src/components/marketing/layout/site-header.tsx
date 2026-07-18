"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { MarketingHeaderAuth, MarketingMobileAuth } from "@/components/marketing/layout/marketing-header-auth";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { NAV_LINKS } from "@/lib/marketing/data";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const mounted = useHasMounted();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (!mounted) return;

    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mounted]);

  useEffect(() => {
    if (!mounted || previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    setMenuOpen(false);
  }, [mounted, pathname]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-white/10 bg-navy/80 backdrop-blur-xl"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6 sm:h-18">
        <Link href="/">
          <BrandMark size="md" />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "text-white"
                    : "text-slate-300 hover:text-white",
                )}
              >
                {link.label}
                {active ? (
                  <span className="mx-auto mt-0.5 block h-0.5 w-5 rounded-full bg-brand-red" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <MarketingHeaderAuth />
          <Link
            href="/download"
            className="hidden rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/10 md:inline-flex"
          >
            Desktop app
          </Link>
          <Link
            href="/mock-exams"
            className="hidden rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-red/30 transition-all hover:bg-brand-red-hover hover:-translate-y-0.5 sm:inline-flex"
          >
            Book a Mock
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white lg:hidden"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-white/10 bg-navy/95 backdrop-blur-xl lg:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 space-y-3 border-t border-white/10 pt-4">
              <MarketingMobileAuth onNavigate={() => setMenuOpen(false)} />
              <Link
                href="/download"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg border border-white/15 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-white/5"
              >
                Download desktop app
              </Link>
              <Link
                href="/mock-exams"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg bg-brand-red px-4 py-2.5 text-center text-sm font-semibold text-white shadow-lg shadow-brand-red/20"
              >
                Book a Mock
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
