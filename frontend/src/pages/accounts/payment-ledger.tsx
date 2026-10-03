import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useAuth } from "@/lib/auth-context";
import { SearchSelect } from "@/components/search-select";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard } from "lucide-react";
import { AccountRefreshButton } from "@/components/account-refresh-button";
import { PeriodBar, EmptyReport, ExportButtons, exportCsv, exportExcel, printReport, fmtMoney, useHospitalName, type Period, type Range } from "@/components/ledger-shell";
import { useListPayments, getListPaymentsQueryKey, useListSupplierInvoices, getListSupplierInvoicesQueryKey, useListSuppliers, getListSuppliersQueryKey } from "@/lib/api";

const selCls = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground";
const lbl = "mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground";

export default function PaymentLedgerPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const hospital = useHospitalName();
  const [period, setPeriod] = useState<Period>("");
  const [range, setRange] = useState<Range | null>(null);
  const [partyType, setPartyType] = useState(""); const [party, setParty] = useState(""); const [against, setAgainst] = useState("");

  const { data: payments, isLoading } = useListPayments({}, { query: { queryKey: getListPaymentsQueryKey({}) } });
  const { data: invoices } = useListSupplierInvoices({ query: { queryKey: getListSupplierInvoicesQueryKey() } });
  const { data: suppliers } = useListSuppliers({ query: { queryKey: getListSuppliersQueryKey() } });

  const report = useMemo(() => {
    if (!range) return null;
    const inv = new Map((invoices ?? []).map(i => [i.id, i]));
    const rows: { date: string; no: string; supplier: string; mode: string; ref: string; type: string; against: string; amount: number }[] = [];
    let total = 0;
    for (const p of payments ?? []) {
      if ((p.status ?? "submitted") !== "submitted" || p.date < range.from || p.date > range.to) continue;
      if (partyType && party && String(p.supplierId) !== party) continue;
      const allocs = (p.allocations?.length ? p.allocations : p.supplierInvoiceId ? [{ invoiceId: p.supplierInvoiceId, amount: p.amount }] : []);
      const base = { date: p.date, no: `PMT-${p.id}`, supplier: p.supplier?.name ?? "—", mode: p.modeOfPayment ?? p.method, ref: p.reference ?? "", type: p.paymentType === "receive" ? "Receive" : "Pay" };
      const lines = allocs.map(a => ({ ...base, against: inv.get(a.invoiceId)?.invoiceNo ?? `#${a.invoiceId}`, amount: Number(a.amount) }));
      const rest = Number((p.amount - allocs.reduce((s, a) => s + Number(a.amount), 0)).toFixed(2));
      if (rest > 0.004) lines.push({ ...base, against: p.paymentType === "receive" ? "Supplier refund" : "Advance / Unallocated", amount: rest });
      const kept = against ? lines.filter(l => l.against.toLowerCase().includes(against.toLowerCase())) : lines;
      if (!kept.length) continue;
      rows.push(...kept);
      total += kept.reduce((s, l) => s + (p.paymentType === "receive" ? -l.amount : l.amount), 0);
    }
    rows.sort((a, b) => a.date.localeCompare(b.date) || a.no.localeCompare(b.no));
    return { rows, total };
  }, [payments, invoices, range, partyType, party, against]);

  if (!user?.permissions?.viewAccounts) { setLocation("/"); return null; }

  const headers = ["Date", "Payment No", "Supplier", "Mode of Payment", "Reference No", "Type", "Against Voucher", "Amount (KES)"];
  const exportRows = () => report ? [...report.rows.map(r => [r.date, r.no, r.supplier, r.mode, r.ref, r.type, r.against, r.type === "Receive" ? -r.amount : r.amount]), ["", "", "", "", "", "", "Net paid", report.total]] : [];
  const fname = range ? `payment-ledger_${range.from}_to_${range.to}` : "payment-ledger";
  const sub = range ? `${hospital} · ${range.from} to ${range.to}` : hospital;

  return (
    <Layout>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-xl font-bold">Payment Ledger</h1><p className="text-xs uppercase text-blue-600">{hospital}</p></div>
        <div className="flex items-center gap-2"><AccountRefreshButton />
          <ExportButtons disabled={!report} onCsv={() => exportCsv(fname, headers, exportRows())} onExcel={() => exportExcel(fname, `Payment Ledger — ${sub}`, headers, exportRows())} onPrint={() => printReport("Payment Ledger", sub, headers, exportRows().map(r => r.map(c => typeof c === "number" ? fmtMoney(c) : c)))} /></div>
      </div>
      <PeriodBar period={period} setPeriod={setPeriod} range={range} setRange={setRange} />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><label className={lbl}>Company</label><div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">{hospital}</div></div>
          <div><label className={lbl}>Party Type</label><select className={selCls} value={partyType} onChange={e => { setPartyType(e.target.value); setParty(""); }}><option value="">All party types</option><option value="Supplier">Supplier</option></select></div>
          <div><label className={lbl}>Party</label><SearchSelect disabled={!partyType} placeholder={partyType ? "Search supplier..." : "— select Party Type first —"} value={party} onChange={setParty} options={(suppliers ?? []).map(s => ({ value: String(s.id), label: s.name }))} /></div>
          <div><label className={lbl}>Against Voucher</label><Input placeholder="Voucher number..." value={against} onChange={e => setAgainst(e.target.value)} /></div>
          <div className="sm:col-span-2 lg:col-span-4"><Button variant="outline" className="w-full sm:w-64" onClick={() => { setPartyType(""); setParty(""); setAgainst(""); }}>Clear Filters</Button></div>
        </div>
      </Card>

      {!range ? <EmptyReport icon={<CreditCard className="h-6 w-6" />} title="Select a date range to run the report" name="Payment Ledger" /> : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>{headers.map((h, i) => <TableHead key={h} className={i === 7 ? "text-right" : ""}>{h}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 3 }).map((_, i) => <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-6 w-full" /></TableCell></TableRow>)}
              {!isLoading && report?.rows.length === 0 && <TableRow><TableCell colSpan={8} className="py-12 text-center text-muted-foreground">No submitted payments for the selected period and filters.</TableCell></TableRow>}
              {report?.rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="whitespace-nowrap">{r.date}</TableCell><TableCell>{r.no}</TableCell><TableCell className="font-medium">{r.supplier}</TableCell>
                  <TableCell>{r.mode}</TableCell><TableCell>{r.ref || "—"}</TableCell><TableCell>{r.type}</TableCell><TableCell>{r.against}</TableCell>
                  <TableCell className="text-right font-mono">{r.type === "Receive" ? "-" : ""}{fmtMoney(r.amount)}</TableCell>
                </TableRow>
              ))}
              {report && report.rows.length > 0 && <TableRow className="border-t-2 bg-muted/40 font-semibold"><TableCell colSpan={7}>Net paid</TableCell><TableCell className="text-right font-mono">{fmtMoney(report.total)}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>
      )}
    </Layout>
  );
}
