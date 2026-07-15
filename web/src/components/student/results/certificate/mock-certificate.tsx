import { forwardRef } from "react";
import { formatBandDisplay } from "@/lib/api/mappers/student";
import {
  bandToCefr,
  CEFR_THRESHOLDS,
  cefrMet,
  type CertificateViewModel,
} from "./certificate-utils";

const NAVY = "#0f1e3d";
const BRAND_RED = "#E31837";
const BOX_BG = "#eef1f4";
const BOX_BORDER = "#c7d0da";
const INK = "#1f2937";
const MUTED = "#64748b";

function Field({
  label,
  value,
  className,
  boxClassName,
  valueStyle,
}: {
  label: string;
  value: string;
  className?: string;
  boxClassName?: string;
  valueStyle?: React.CSSProperties;
}) {
  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span
        style={{
          fontSize: 8.5,
          fontWeight: 600,
          color: MUTED,
          lineHeight: 1.15,
          letterSpacing: "0.01em",
        }}
      >
        {label}
      </span>
      <div
        className={boxClassName}
        style={{
          background: BOX_BG,
          border: `1px solid ${BOX_BORDER}`,
          borderRadius: 2,
          minHeight: 22,
          padding: "3px 8px",
          fontSize: 11,
          fontWeight: 600,
          color: INK,
          display: "flex",
          alignItems: "center",
          ...valueStyle,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 12.5,
        fontWeight: 800,
        color: NAVY,
        margin: "0 0 8px",
        letterSpacing: "-0.01em",
      }}
    >
      {children}
    </p>
  );
}

function SkillResult({
  name,
  band,
}: {
  name: string;
  band: number | null;
}) {
  const cefr = bandToCefr(band);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, color: NAVY }}>{name}</span>
      <div style={{ display: "flex", gap: 5 }}>
        <div
          style={{
            background: BOX_BG,
            border: `1px solid ${BOX_BORDER}`,
            borderRadius: 2,
            width: 40,
            height: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 15,
            fontWeight: 800,
            color: INK,
          }}
        >
          {formatBandDisplay(band)}
        </div>
        <div
          style={{
            background: BOX_BG,
            border: `1px solid ${BOX_BORDER}`,
            borderRadius: 2,
            width: 30,
            height: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            color: MUTED,
          }}
        >
          {cefr}
        </div>
      </div>
    </div>
  );
}

/** iTestU circular validation seal (drawn, not an image). */
function ValidationSeal() {
  return (
    <svg width="72" height="72" viewBox="0 0 100 100" aria-hidden>
      <defs>
        <path id="cert-seal-arc-top" d="M 12,50 A 38,38 0 0 1 88,50" fill="none" />
        <path id="cert-seal-arc-bottom" d="M 88,50 A 38,38 0 0 1 12,50" fill="none" />
      </defs>
      <circle cx="50" cy="50" r="47" fill="none" stroke={BRAND_RED} strokeWidth="1.5" />
      <circle cx="50" cy="50" r="40" fill="none" stroke={BRAND_RED} strokeWidth="0.8" />
      <circle cx="50" cy="50" r="22" fill="none" stroke={BRAND_RED} strokeWidth="0.8" />
      <text fontSize="8.5" fontWeight="700" fill={BRAND_RED} letterSpacing="1.2">
        <textPath href="#cert-seal-arc-top" startOffset="50%" textAnchor="middle">
          iTestU • VERIFIED
        </textPath>
      </text>
      <text fontSize="7" fontWeight="600" fill={BRAND_RED} letterSpacing="1.5">
        <textPath href="#cert-seal-arc-bottom" startOffset="50%" textAnchor="middle">
          MOCK EXAMINATION
        </textPath>
      </text>
      <text
        x="50"
        y="47"
        textAnchor="middle"
        fontSize="13"
        fontWeight="800"
        fill={BRAND_RED}
      >
        iTU
      </text>
      <text x="50" y="58" textAnchor="middle" fontSize="6.5" fontWeight="600" fill={BRAND_RED}>
        CBT
      </text>
    </svg>
  );
}

export const MockCertificate = forwardRef<
  HTMLDivElement,
  { vm: CertificateViewModel }
