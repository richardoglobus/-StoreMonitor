import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Layout } from "@/components/layout";
import { useAuth } from "@/lib/auth-context";
import { SearchSelect } from "@/components/search-select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreatePayment, getListPaymentsQueryKey,
  useListSuppliers, getListSuppliersQueryKey,
  useListSupplierInvoices, getListSupplierInvoicesQueryKey,
  useListChartOfAccounts, getListChartOfAccountsQueryKey,
  useListModesOfPayment,
} from "@/lib/api";

const dateCls = "w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground [color-scheme:light] dark:[color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-ring";
const lbl = "mb-1 block text-xs font-medium text-muted-foreground";
const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PaymentEntryFormPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const [type, setType] = useState<"pay" | "receive">("pay");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [supplierId, setSupplierId] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [payableAccount, setPayableAccount] = useState("2000");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("");
  const [reference, setReference] = useState("");
  const [referenceDate, setReferenceDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [alloc, setAlloc] = useState<Record<number, string>>({});
  const [loadedInvoices, setLoadedInvoices] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: suppliers } = useListSuppliers({ query: { queryKey: getListSuppliersQueryKey() } });
  const { data: invoices } = useListSupplierInvoices({ query: { queryKey: getListSupplierInvoicesQueryKey() } });
  const { data: accounts } = useListChartOfAccounts({ query: { queryKey: getListChartOfAccountsQueryKey() } });
  const { data: modes } = useListModesOfPayment();
  const create = useCreatePayment();

  const enabledModes = (modes ?? []).filter(m => m.enabled);
  const supplier = (suppliers ?? []).find(s => String(s.id) === supplierId);
  const accountOpts = (types: string[]) => {
    const list = (accounts ?? []).filter(a => types.includes(a.type));
    return (list.length ? list : accounts ?? []).map(a => ({ value: a.code, label: `${a.code} — ${a.name}`, hint: a.type }));
  };

  // Mode of payment decides the default bank / cash account.
  useEffect(() => {
    const m = enabledModes.find(x => x.name === mode);
    if (m) setBankAccount(m.accountCode);
  }, [mode, modes]);

  // Changing supplier or type clears loaded invoice references.
  useEffect(() => { setLoadedInvoices(false); setAlloc({}); }, [supplierId, type]);

  const outstanding = useMemo(() =>
    (invoices ?? [])
      .filter(i => String(i.supplierId) === supplierId && Number(i.amount) - Number(i.paidAmount || 0) > 0.004)
      .sort((a, b) => (a.dueDate || a.date).localeCompare(b.dueDate || b.date)),
    [invoices, supplierId]);

  const balanceOf = (i: any) => Number(i.amount) - Number(i.paidAmount || 0);
  const allocated = Object.values(alloc).reduce((s, v) => s + (Number(v) || 0), 0);
  const paid = Number(amount) || 0;

  const autoAllocate = (total: number) => {
    let left = total; const next: Record<number, string> = {};
    for (const i of outstanding) { const a = Math.min(left, balanceOf(i)); if (a > 0) next[i.id] = String(Number(a.toFixed(2))); left -= a; if (left <= 0) break; }
    setAlloc(next);
  };
  const loadInvoices = () => {
    if (!supplierId) { toast.error("Select a supplier first"); return; }
    setLoadedInvoices(true);
    if (paid > 0) autoAllocate(paid);
  };

  const save = (status: "draft" | "submitted") => {
    if (!supplierId) return toast.error("Select a supplier");
    if (!bankAccount) return toast.error(type === "pay" ? "Select the Paid From account" : "Select the Received In account");
    if (!payableAccount) return toast.error("Select the payable account");
    if (!(paid > 0)) return toast.error("Enter a valid amount");
    if (!mode) return toast.error("Select a mode of payment");
    if (type === "pay" && allocated > paid + 0.005) return toast.error("Allocated amount is more than the paid amount");
    setBusy(true);
    create.mutate({
      data: {
        paymentType: type, status, date, supplierId: Number(supplierId), amount: paid, modeOfPayment: mode,
        bankAccount, payableAccount, reference, referenceDate: referenceDate || null, remarks,
        allocations: type === "pay" ? Object.entries(alloc).filter(([, v]) => Number(v) > 0).map(([id, v]) => ({ invoiceId: Number(id), amount: Number(v) })) : [],
      },
    }, {
      onSuccess: () => {
        toast.success(status === "draft" ? "Draft saved" : "Payment submitted");
        qc.invalidateQueries({ queryKey: getListPaymentsQueryKey({}) });
        qc.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
        qc.invalidateQueries({ queryKey: getListSupplierInvoicesQueryKey() });
        qc.invalidateQueries({ queryKey: getListChartOfAccountsQueryKey() });
        setLocation("/accounts/payments");
      },
      onError: (e: any) => toast.error(e?.error || "Could not save payment"),
      onSettled: () => setBusy(false),
    });
  };

  if (!user?.permissions?.manageAccounts) { setLocation("/accounts/payments"); return null; }

  const Actions = () => (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => setLocation("/accounts/payments")}>Cancel</Button>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => save("draft")}>Save Draft</Button>
      <Button size="sm" disabled={busy} className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => save("submitted")}>{busy ? "Saving..." : "Submit"}</Button>
    </div>
  );
  const isPay = type === "pay";

  return (
    <Layout>
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground"><Link href="/accounts/payments" className="hover:underline">Payment Entries</Link> / New</div>
            <h1 className="text-2xl font-bold">New Payment Entry</h1>
            <p className="text-xs text-muted-foreground">Payment Type: <span className="font-medium text-emerald-600">{isPay ? "Pay" : "Receive"}</span></p>
          </div>
          <Actions />
        </div>

        <Card className="p-4">
          <div className="text-xs font-medium text-muted-foreground mb-2">Payment Type</div>
          <div className="inline-flex rounded-md border bg-muted/40 p-1 w-full max-w-xs">
            {(["receive", "pay"] as const).map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`flex-1 rounded px-3 py-1.5 text-sm transition ${type === t ? "bg-background border border-amber-400 font-medium shadow-sm" : "text-muted-foreground"}`}>
                {t === "receive" ? "← Receive" : "Pay →"}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {isPay ? <>Pay: record outgoing payment to a <b>supplier</b> against outstanding purchase invoices.</> : <>Receive: record money coming back from a <b>supplier</b> (refund / returned advance).</>}
          </p>
        </Card>

        <Card className="p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={lbl}>Party Type</label><Input value="Supplier" disabled /></div>
            <div><label className={lbl}>Posting Date <span className="text-red-500">*</span></label><input type="date" className={dateCls} value={date} onChange={e => setDate(e.target.value)} /></div>

            <div>
              <label className={lbl}>Supplier <span className="text-red-500">*</span></label>
              <SearchSelect placeholder="Search supplier name..." value={supplierId} onChange={setSupplierId}
                options={(suppliers ?? []).map(s => ({ value: String(s.id), label: s.name, hint: `owed ${money(Number(s.balance || 0))}` }))} />
            </div>
            <div>
              <label className={lbl}>{isPay ? "Paid From (Bank / Cash)" : "Received In (Bank / Cash)"} <span className="text-red-500">*</span></label>
              <SearchSelect placeholder="Search bank or cash account..." value={bankAccount} onChange={setBankAccount} options={accountOpts(["Asset"])} />
            </div>

            <div>
              <label className={lbl}>{isPay ? "Paid To (Payable)" : "Received From (Payable)"} <span className="text-red-500">*</span></label>
              <SearchSelect placeholder="Search payable account..." value={payableAccount} onChange={setPayableAccount} options={accountOpts(["Liability"])} />
            </div>
            <div>
              <label className={lbl}>Currency</label>
              <select className={dateCls} disabled><option>KES (Base)</option></select>
            </div>

            <div>
              <label className={lbl}>{isPay ? "Paid Amount (KES)" : "Received Amount (KES)"} <span className="text-red-500">*</span></label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={amount}
                onChange={e => { setAmount(e.target.value); if (loadedInvoices && isPay) autoAllocate(Number(e.target.value) || 0); }} />
            </div>
            <div>
              <label className={lbl}>Mode of Payment <span className="text-red-500">*</span></label>
              <select className={dateCls} value={mode} onChange={e => setMode(e.target.value)}>
                <option value="">— Select mode —</option>
                {enabledModes.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </div>

            <div><label className={lbl}>Reference No</label><Input placeholder="Cheque / M-Pesa / Bank ref" value={reference} onChange={e => setReference(e.target.value)} /></div>
            <div><label className={lbl}>Reference Date</label><input type="date" className={dateCls} value={referenceDate} onChange={e => setReferenceDate(e.target.value)} /></div>

            <div className="sm:col-span-2"><label className={lbl}>Remarks</label><Textarea rows={3} placeholder="Optional remarks..." value={remarks} onChange={e => setRemarks(e.target.value)} /></div>
          </div>
        </Card>

        {isPay && (
          <Card className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-sm">Invoice References</div>
                <p className="text-xs text-muted-foreground">Outstanding purchase invoices for this supplier</p>
              </div>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={loadInvoices}>Get Outstanding Invoices</Button>
            </div>
            {!loadedInvoices ? (
              <div className="mt-3 rounded-md border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
                {supplier ? <>Click <b>Get Outstanding Invoices</b> to load references.</> : <>Select a supplier and click <b>Get Outstanding Invoices</b> to load references.</>}
              </div>
            ) : outstanding.length === 0 ? (
              <div className="mt-3 rounded-md border-2 border-dashed p-8 text-center text-sm text-muted-foreground">No outstanding invoices for {supplier?.name}. The payment will be recorded as an advance.</div>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground"><tr>
                    <th className="p-2 text-left">Invoice</th><th className="p-2 text-left">Due</th>
                    <th className="p-2 text-right">Total</th><th className="p-2 text-right">Outstanding</th><th className="p-2 text-right w-36">Allocate</th>
                  </tr></thead>
                  <tbody>{outstanding.map(i => (
                    <tr key={i.id} className="border-t">
                      <td className="p-2 font-medium">{i.invoiceNo}</td>
                      <td className="p-2">{i.dueDate || "—"}</td>
                      <td className="p-2 text-right font-mono">{money(Number(i.amount))}</td>
                      <td className="p-2 text-right font-mono">{money(balanceOf(i))}</td>
                      <td className="p-2"><Input type="number" min="0" step="0.01" className="h-8 text-right" value={alloc[i.id] ?? ""}
                        onChange={e => setAlloc(a => ({ ...a, [i.id]: e.target.value }))} /></td>
                    </tr>))}
                  </tbody>
                </table>
                <div className="flex flex-wrap justify-end gap-6 border-t bg-muted/30 p-2 text-xs">
                  <span>Allocated: <b>{money(allocated)}</b></span>
                  <span className={allocated > paid + 0.005 ? "text-red-600" : ""}>Unallocated (advance): <b>{money(Math.max(0, paid - allocated))}</b></span>
                </div>
              </div>
            )}
          </Card>
        )}

        <div className="flex justify-end pb-6"><Actions /></div>
      </div>
    </Layout>
  );
}
