"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AGREEMENT_META,
  EXHIBIT_A_SECTIONS,
  EXHIBIT_B_SECTIONS,
  MAIN_SECTIONS,
  type ContractBlock,
} from "@/lib/legal/co-founder-agreement-content";

const OT_STAMP_KEY = "itestu_ot_stamp_locked_v1";
const OT_TIME_KEY = "itestu_ot_stamp_time_v1";

function Block({ block }: { block: ContractBlock }) {
  if (block.type === "paragraph") return <p className="contract-p">{block.text}</p>;
  if (block.type === "list") {
    return (
      <ul className="contract-ul">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  if (block.type === "notice") {
    return (
      <div className="notice-box">
        <p className="notice-title">{block.title}</p>
        <ul className="contract-ul">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <table className="contract-table">
      <thead>
        <tr>
          {block.headers.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {block.rows.map((row) => (
          <tr key={row.join("|")}>
            {row.map((cell) => (
              <td key={cell}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function PrintableContract() {
  const [seStamped] = useState(true);
  const [otStamped, setOtStamped] = useState(false);
  const [stampTime, setStampTime] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const locked = window.localStorage.getItem(OT_STAMP_KEY) === "1";
      const time = window.localStorage.getItem(OT_TIME_KEY);
      if (locked) {
        setOtStamped(true);
      }
      if (time) {
        setStampTime(time);
      }
    } catch {
      // ignore localStorage read errors
    } finally {
      setLoaded(true);
    }
  }, []);

  const onStampOt = () => {
    if (otStamped) return;
    const now = new Date().toISOString();
    setOtStamped(true);
    setStampTime(now);
    try {
      window.localStorage.setItem(OT_STAMP_KEY, "1");
      window.localStorage.setItem(OT_TIME_KEY, now);
    } catch {
      // ignore localStorage write errors
    }
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const stampText = useMemo(() => {
    if (!stampTime) return "Not stamped yet";
    return new Date(stampTime).toLocaleString();
  }, [stampTime]);

  const canClickOt = loaded && !otStamped;

  return (
    <>
      <div className="toolbar no-print">
        <div className="toolbar-inner">
          <div>
            <p className="title">Co-Founder Operating Agreement</p>
            <p className="sub">SE stamp is pre-applied. OT stamp is one-time and auto-downloads PDF.</p>
          </div>
          <div className="actions">
            <button type="button" disabled className="disabled-btn">
              SE Stamp Applied
            </button>
            <button type="button" onClick={onStampOt} disabled={!canClickOt} className="ot-btn">
              {otStamped ? "OT Stamp Locked" : "Apply OT Stamp"}
            </button>
          </div>
        </div>
      </div>

      <article className="doc">
        <header className="cover">
          <h1>{AGREEMENT_META.title}</h1>
          <p>{AGREEMENT_META.subtitle}</p>
          <p>Place: {AGREEMENT_META.place}</p>
          <p>OT Stamped At: {stampText}</p>
        </header>

        {MAIN_SECTIONS.map((section) => (
          <section key={section.id}>
            <h2>{section.title}</h2>
            {section.blocks.map((block, idx) => (
              <Block key={`${section.id}-${idx}`} block={block} />
            ))}
          </section>
        ))}

        <section className="page-break">
          {EXHIBIT_A_SECTIONS.map((section) => (
            <div key={section.id}>
              <h2>{section.title}</h2>
              {section.blocks.map((block, idx) => (
                <Block key={`${section.id}-${idx}`} block={block} />
              ))}
            </div>
          ))}
        </section>

        <section>
          {EXHIBIT_B_SECTIONS.map((section) => (
            <div key={section.id}>
              <h2>{section.title}</h2>
              {section.blocks.map((block, idx) => (
                <Block key={`${section.id}-${idx}`} block={block} />
              ))}
            </div>
          ))}
        </section>

        <section className="sign-grid">
          <div className="sig-box">
            <h3>Founder Side</h3>
            <p>Name: {AGREEMENT_META.partyA.name}</p>
            <p className={`stamp ${seStamped ? "on" : ""}`}>SE STAMP APPLIED (DEFAULT)</p>
          </div>
          <div className="sig-box">
            <h3>Co-Founder Side</h3>
            <p>Name: {AGREEMENT_META.partyB.name}</p>
            <p className={`stamp ${otStamped ? "on" : ""}`}>
              {otStamped ? "OT STAMP APPLIED (LOCKED)" : "OT STAMP PENDING"}
            </p>
          </div>
        </section>

        <footer>
          <p>{AGREEMENT_META.disclaimer}</p>
        </footer>
      </article>

      <style jsx global>{`
        .toolbar { position: sticky; top: 0; z-index: 10; border-bottom: 1px solid #ddd; background: #fff; padding: 12px; }
        .toolbar-inner { max-width: 210mm; margin: 0 auto; display: flex; justify-content: space-between; gap: 10px; align-items: center; }
        .title { font-weight: 700; color: #1b2a4a; }
        .sub { color: #64748b; font-size: 12px; margin-top: 2px; }
        .actions { display: flex; gap: 8px; }
        .actions button { border: none; padding: 8px 10px; border-radius: 6px; color: #fff; font-weight: 600; }
        .disabled-btn { background: #64748b; cursor: not-allowed; }
        .ot-btn { background: #0f766e; cursor: pointer; }
        .ot-btn:disabled { background: #64748b; cursor: not-allowed; }
        .doc { max-width: 210mm; margin: 0 auto; padding: 20px; background: #fff; color: #0f172a; }
        .cover h1 { font-size: 24px; margin-bottom: 6px; }
        .cover p { margin: 2px 0; }
        h2 { margin: 18px 0 8px; font-size: 18px; }
        .contract-p { margin: 8px 0; }
        .contract-ul { margin: 8px 0 8px 18px; }
        .contract-table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 14px; }
        .contract-table th, .contract-table td { border: 1px solid #cbd5e1; padding: 6px; vertical-align: top; }
        .contract-table th { background: #f1f5f9; }
        .notice-box { margin: 12px 0; padding: 12px 14px; border: 2px solid #0f766e; border-radius: 8px; background: #ecfeff; }
        .notice-title { margin: 0 0 6px; font-weight: 700; color: #0f766e; }
        .sign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 18px; }
        .sig-box { border: 1px solid #ddd; border-radius: 8px; padding: 10px; }
        .stamp { margin-top: 8px; padding: 8px; border: 1px dashed #999; text-align: center; font-weight: 600; color: #666; }
        .stamp.on { border-color: #0f766e; color: #0f766e; background: #ecfeff; }
        footer { margin-top: 18px; color: #64748b; font-size: 12px; }
        .page-break { page-break-before: always; }
        @media print {
          @page { size: A4; margin: 16mm; }
          .no-print { display: none !important; }
          .doc { max-width: none; margin: 0; padding: 0; }
        }
      `}</style>
    </>
  );
}