>(function MockCertificate({ vm }, ref) {
  const centre = vm.centre;

  return (
    <div
      ref={ref}
      data-certificate
      style={{
        width: 794,
        minHeight: 1123,
        background: "#ffffff",
        color: INK,
        fontFamily:
          "'Segoe UI', Arial, Helvetica, sans-serif",
        position: "relative",
        boxSizing: "border-box",
        padding: 0,
      }}
    >
      {/* Security watermark */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          opacity: 0.04,
          display: "flex",
          flexWrap: "wrap",
          transform: "rotate(-30deg) scale(1.4)",
          transformOrigin: "center",
        }}
      >
        {Array.from({ length: 60 }).map((_, i) => (
          <span
            key={i}
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: NAVY,
              whiteSpace: "nowrap",
              padding: "10px 18px",
            }}
          >
            iTestU MOCK · NOT AN OFFICIAL IELTS DOCUMENT
          </span>
        ))}
      </div>

      {/* Document border */}
      <div
        style={{
          position: "relative",
          margin: 14,
          border: `2px solid ${NAVY}`,
          padding: "22px 26px 18px",
          minHeight: 1123 - 28,
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: `2px solid ${NAVY}`,
            paddingBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 46,
                height: 46,
                borderRadius: 10,
                background: BRAND_RED,
                color: "#fff",
                fontSize: 22,
                fontWeight: 800,
                boxShadow: "0 4px 10px rgba(227,24,55,0.35)",
              }}
            >
              iT
            </span>
            <div>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: NAVY, lineHeight: 1 }}>
                iTestU
              </p>
              <p style={{ margin: "3px 0 0", fontSize: 12.5, fontWeight: 600, color: INK }}>
                Mock Test Report Form
                <sup style={{ fontSize: 7, marginLeft: 2 }}>TM</sup>
              </p>
            </div>
          </div>
          <div
            style={{
              border: `1px solid ${NAVY}`,
              borderRadius: 3,
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 800,
              color: NAVY,
              textTransform: "uppercase",
              letterSpacing: "0.03em",
            }}
          >
            {vm.moduleLabel}
          </div>
        </div>

        {/* Note */}
        <p
          style={{
            margin: "10px 0 16px",
            fontSize: 8,
            lineHeight: 1.5,
            color: MUTED,
          }}
        >
          <strong style={{ color: INK }}>NOTE&nbsp;&nbsp;</strong>
          This Mock Test Report Form is issued by iTestU as a practice assessment of the
          candidate&apos;s English language ability. It simulates the format of the IELTS test but
          is <strong>not an official IELTS Test Report Form</strong> and is not issued by or
          affiliated with the British Council, IDP: IELTS Australia, or Cambridge Assessment English.
          Bands are indicative and intended for preparation purposes only.
        </p>

        {/* Top info row */}
        <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
          <Field
            label="Centre Number"
            value={vm.centreNumber}
            className="cert-grow"
          />
          <Field label="Test Date" value={vm.testDateLabel} className="cert-grow" />
          <Field
            label="Candidate Number"
            value={vm.candidateNumber}
            className="cert-grow"
          />
        </div>

        {/* Candidate details */}
        <SectionTitle>Candidate Details</SectionTitle>
        <div style={{ display: "flex", gap: 14, marginBottom: 18 }}>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 9,
            }}
          >
            <Field label="Family Name" value={vm.family} />
            <Field label="First Name" value={vm.first} />
            <Field label="Candidate ID" value={vm.candidateId} />
            <div style={{ display: "flex", gap: 10 }}>
              <Field label="Date of Birth" value={vm.dateOfBirth} className="cert-grow" />
              <Field label="Sex (M/F)" value={vm.sex} boxClassName="cert-narrow" />
              <Field label="Scheme Code" value="Mock" className="cert-grow" />
            </div>
            <Field
              label="Country or Region of Origin"
              value={vm.country || "—"}
            />
            <Field label="Country of Nationality" value={vm.country || "—"} />
            <Field label="First Language" value={vm.firstLanguage} />
          </div>

          {/* Photo / initials */}
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div
              style={{
                width: 118,
                height: 148,
                border: `1px solid ${BOX_BORDER}`,
                background: BOX_BG,
                borderRadius: 3,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <span
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: "50%",
                  background: NAVY,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                  fontWeight: 800,
                }}
              >
                {vm.initials}
              </span>
              <span
                style={{
                  position: "absolute",
                  bottom: 6,
                  fontSize: 7,
                  color: MUTED,
                  fontWeight: 600,
                }}
              >
                CANDIDATE
              </span>
            </div>
          </div>
        </div>

        {/* Test results */}
        <SectionTitle>Test Results</SectionTitle>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 10,
            marginBottom: 20,
          }}
        >
          {vm.skills.map((s) => (
            <SkillResult key={s.id} name={s.name} band={s.band} />
          ))}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginLeft: 4 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: BRAND_RED, textAlign: "center" }}>
              Overall Band Score
            </span>
            <div
              style={{
                width: 74,
                height: 42,
                border: `2px solid ${BRAND_RED}`,
                borderRadius: 3,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 800,
                color: BRAND_RED,
                background: "rgba(227,24,55,0.05)",
                margin: "0 auto",
              }}
            >
              {formatBandDisplay(vm.overallBand)}
            </div>
          </div>
        </div>

        {/* Stamps row */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1.6, display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 8.5, fontWeight: 600, color: MUTED }}>
              Administrator Comments
            </span>
            <div
              style={{
                border: `1px solid ${BOX_BORDER}`,
                borderRadius: 2,
                minHeight: 96,
                padding: "8px 10px",
                fontSize: 9.5,
                lineHeight: 1.5,
                color: INK,
              }}
            >
              Assessment completed under simulated IELTS conditions. Writing and Speaking
              sections were graded by certified examiners against official band descriptors.
              This report reflects the candidate&apos;s performance on the mock examination date.
            </div>
          </div>

          {/* Centre stamp — partner logo appears here when the exam was conducted by a partner */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 8.5, fontWeight: 600, color: MUTED }}>
              Centre Stamp
            </span>
            <div
              style={{
                border: `1px dashed ${BOX_BORDER}`,
                borderRadius: 2,
                minHeight: 96,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: 8,
                textAlign: "center",
              }}
            >
              {centre?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={centre.logoUrl}
                  alt={centre.name}
                  style={{ maxHeight: 46, maxWidth: "90%", objectFit: "contain" }}
                />
              ) : (
                <span
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    background: NAVY,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                    fontWeight: 800,
                  }}
                >
                  iT
                </span>
              )}
              <span style={{ fontSize: 9, fontWeight: 700, color: NAVY, lineHeight: 1.2 }}>
                {centre?.name ?? "iTestU Online Centre"}
              </span>
              {centre?.city ? (
                <span style={{ fontSize: 7.5, color: MUTED }}>{centre.city}</span>
              ) : null}
            </div>
          </div>

          {/* Validation stamp — always iTestU */}
          <div style={{ flex: 0.8, display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 8.5, fontWeight: 600, color: MUTED }}>
              Validation Stamp
            </span>
            <div
              style={{
                border: `1px solid ${BOX_BORDER}`,
                borderRadius: 2,
                minHeight: 96,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ValidationSeal />
            </div>
          </div>
        </div>

        {/* Signature + issue date */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "flex-end" }}>
          <div style={{ flex: 1.6 }}>
            <p
              style={{
                fontFamily: "'Segoe Script', 'Brush Script MT', cursive",
                fontSize: 20,
                color: NAVY,
                margin: "0 0 2px",
                borderBottom: `1px solid ${INK}`,
                paddingBottom: 2,
                width: "70%",
              }}
            >
              iTestU Assessment Office
            </p>
            <span style={{ fontSize: 8.5, fontWeight: 600, color: MUTED }}>
              Administrator&apos;s Signature
            </span>
          </div>
          <Field label="Issue Date" value={vm.issueDateLabel} className="cert-grow" />
        </div>

        {/* CEFR + reference block */}
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "stretch",
            borderTop: `1px solid ${BOX_BORDER}`,
            paddingTop: 12,
          }}
        >
          <div style={{ flex: 0.9 }}>
            <span style={{ fontSize: 8, fontWeight: 600, color: MUTED }}>
              CEFR Threshold Met
            </span>
            <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
              {CEFR_THRESHOLDS.map((level) => {
                const met = cefrMet(vm.overallBand, level);
                return (
                  <div key={level} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: INK }}>{level}</div>
                    <div
                      style={{
                        marginTop: 2,
                        width: 20,
                        height: 18,
                        border: `1px solid ${BOX_BORDER}`,
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: met ? "#059669" : "transparent",
                        fontSize: 12,
                        fontWeight: 800,
                        background: met ? "rgba(5,150,105,0.08)" : BOX_BG,
                      }}
                    >
                      ✓
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ flex: 1.55, display: "flex", flexDirection: "column", gap: 8 }}>
            <Field label="Unique Reference Number" value={vm.referenceNumber} />
            <Field label="Test Report Form Number" value={vm.reportFormNumber} />
          </div>
        </div>

        {/* Footer */}
        <p
          style={{
            position: "absolute",
            bottom: 8,
            left: 26,
            right: 26,
            margin: 0,
            fontSize: 7.5,
            color: MUTED,
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          Verify this report at verify.itestu.uz using the Unique Reference Number above. ·
          iTestU Computer-Based Testing · This document certifies a practice mock examination only.
        </p>
      </div>

      <style>{`
        [data-certificate] .cert-grow { flex: 1; }
        [data-certificate] .cert-narrow { min-width: 44px; width: 44px; }
        @media print {
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>
    </div>
  );
});
