import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useAuth } from "@/lib/auth-context";
import { SearchSelect } from "@/components/search-select";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarDays } from "lucide-react";
import { AccountRefreshButton } from "@/components/account-refresh-button";
import { PeriodBar, EmptyReport, ExportButtons, exportCsv, exportExcel, printReport, fmtMoney, useHospitalName, type Period, type Range } from "@/components/ledger-shell";
import { useListJournalEntries, useListChartOfAccounts, getListChartOfAccountsQueryKey, useListSuppliers, getListSuppliersQueryKey, type JournalEntry } from "@/lib/api";

const VOUCHER_TYPES = ["Goods Received Note", "Purchase Invoice", "Payment Entry", "Journal Entry"];
const selCls = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground";
const lbl = "mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground";

// Older postings were saved before voucher type / party were stored, so infer them.
function voucherTypeOf(e: any): string {
  if (e.voucherType) return e.voucherType;
  const ref = String(e.reference || ""), desc = String(e.description || "");
  if (/^(PMT-|REV-)/.test(ref)) return "Payment Entry";
  if (/^(GRN|EDIT|VOID|UNVOID)/i.test(ref) || /goods received/i.test(desc)) return "Goods Received Note";
  if (/^supplier invoice/i.test(desc)) return "Purchase Invoice";
  return "Journal Entry";
}

