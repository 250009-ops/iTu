import { TRUST_LOGOS } from "@/lib/marketing/data";

export function TrustMarquee() {
  const logos = [...TRUST_LOGOS, ...TRUST_LOGOS];
  return (
    <div className="border-y border-border bg-white py-8">
      <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted">
        Trusted by candidates accepted to
      </p>
      <div className="marquee-mask relative mt-6 overflow-hidden">
        <div className="animate-marquee flex w-max items-center gap-14 whitespace-nowrap">
          {logos.map((logo, i) => (
            <span
              key={`${logo}-${i}`}
              className="text-base font-semibold text-slate-400 transition-colors hover:text-navy"
            >
              {logo}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
