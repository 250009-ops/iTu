import { TRF } from "./certificate-trf-theme";

/** iTestU validation mark — muted TRF tile, white iTu at bottom-left. */
export function ItestuValidationStamp({
  size = 52,
  className,
}: {
  /** Square stamp edge length in px */
  size?: number;
  className?: string;
}) {
  const radius = Math.max(6, Math.round(size * 0.16));
  const padLeft = Math.round(size * 0.1);
  const padBottom = Math.round(size * 0.1);
  const logoW = Math.round(size * 0.52);

  return (
    <div
      className={className}
      aria-hidden
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: radius,
        background: TRF.stampFill,
        boxSizing: "border-box",
        flexShrink: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo/itestu3.svg"
        alt=""
        style={{
          position: "absolute",
          left: padLeft,
          bottom: padBottom,
          width: logoW,
          height: "auto",
          display: "block",
        }}
      />
    </div>
  );
}
