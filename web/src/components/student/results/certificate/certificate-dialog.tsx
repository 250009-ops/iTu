"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, X } from "lucide-react";
import type { StudentResultsData } from "@/lib/api/mappers/student";
import { MockCertificate } from "./mock-certificate";
import {
  deriveIdentifiers,
  displayOrDash,
  formatTrfDate,
  initials,
  splitName,
  type CertificateViewModel,
} from "./certificate-utils";

const CERT_WIDTH = 794;

function buildViewModel(data: StudentResultsData): CertificateViewModel {
  const cert = data.certificate;
  const centreName = cert.centre?.name ?? null;
  const ids = deriveIdentifiers(
    data.enrollmentCode,
    centreName,
    cert.centre?.code ?? null,
  );
  const { family, first } = splitName(cert.candidateName);

  return {
    moduleLabel: cert.moduleLabel,
    centreNumber: ids.centreNumber,
    candidateNumber: ids.candidateNumber,
    candidateId: ids.candidateId,
    referenceNumber: ids.referenceNumber,
    reportFormNumber: ids.reportFormNumber,
    family,
    first,
    initials: initials(cert.candidateName),
    country: displayOrDash(cert.country),
    dateOfBirth: formatTrfDate(cert.dateOfBirth),
    sex: displayOrDash(cert.sex),
    firstLanguage: displayOrDash(cert.firstLanguage),
    schemeCode: cert.schemeCode,
    testDateLabel: formatTrfDate(cert.mockDate),
    issueDateLabel: formatTrfDate(cert.issueDate),
    overallBand: data.overallBand,
    skills: data.skills.map((s) => ({ id: s.id, name: s.name, band: s.band })),
    centre: cert.centre,
  };
}

function printCertificate(node: HTMLElement | null) {
  if (!node) return;
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>iTestU Mock Certificate</title>` +
      `<style>@page{size:A4 portrait;margin:0;}html,body{margin:0;padding:0;background:#fff;}` +
      `*{-webkit-print-color-adjust:exact;print-color-adjust:exact;}</style></head>` +
      `<body>${node.outerHTML}</body></html>`,
  );
  doc.close();

  const trigger = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1000);
  };

  // Wait for images (partner logo) to load before printing.
  const imgs = Array.from(doc.images);
  if (imgs.length === 0) {
    setTimeout(trigger, 150);
    return;
  }
  let remaining = imgs.length;
  const done = () => {
    remaining -= 1;
    if (remaining <= 0) setTimeout(trigger, 150);
  };
  imgs.forEach((img) => {
    if (img.complete) done();
    else {
      img.addEventListener("load", done);
      img.addEventListener("error", done);
    }
  });
}

export function CertificateDialog({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: StudentResultsData;
}) {
  const certRef = useRef<HTMLDivElement>(null);
  const scaleWrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const recomputeScale = useCallback(() => {
    const wrap = scaleWrapRef.current;
    if (!wrap) return;
    const available = wrap.clientWidth;
    const next = Math.min(1, available / CERT_WIDTH);
    setScale(next > 0 ? next : 1);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    recomputeScale();
    window.addEventListener("resize", recomputeScale);
    return () => window.removeEventListener("resize", recomputeScale);
  }, [open, recomputeScale]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const vm = buildViewModel(data);
  const scaledHeight = 1123 * scale;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex flex-col bg-slate-900/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Mock certificate preview"
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-slate-950/80 px-5 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">
            iTestU Mock Certificate
          </p>
          <p className="truncate text-xs text-slate-400">
            {vm.family}, {vm.first} · Overall{" "}
            {data.overallBand != null ? data.overallBand : "—"} ·{" "}
            {vm.centre?.name ?? "iTestU Online Centre"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => printCertificate(certRef.current)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-red-hover"
          >
            <Printer size={16} />
            Print / Save as PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Scrollable preview */}
      <div className="flex-1 overflow-auto p-4 sm:p-8">
        <div ref={scaleWrapRef} className="mx-auto" style={{ maxWidth: CERT_WIDTH }}>
          <div style={{ height: scaledHeight }}>
            <div
              style={{
                width: CERT_WIDTH,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
              }}
            >
              <MockCertificate ref={certRef} vm={vm} />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
