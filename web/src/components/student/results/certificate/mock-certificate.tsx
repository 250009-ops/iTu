import { forwardRef } from "react";
import { formatBandDisplay } from "@/lib/api/mappers/student";
import {
  bandToCefr,
  CEFR_THRESHOLDS,
  cefrMet,
  type CertificateViewModel,
} from "./certificate-utils";
import { TRF, TRF_SKILL_ORDER } from "./certificate-trf-theme";
import { ItestuValidationStamp } from "./validation-stamp";

function CentreStampName({ name }: { name: string }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: TRF.centreStampInk,
        fontFamily: TRF.centreStampFont,
        textTransform: "uppercase",
        letterSpacing: "0.14em",
        lineHeight: 1.35,
        maxWidth: "95%",
      }}
    >
      {name}
    </span>
  );
}

function TrfLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 8,
        fontWeight: 700,
        color: TRF.black,
        lineHeight: 1.2,
      }}
    >
      {children}
    </span>
  );
}

function GreyBox({
  children,
  style,
  center,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  center?: boolean;
}) {
  return (
    <div
      style={{
        background: TRF.greyFill,
        border: `1px solid ${TRF.border}`,
        minHeight: 20,
        padding: "2px 6px",
        fontSize: 11,
        fontWeight: 700,
        color: TRF.black,
        display: "flex",
        alignItems: "center",
        justifyContent: center ? "center" : "flex-start",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function WhiteBox({
  children,
  style,
  center,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  center?: boolean;
}) {
  return (
    <div
      style={{
        background: TRF.white,
        border: `1px solid ${TRF.border}`,
        minHeight: 20,
        padding: "2px 6px",
        fontSize: 10.5,
        fontWeight: 700,
        color: TRF.black,
        display: "flex",
        alignItems: "center",
        justifyContent: center ? "center" : "flex-start",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1 }}>
      <TrfLabel>{label}</TrfLabel>
      <GreyBox style={{ marginTop: 4, minHeight: 22 }}>{value}</GreyBox>
    </div>
  );
}

function CandidateRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "148px 1fr",
        gap: 8,
        alignItems: "center",
        marginBottom: 5,
      }}
    >
      <TrfLabel>{label}</TrfLabel>
      <GreyBox>{value}</GreyBox>
    </div>
  );
}

function InlineField({
  label,
  value,
  flex,
}: {
  label: string;
  value: string;
  flex: number;
}) {
  return (
    <div style={{ flex, minWidth: 0 }}>
      <TrfLabel>{label}</TrfLabel>
      <WhiteBox style={{ marginTop: 4 }} center={label === "Sex (M/F)"}>
        {value}
      </WhiteBox>
    </div>
  );
}

export const MockCertificate = forwardRef<
  HTMLDivElement,
  { vm: CertificateViewModel }
