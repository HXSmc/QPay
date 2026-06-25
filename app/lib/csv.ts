import type { Transaction } from "./types";

export function transactionsToCsv(rows: Transaction[]): string {
  const header = ["Time", "Table", "Amount", "Method"];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [r.time, `#${r.table}`, r.amount, r.method].map(esc).join(","),
  );
  return [header.map(esc).join(","), ...lines].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
