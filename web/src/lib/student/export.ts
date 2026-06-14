import type { AttemptRow, StudentResultsData } from "@/lib/api/mappers/student";

function triggerDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number | null | undefined) {
  if (value == null) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Download the full attempt history as a CSV file. */
export function exportAttemptsCsv(attempts: AttemptRow[]) {
  const header = [
    "Attempt",
    "Date",
    "Listening",
    "Reading",
    "Writing",
    "Speaking",
    "Overall",
  ];
  const rows = attempts.map((a) =>
    [
      a.id,
      a.date,
      a.listening,
      a.reading,
      a.writing,
      a.speaking,
      a.overall,
    ]
      .map(csvCell)
      .join(","),
  );
  const csv = [header.join(","), ...rows].join("\n");
  triggerDownload(
    csv,
    `ielts-attempts-${new Date().toISOString().slice(0, 10)}.csv`,
    "text/csv;charset=utf-8",
  );
}

/** Open the browser print dialog so the user can save the report as PDF. */
export function printResultsReport() {
  window.print();
}

/** Download a simple text invoice for a purchased package. */
export function exportInvoice(invoice: {
  name: string;
  purchased: string;
  orderCode: string | null;
}) {
  const lines = [
    "IELTS MOCK — INVOICE",
    "====================",
    "",
    `Order:     ${invoice.orderCode ?? "—"}`,
    `Package:   ${invoice.name}`,
    `Purchased: ${invoice.purchased}`,
    "",
    "Thank you for your purchase.",
  ];
  triggerDownload(
    lines.join("\n"),
    `ielts-invoice-${invoice.orderCode ?? "order"}.txt`,
    "text/plain;charset=utf-8",
  );
}

/** Download a single result as a plain-text band report. */
export function exportResultReport(data: StudentResultsData) {
  const lines: string[] = [
    "IELTS MOCK — BAND REPORT",
    "========================",
    "",
    `Mock ID:     ${data.mockId}`,
    `Date:        ${data.dateLabel}`,
    `Exam type:   ${data.examType}`,
    `Overall:     ${data.overallBand} (${data.bandLabel})`,
    data.targetBand != null ? `Target band: ${data.targetBand}` : "",
    "",
    "Module bands",
    "------------",
    ...data.skills.map((s) => `${s.name.padEnd(12)} ${s.band}`),
    "",
  ];
  triggerDownload(
    lines.filter(Boolean).join("\n"),
    `ielts-report-${data.mockId}.txt`,
    "text/plain;charset=utf-8",
  );
}
