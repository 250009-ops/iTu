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
        <header className="letterhead">
          <p className="project-tag">IELTS Mock Exam ERP</p>
          <h1>{AGREEMENT_META.title}</h1>
          <p className="meta-line">Project: <strong>{AGREEMENT_META.subtitle}</strong></p>
          <p className="meta-line">Place: {AGREEMENT_META.place}</p>
          <p className="meta-line">OT Stamped At: {stampText}</p>
        </header>

        <div className="parties-grid">
          <div className="party-card">
            <p className="party-label">Party A</p>
            <p className="party-name">{AGREEMENT_META.partyA.name}</p>
            <p className="party-role">{AGREEMENT_META.partyA.role}</p>
            <p className="party-sub">{AGREEMENT_META.partyA.subtitle}</p>
          </div>
          <div className="party-card">
            <p className="party-label">Party B</p>
            <p className="party-name">{AGREEMENT_META.partyB.name}</p>
            <p className="party-role">{AGREEMENT_META.partyB.role}</p>
            <p className="party-sub">{AGREEMENT_META.partyB.subtitle}</p>
          </div>
        </div>

        {MAIN_SECTIONS.map((section) => (
          <section key={section.id} className="contract-section">
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
            <h3>Party A — Bosh Director</h3>
            <p className="sig-name">{AGREEMENT_META.partyA.name}</p>
            <p className="sig-role">{AGREEMENT_META.partyA.subtitle}</p>
            <p className="sig-line">Signature: __________________________</p>
            <p className={`stamp ${seStamped ? "on" : ""}`}>SE STAMP APPLIED (DEFAULT)</p>
          </div>
          <div className="sig-box">
            <h3>Party B — CEO</h3>
            <p className="sig-name">{AGREEMENT_META.partyB.name}</p>
            <p className="sig-role">{AGREEMENT_META.partyB.subtitle}</p>
            <p className="sig-line">Signature: __________________________</p>
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
        @import url("https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap");

        .toolbar {
          position: sticky;
          top: 0;
          z-index: 10;
          border-bottom: 1px solid #d1d9e6;
          background: #fff;
          padding: 14px 20px;
          box-shadow: 0 1px 3px rgba(26, 35, 50, 0.06);
        }
        .toolbar-inner {
          max-width: 210mm;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: center;
        }
        .title {
          font-family: "Crimson Pro", Georgia, serif;
          font-weight: 700;
          font-size: 18px;
          color: #1e3a5f;
        }
        .sub { color: #718096; font-size: 12px; margin-top: 2px; }
        .actions { display: flex; gap: 8px; }
        .actions button {
          border: none;
          padding: 9px 14px;
          border-radius: 6px;
          color: #fff;
          font-weight: 600;
          font-size: 13px;
          font-family: "Inter", system-ui, sans-serif;
        }
        .disabled-btn { background: #64748b; cursor: not-allowed; }
        .ot-btn { background: #0f766e; cursor: pointer; }
        .ot-btn:disabled { background: #94a3b8; cursor: not-allowed; }

        .doc {
          max-width: 210mm;
          margin: 20px auto 40px;
          padding: 48px 52px;
          background: #fff;
          color: #1a2332;
          font-family: "Inter", system-ui, sans-serif;
          font-size: 15px;
          line-height: 1.65;
          box-shadow: 0 4px 24px rgba(26, 35, 50, 0.08);
          border: 1px solid #e8edf4;
        }

        .letterhead {
          text-align: center;
          padding-bottom: 28px;
          margin-bottom: 32px;
          border-bottom: 2px solid #1e3a5f;
        }
        .project-tag {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #718096;
          margin-bottom: 10px;
        }
        .letterhead h1 {
          font-family: "Crimson Pro", Georgia, serif;
          font-size: 30px;
          font-weight: 700;
          color: #1e3a5f;
          margin-bottom: 8px;
          line-height: 1.2;
        }
        .meta-line { margin: 3px 0; font-size: 13px; color: #4a5568; }

        .parties-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 32px;
        }
        .party-card {
          border: 1px solid #d1d9e6;
          border-radius: 8px;
          padding: 16px 18px;
          background: #f7f9fc;
        }
        .party-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #718096;
          margin-bottom: 6px;
        }
        .party-name {
          font-family: "Crimson Pro", Georgia, serif;
          font-size: 18px;
          font-weight: 700;
          color: #1e3a5f;
          margin-bottom: 4px;
        }
        .party-role { font-size: 14px; font-weight: 600; }
        .party-sub { font-size: 12px; color: #4a5568; margin-top: 2px; }

        .contract-section { margin-bottom: 28px; }
        h2 {
          font-family: "Crimson Pro", Georgia, serif;
          margin: 0 0 12px;
          font-size: 20px;
          font-weight: 700;
          color: #1e3a5f;
          padding-bottom: 6px;
          border-bottom: 1px solid #e8edf4;
        }
        .contract-p { margin: 8px 0; }
        .contract-ul { margin: 10px 0 10px 22px; }
        .contract-ul li { margin: 5px 0; padding-left: 4px; }
        .contract-ul li::marker { color: #2c5282; }

        .contract-table {
          width: 100%;
          border-collapse: collapse;
          margin: 14px 0;
          font-size: 13.5px;
        }
        .contract-table th,
        .contract-table td {
          border: 1px solid #d1d9e6;
          padding: 10px 12px;
          vertical-align: top;
          text-align: left;
        }
        .contract-table th {
          background: #f7f9fc;
          font-weight: 600;
          color: #1e3a5f;
          font-size: 12px;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }
        .contract-table tbody tr:nth-child(even) { background: #fafbfc; }

        .notice-box {
          margin: 16px 0;
          padding: 16px 18px;
          border-left: 4px solid #2b6cb0;
          border-radius: 0 8px 8px 0;
          background: #f0f7ff;
        }
        .notice-title {
          margin: 0 0 8px;
          font-weight: 700;
          color: #2b6cb0;
          font-size: 13px;
          letter-spacing: 0.02em;
        }

        .sign-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 36px;
          padding-top: 28px;
          border-top: 2px solid #e8edf4;
        }
        .sig-box {
          border: 1px solid #d1d9e6;
          border-radius: 8px;
          padding: 18px;
          background: #f7f9fc;
        }
        .sig-box h3 {
          font-family: "Crimson Pro", Georgia, serif;
          font-size: 15px;
          font-weight: 700;
          color: #1e3a5f;
          margin-bottom: 10px;
        }
        .sig-name {
          font-family: "Crimson Pro", Georgia, serif;
          font-size: 17px;
          font-weight: 700;
          color: #1e3a5f;
          margin-bottom: 4px;
        }
        .sig-role { font-size: 13px; color: #4a5568; margin-bottom: 12px; }
        .sig-line {
          font-size: 12px;
          color: #718096;
          border-bottom: 1px solid #d1d9e6;
          padding-bottom: 20px;
          margin-bottom: 12px;
        }
        .stamp {
          padding: 10px;
          border: 1px dashed #94a3b8;
          text-align: center;
          font-weight: 600;
          font-size: 12px;
          letter-spacing: 0.04em;
          color: #64748b;
          border-radius: 6px;
        }
        .stamp.on {
          border-color: #0f766e;
          border-style: solid;
          color: #0f766e;
          background: #ecfdf5;
        }

        footer {
          margin-top: 28px;
          padding-top: 16px;
          border-top: 1px solid #e8edf4;
          color: #718096;
          font-size: 11px;
          text-align: center;
        }
        .page-break { page-break-before: always; }

        @media print {
          @page { size: A4; margin: 18mm 16mm; }
          .no-print { display: none !important; }
          body { background: #fff; }
          .doc {
            max-width: none;
            margin: 0;
            padding: 0;
            box-shadow: none;
            border: none;
            font-size: 13px;
          }
          .party-card, .sig-box { break-inside: avoid; }
        }

        @media (max-width: 640px) {
          .doc { padding: 28px 20px; margin: 12px; }
          .parties-grid, .sign-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}
