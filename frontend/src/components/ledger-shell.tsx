import { useEffect, useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter } from "date-fns";
import { Download, Printer, CalendarDays } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/button";

export type Period = "month" | "last" | "quarter" | "fy" | "custom" | "";
export type Range = { from: string; to: string };
const d = (x: Date) => format(x, "yyyy-MM-dd");

export function periodRange(p: Exclude<Period, "custom" | "">): Range {
  const now = new Date();
  if (p === "month") return { from: d(startOfMonth(now)), to: d(endOfMonth(now)) };
  if (p === "last") { const l = subMonths(now, 1); return { from: d(startOfMonth(l)), to: d(endOfMonth(l)) }; }
  if (p === "quarter") return { from: d(startOfQuarter(now)), to: d(endOfQuarter(now)) };
  // Kenyan public-sector financial year: 1 July – 30 June
  const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return { from: `${startYear}-07-01`, to: `${startYear + 1}-06-30` };
}

export function useHospitalName() {
  const [name, setName] = useState("Mukurweini Hospital Stores");
  useEffect(() => {
    fetch(`${API_BASE}/api/settings/public`).then(r => r.json()).then(s => { if (s?.hospitalName) setName(s.hospitalName); }).catch(() => {});
  }, []);
  return name;
}

const dateCls = "h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground [color-scheme:light] dark:[color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-ring";
const PERIODS: [Exclude<Period, "custom" | "">, string][] = [["month", "This Month"], ["last", "Last Month"], ["quarter", "This Quarter"], ["fy", "This FY"]];

/** Period pills + From/To/Apply, as in the ERP ledger screens. */
export function PeriodBar({ period, setPeriod, range, setRange }: { period: Period; setPeriod: (p: Period) => void; range: Range | null; setRange: (r: Range | null) => void }) {
  const [from, setFrom] = useState(range?.from ?? ""); const [to, setTo] = useState(range?.to ?? "");
  useEffect(() => { setFrom(range?.from ?? ""); setTo(range?.to ?? ""); }, [range?.from, range?.to]);
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {PERIODS.map(([k, label]) => (
          <button key={k} onClick={() => { setPeriod(k); setRange(periodRange(k)); }}
            className={`rounded-full border px-3 py-1 text-xs ${period === k ? "border-purple-600 bg-purple-600 text-white" : "bg-background hover:bg-accent"}`}>{label}</button>
        ))}
        <button onClick={() => setPeriod("custom")} className={`rounded-full border px-3 py-1 text-xs ${period === "custom" ? "border-purple-600 bg-purple-600 text-white" : "bg-background hover:bg-accent"}`}>Custom</button>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2 text-xs">
        <span className="text-muted-foreground">From</span><input type="date" className={dateCls} value={from} onChange={e => setFrom(e.target.value)} />
        <span className="text-muted-foreground">To</span><input type="date" className={dateCls} value={to} onChange={e => setTo(e.target.value)} />
        <Button size="sm" className="h-8 bg-blue-600 text-white hover:bg-blue-700" onClick={() => { if (from && to && from <= to) { setPeriod("custom"); setRange({ from, to }); } }}>Apply</Button>
      </div>
    </div>
  );
}

export function EmptyReport({ icon, title, name }: { icon?: React.ReactNode; title: string; name: string }) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950">{icon ?? <CalendarDays className="h-6 w-6" />}</div>
      <div className="font-semibold">{title}</div>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">Use the date picker above to choose a <b>From</b> and <b>To</b> date, then the {name} will load automatically.</p>
    </div>
  );
}

type Cell = string | number | null | undefined;
const esc = (v: Cell) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function save(blob: Blob, filename: string) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export function exportCsv(filename: string, headers: string[], rows: Cell[][]) {
  const q = (v: Cell) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  save(new Blob(["\ufeff" + [headers, ...rows].map(r => r.map(q).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }), `${filename}.csv`);
}
const tableHtml = (headers: string[], rows: Cell[][]) =>
  `<table border="1" cellspacing="0" cellpadding="4"><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td${typeof c === "number" ? ' align="right"' : ""}>${esc(typeof c === "number" ? c.toFixed(2) : c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
/** Excel opens an HTML table saved as .xls — no extra library needed. */
export function exportExcel(filename: string, title: string, headers: string[], rows: Cell[][]) {
  const html = `<html><head><meta charset="utf-8"></head><body><h3>${esc(title)}</h3>${tableHtml(headers, rows)}</body></html>`;
  save(new Blob([html], { type: "application/vnd.ms-excel" }), `${filename}.xls`);
}
export function printReport(title: string, subtitle: string, headers: string[], rows: Cell[][]) {
  const w = window.open("", "_blank"); if (!w) return;
  w.document.write(`<html><head><title>${esc(title)}</title><style>body{font-family:Arial,sans-serif;font-size:11px;padding:16px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:3px 5px}th{background:#eee}h2,p{margin:2px 0}</style></head><body><h2>${esc(title)}</h2><p>${esc(subtitle)}</p><br/>${tableHtml(headers, rows)}</body></html>`);
  w.document.close(); w.focus(); w.print();
}

export function ExportButtons({ onCsv, onExcel, onPrint, disabled }: { onCsv: () => void; onExcel: () => void; onPrint: () => void; disabled?: boolean }) {
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" disabled={disabled} onClick={onCsv} className="h-8 gap-1 text-xs"><Download className="h-3 w-3" />CSV</Button>
      <Button size="sm" variant="outline" disabled={disabled} onClick={onExcel} className="h-8 gap-1 text-xs"><Download className="h-3 w-3" />Excel</Button>
      <Button size="sm" variant="outline" disabled={disabled} onClick={onPrint} className="h-8 gap-1 text-xs"><Printer className="h-3 w-3" />Print</Button>
    </div>
  );
}
export const fmtMoney = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