>(function MockCertificate({ vm }, ref) {
  const centre = vm.centre;

  const skillsByName = Object.fromEntries(
    vm.skills.map((s) => [s.name, s]),
  ) as Record<string, (typeof vm.skills)[number]>;

  const orderedSkills = TRF_SKILL_ORDER.map((name) => ({
    name,
    band: skillsByName[name]?.band ?? null,
  }));

  const overallCefr = bandToCefr(vm.overallBand);

  return (
    <div
      ref={ref}
      data-certificate
      style={{
        width: TRF.pageWidthPx,
        minHeight: TRF.pageMinHeightPx,
        background: TRF.white,
        color: TRF.black,
        fontFamily: TRF.font,
        boxSizing: "border-box",
        padding: `${TRF.marginPx}px`,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: 34, fontWeight: 800, lineHeight: 1 }}>
            iTestU
            <sup style={{ fontSize: 9, fontWeight: 700, marginLeft: 2 }}>TM</sup>
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 13, fontWeight: 700 }}>
            Mock Test Report Form
          </p>
        </div>
        <div
          style={{
            border: `1px solid ${TRF.border}`,
            padding: "8px 18px",
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.04em",
          }}
        >
          {vm.moduleLabel.toUpperCase()}
        </div>
      </div>

      {/* NOTE */}
      <p
        style={{
          margin: "14px 0 8px",
          fontSize: 8.5,
          lineHeight: 1.45,
          color: TRF.muted,
        }}
      >
        <strong style={{ color: TRF.black, fontStyle: "normal" }}>NOTE</strong>
        <em>
          {" "}
          This document is a practice mock report issued by iTestU. It mirrors the
          layout of the IELTS Test Report Form for preparation purposes only and is
          not an official IELTS document. It is recommended that the candidate&apos;s
          language ability be re-assessed after two years from the date of the mock
          test.
        </em>
      </p>
      <p style={{ margin: "0 0 14px", fontSize: 8, lineHeight: 1.4, color: TRF.muted }}>
        Mock examinations are delivered by iTestU and partner centres. This form is
        not issued by or affiliated with the British Council, IDP IELTS, or Cambridge
        University Press &amp; Assessment.
      </p>

      {/* Meta row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <MetaField label="Centre Number" value={vm.centreNumber} />
        <MetaField label="Test Date" value={vm.testDateLabel} />
        <MetaField label="Candidate Number" value={vm.candidateNumber} />
      </div>

      <hr style={{ border: "none", borderTop: `1px solid ${TRF.border}`, margin: "0 0 10px" }} />

      {/* Candidate details */}
      <p style={{ margin: "0 0 10px", fontSize: 11.5, fontWeight: 800 }}>
        Candidate Details
      </p>
      <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <CandidateRow label="Family Name" value={vm.family} />
          <CandidateRow label="First Name" value={vm.first} />
          <CandidateRow label="Candidate ID" value={vm.candidateId} />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "148px 1fr",
              gap: 8,
              marginBottom: 5,
            }}
          >
            <span aria-hidden="true" />
            <div style={{ display: "flex", gap: 8 }}>
              <InlineField label="Date of Birth" value={vm.dateOfBirth} flex={1.45} />
              <InlineField label="Sex (M/F)" value={vm.sex} flex={0.55} />
              <InlineField label="Scheme Code" value={vm.schemeCode} flex={1.2} />
            </div>
          </div>

          <CandidateRow
            label="Country or Region of Origin"
            value={vm.country}
          />
          <CandidateRow label="Country of Nationality" value={vm.country} />
          <CandidateRow label="First Language" value={vm.firstLanguage} />
        </div>

        <div
          style={{
            width: 108,
            height: 132,
            border: `1px solid ${TRF.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: TRF.black,
            }}
          >
            {vm.initials}
          </span>
        </div>
      </div>

      <hr style={{ border: "none", borderTop: `1px solid ${TRF.border}`, margin: "0 0 10px" }} />

      {/* Test results */}
      <p style={{ margin: "0 0 10px", fontSize: 11.5, fontWeight: 800 }}>
        Test Results
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
          marginBottom: 16,
        }}
      >
        {orderedSkills.map((skill) => (
          <div key={skill.name} style={{ width: 78 }}>
            <TrfLabel>{skill.name}</TrfLabel>
            <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
              <GreyBox style={{ width: 36, minHeight: 26 }} center>
                {formatBandDisplay(skill.band)}
              </GreyBox>
              <WhiteBox style={{ width: 28, minHeight: 26 }} center>
                {bandToCefr(skill.band)}
              </WhiteBox>
            </div>
          </div>
        ))}
        <div style={{ marginLeft: "auto", textAlign: "center", width: 96 }}>
          <TrfLabel>
            Overall
            <br />
            Band Score
          </TrfLabel>
          <GreyBox style={{ marginTop: 4, minHeight: 30, fontSize: 16 }} center>
            {formatBandDisplay(vm.overallBand)}
          </GreyBox>
          <WhiteBox style={{ marginTop: 4, minHeight: 20 }} center>
            {overallCefr}
          </WhiteBox>
        </div>
      </div>

      <hr style={{ border: "none", borderTop: `1px solid ${TRF.border}`, margin: "0 0 10px" }} />

      {/* Comments + stamps */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <div style={{ flex: "0 0 46%" }}>
          <TrfLabel>Administrator Comments</TrfLabel>
          <div
            style={{
              marginTop: 4,
              border: `1px solid ${TRF.border}`,
              minHeight: 88,
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <TrfLabel>Centre Stamp</TrfLabel>
          <div
            style={{
              marginTop: 4,
              border: `1px solid ${TRF.border}`,
              minHeight: 88,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              padding: 6,
              textAlign: "center",
            }}
          >
            {centre?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={centre.logoUrl}
                alt={centre.name}
                style={{ maxHeight: 46, maxWidth: "92%", objectFit: "contain" }}
              />
            ) : null}
            <CentreStampName name={centre?.name ?? "iTestU Online Centre"} />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <TrfLabel>Validation stamp</TrfLabel>
          <div
            style={{
              marginTop: 4,
              border: `1px solid ${TRF.border}`,
              minHeight: 88,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ItestuValidationStamp size={52} />
          </div>
        </div>
      </div>

      {/* Signature + issue date */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 20,
        }}
      >
        <div style={{ width: "42%" }}>
          <div
            style={{
              borderBottom: `1px solid ${TRF.border}`,
              minHeight: 22,
              marginBottom: 4,
            }}
          />
          <TrfLabel>Administrator&apos;s Signature</TrfLabel>
        </div>
        <div style={{ width: 140 }}>
          <TrfLabel>Issue Date</TrfLabel>
          <GreyBox style={{ marginTop: 4 }}>{vm.issueDateLabel}</GreyBox>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", gap: 16 }}>
        <div>
          <TrfLabel>
            CEFR Level
            <br />
            Threshold Met
          </TrfLabel>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            {CEFR_THRESHOLDS.map((level) => {
              const met = cefrMet(vm.overallBand, level);
              return (
                <div key={level} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, fontWeight: 700 }}>{level}</div>
                  <div
                    style={{
                      marginTop: 2,
                      width: 22,
                      height: 16,
                      border: `1px solid ${TRF.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {met ? (
                      <svg width="12" height="10" viewBox="0 0 12 10" aria-hidden>
                        <path
                          d="M1 5 L4 8 L11 1"
                          fill="none"
                          stroke={TRF.black}
                          strokeWidth="1.5"
                        />
                      </svg>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <TrfLabel>Unique Reference Number</TrfLabel>
          <GreyBox style={{ marginTop: 4, marginBottom: 10 }}>
            {vm.referenceNumber}
          </GreyBox>
          <TrfLabel>Test Report Form Number</TrfLabel>
          <GreyBox style={{ marginTop: 4 }}>{vm.reportFormNumber}</GreyBox>
        </div>
      </div>

      <p
        style={{
          margin: "16px 0 0",
          fontSize: 8,
          fontStyle: "italic",
          color: TRF.muted,
        }}
      >
        Recognising organisations must verify this mock score at verify.itestu.uz
      </p>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>
    </div>
  );
});
