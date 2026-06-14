type Transaction = {
  date: string;
  time: string;
  label: string;
  detail: string;
  reference: string;
  status: string;
  amount: number;
};

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

/** Download the teacher's payout/transaction history as a CSV file. */
export function exportEarningsCsv(transactions: Transaction[]) {
  const header = [
    "Date",
    "Time",
    "Type",
    "Detail",
    "Reference",
    "Status",
    "Amount (USD)",
  ];
  const rows = transactions.map((t) =>
    [
      t.date,
      t.time,
      t.label,
      t.detail,
      t.reference,
      t.status,
      t.amount.toFixed(2),
    ]
      .map(csvCell)
      .join(","),
  );
  const csv = [header.join(","), ...rows].join("\n");
  const stamp = new Date().toISOString().slice(0, 10);
  triggerDownload(csv, `earnings-${stamp}.csv`, "text/csv;charset=utf-8;");
}