export default function GeneralLedgerPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const hospital = useHospitalName();
  const [period, setPeriod] = useState<Period>("");
  const [range, setRange] = useState<Range | null>(null);
  const [account, setAccount] = useState(""); const [partyType, setPartyType] = useState("");
  const [party, setParty] = useState(""); const [voucher, setVoucher] = useState("");

  const { data: accounts } = useListChartOfAccounts({ query: { queryKey: getListChartOfAccountsQueryKey() } });
  const { data: suppliers } = useListSuppliers({ query: { queryKey: getListSuppliersQueryKey() } });
  const { data: entries, isLoading } = useListJournalEntries(range ? { to: range.to } : undefined, { query: { queryKey: ["/api/accounts/journal-entries", range ? { to: range.to } : null], enabled: !!range } as any });

  const acc = useMemo(() => new Map((accounts ?? []).map(a => [a.code, a])), [accounts]);
  const supMap = useMemo(() => new Map((suppliers ?? []).map(s => [s.id, s])), [suppliers]);

  const report = useMemo(() => {
    if (!range) return null;
    type Line = { id: number; date: string; code: string; voucherType: string; reference: string; party: string; partyId: number | null; description: string; debit: number; credit: number };
    const lines: Line[] = [];
    for (const e of (entries ?? []) as (JournalEntry & any)[]) {
      let pid: number | null = e.supplierId ?? null;
      if (!pid) { const m = String(e.description || "").match(/^(?:Payment to|Refund received from) (.+)$/); if (m) pid = (suppliers ?? []).find(s => s.name === m[1])?.id ?? null; }
      const base = { id: e.id, date: e.date, voucherType: voucherTypeOf(e), reference: e.reference, party: pid ? (supMap.get(pid)?.name ?? "") : "", partyId: pid, description: e.description };
      lines.push({ ...base, code: e.debitAccount, debit: Number(e.amount), credit: 0 });
      lines.push({ ...base, code: e.creditAccount, debit: 0, credit: Number(e.amount) });
    }
    const match = (l: Line) => (!account || l.code === account) && (!voucher || l.voucherType === voucher) && (!partyType || !party || String(l.partyId) === party);
    const opening = account ? lines.filter(l => l.code === account && l.date < range.from).reduce((s, l) => s + l.debit - l.credit, 0) : 0;
    const rows = lines.filter(l => l.date >= range.from && l.date <= range.to && match(l)).sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
    let run = opening;
    const out = rows.map(l => { run += l.debit - l.credit; return { ...l, balance: run }; });
    return { opening, rows: out, debit: rows.reduce((s, l) => s + l.debit, 0), credit: rows.reduce((s, l) => s + l.credit, 0), closing: run };
  }, [entries, range, account, voucher, partyType, party, suppliers, supMap]);

  if (!user?.permissions?.viewAccounts) { setLocation("/"); return null; }

  const drcr = (n: number) => `${fmtMoney(Math.abs(n))} ${n >= 0 ? "Dr" : "Cr"}`;
  const accLabel = (code: string) => acc.get(code) ? `${code} — ${acc.get(code)!.name}` : code;
  const headers = ["Date", "Account", "Voucher Type", "Voucher No", "Party", "Particulars", "Debit (KES)", "Credit (KES)", ...(account ? ["Balance"] : [])];
  const exportRows = () => report ? [
    ...(account ? [[range!.from, accLabel(account), "", "", "", "Opening Balance", "", "", drcr(report.opening)]] : []),
    ...report.rows.map(r => [r.date, accLabel(r.code), r.voucherType, r.reference, r.party, r.description, r.debit || "", r.credit || "", ...(account ? [drcr(r.balance)] : [])]),
    ["", "", "", "", "", "Total", report.debit, report.credit, ...(account ? [drcr(report.closing)] : [])],
  ] : [];
  const fname = range ? `general-ledger_${range.from}_to_${range.to}` : "general-ledger";
  const sub = range ? `${hospital} · ${range.from} to ${range.to}` : hospital;

  return (
    <Layout>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-xl font-bold">General Ledger</h1><p className="text-xs uppercase text-blue-600">{hospital}</p></div>
        <div className="flex items-center gap-2"><AccountRefreshButton />
          <ExportButtons disabled={!report} onCsv={() => exportCsv(fname, headers, exportRows())} onExcel={() => exportExcel(fname, `General Ledger — ${sub}`, headers, exportRows())} onPrint={() => printReport("General Ledger", sub, headers, exportRows().map(r => r.map(c => typeof c === "number" ? fmtMoney(c) : c)))} /></div>
      </div>
      <PeriodBar period={period} setPeriod={setPeriod} range={range} setRange={setRange} />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><label className={lbl}>Company</label><div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">{hospital}</div></div>
          <div><label className={lbl}>Account</label><SearchSelect placeholder="All accounts" value={account} onChange={setAccount} options={(accounts ?? []).map(a => ({ value: a.code, label: `${a.code} — ${a.name}`, hint: a.type }))} /></div>
          <div><label className={lbl}>Party Type</label><select className={selCls} value={partyType} onChange={e => { setPartyType(e.target.value); setParty(""); }}><option value="">All party types</option><option value="Supplier">Supplier</option></select></div>
          <div><label className={lbl}>Party</label><SearchSelect disabled={!partyType} placeholder={partyType ? "Search supplier..." : "— select Party Type first —"} value={party} onChange={setParty} options={(suppliers ?? []).map(s => ({ value: String(s.id), label: s.name }))} /></div>
          <div><label className={lbl}>Voucher Type</label><select className={selCls} value={voucher} onChange={e => setVoucher(e.target.value)}><option value="">All voucher types</option>{VOUCHER_TYPES.map(v => <option key={v}>{v}</option>)}</select></div>
          <div className="flex items-end"><Button variant="outline" className="w-full" onClick={() => { setAccount(""); setPartyType(""); setParty(""); setVoucher(""); }}>Clear Filters</Button></div>
        </div>
      </Card>

      {!range ? <EmptyReport title="Select a date range to run the report" name="General Ledger" /> : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Account</TableHead><TableHead>Voucher Type</TableHead><TableHead>Voucher No</TableHead><TableHead>Party</TableHead><TableHead>Particulars</TableHead>
              <TableHead className="text-right">Debit (KES)</TableHead><TableHead className="text-right">Credit (KES)</TableHead>{account && <TableHead className="text-right">Balance</TableHead>}
            </TableRow></TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 4 }).map((_, i) => <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-6 w-full" /></TableCell></TableRow>)}
              {!isLoading && report && account && <TableRow className="bg-muted/40 font-medium"><TableCell>{range.from}</TableCell><TableCell colSpan={5}>Opening Balance — {accLabel(account)}</TableCell><TableCell /><TableCell /><TableCell className="text-right font-mono">{drcr(report.opening)}</TableCell></TableRow>}
              {!isLoading && report && report.rows.length === 0 && <TableRow><TableCell colSpan={9} className="py-12 text-center text-muted-foreground"><CalendarDays className="mx-auto mb-2 h-7 w-7 opacity-40" />No ledger entries for the selected period and filters.</TableCell></TableRow>}
              {report?.rows.map((r, i) => (
                <TableRow key={`${r.id}-${i}`}>
                  <TableCell className="whitespace-nowrap">{r.date}</TableCell><TableCell>{accLabel(r.code)}</TableCell>
                  <TableCell className="whitespace-nowrap">{r.voucherType}</TableCell><TableCell>{r.reference}</TableCell><TableCell>{r.party || "—"}</TableCell><TableCell className="max-w-xs truncate" title={r.description}>{r.description}</TableCell>
                  <TableCell className="text-right font-mono">{r.debit ? fmtMoney(r.debit) : ""}</TableCell><TableCell className="text-right font-mono">{r.credit ? fmtMoney(r.credit) : ""}</TableCell>
                  {account && <TableCell className="text-right font-mono">{drcr(r.balance)}</TableCell>}
                </TableRow>
              ))}
              {report && report.rows.length > 0 && <TableRow className="border-t-2 bg-muted/40 font-semibold"><TableCell colSpan={6}>Total</TableCell><TableCell className="text-right font-mono">{fmtMoney(report.debit)}</TableCell><TableCell className="text-right font-mono">{fmtMoney(report.credit)}</TableCell>{account && <TableCell className="text-right font-mono">{drcr(report.closing)}</TableCell>}</TableRow>}
            </TableBody>
          </Table>
        </Card>
      )}
    </Layout>
  );
}
