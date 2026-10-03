import { useMemo, useState } from "react";
import { format, startOfMonth } from "date-fns";
import { Layout } from "@/components/layout";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { AccountRefreshButton } from "@/components/account-refresh-button";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus } from "lucide-react";
import {
  useCreateSupplierInvoice, useListSupplierInvoices, getListSupplierInvoicesQueryKey,
  useListPurchaseOrders, useListSuppliers, useListGrns, getListGrnsQueryKey,
} from "@/lib/api";

const dateCls = "w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground [color-scheme:light] dark:[color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-ring";

const emptyInv = { date: format(new Date(), "yyyy-MM-dd"), supplierId: "", invoiceNo: "", purchaseOrderId: "", grnId: "", amount: "", dueDate: "", debitAccount: "5000", note: "" };

const STATUS_STYLE: Record<string, { dot: string; label: string; legend: string }> = {
  paid: { dot: "bg-green-500", label: "Paid", legend: "Paid" },
  "part-paid": { dot: "bg-yellow-400", label: "Partly Paid", legend: "Partly Paid" },
  overdue: { dot: "bg-red-500", label: "Overdue", legend: "Overdue" },
  unpaid: { dot: "bg-blue-500", label: "Unpaid", legend: "Unpaid / Submitted" },
  draft: { dot: "bg-gray-400", label: "Draft", legend: "Draft / Cancelled" },
};

function addDaysToDate(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return format(d, "yyyy-MM-dd");
}
function parsePaymentTermsDays(terms: string | null | undefined): number | null {
  if (!terms) return null;
  const match = String(terms).match(/(\d+)\s*day/i);
  return match ? Number(match[1]) : null;
}

export default function SupplierInvoicesPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  if (!user?.permissions?.viewAccounts) { setLocation("/"); return null; }
  const manage = !!user.permissions.manageAccounts;

  const qc = useQueryClient();
  const [invOpen, setInvOpen] = useState(false);
  const [inv, setInv] = useState(emptyInv);
  const today = format(new Date(), "yyyy-MM-dd");
  const [fDraft, setFDraft] = useState({ from: format(startOfMonth(new Date()), "yyyy-MM-dd"), to: today, q: "", status: "all" });
  const [f, setF] = useState(fDraft);

  const { data: suppliers } = useListSuppliers();
  const { data: orders } = useListPurchaseOrders();
  const { data: invoices, isLoading } = useListSupplierInvoices();
  const { data: grns } = useListGrns({}, { query: { queryKey: getListGrnsQueryKey({}) } });

  const createInv = useCreateSupplierInvoice({
    mutation: {
      onSuccess: () => { toast.success("Supplier invoice recorded"); qc.invalidateQueries({ queryKey: getListSupplierInvoicesQueryKey() }); setInvOpen(false); setInv(emptyInv); },
      onError: (e: any) => toast.error(e?.error || "Could not record invoice"),
    },
  });

  const statusOf = (i: any): string => {
    if (i.status === "draft" || i.status === "cancelled") return "draft";
    if (i.status === "paid") return "paid";
    if (i.dueDate && i.dueDate < today) return "overdue";
    return i.status === "part-paid" ? "part-paid" : "unpaid";
  };
  const rows = useMemo(() => (invoices ?? []).filter((i: any) => {
    if (f.from && i.date < f.from) return false;
    if (f.to && i.date > f.to) return false;
    if (f.q && !(i.supplier?.name ?? "").toLowerCase().includes(f.q.toLowerCase())) return false;
    if (f.status !== "all" && statusOf(i) !== f.status) return false;
    return true;
  }), [invoices, f]);

  const is = (k: string, v: string) => setInv(x => ({ ...x, [k]: v }));
  const fmt = (n: number) => `KES ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  const selectedPo = inv.purchaseOrderId ? (orders || []).find(o => String(o.id) === inv.purchaseOrderId) : null;
  const matchingGrns = selectedPo ? (grns || []).filter((g: any) => g.sourcePurchaseOrderId === selectedPo.id || g.supplierId === selectedPo.supplierId) : (grns || []);
  const selectedGrn: any = inv.grnId ? (grns || []).find((g: any) => String(g.id) === inv.grnId) : null;

  const onSelectPo = (v: string) => {
    if (v === "none") { setInv(x => ({ ...x, purchaseOrderId: "" })); return; }
    const po = (orders || []).find(o => String(o.id) === v);
    if (!po) return;
    setInv(x => {
      const days = parsePaymentTermsDays(po.paymentTerms);
      const dueDate = days != null ? addDaysToDate(x.date, days) : x.dueDate;
      return {
        ...x, purchaseOrderId: v, supplierId: String(po.supplierId),
        amount: String(po.totalInclusiveVat ?? po.totalAmount ?? ""),
        dueDate, grnId: po.grn ? String(po.grn.id) : x.grnId,
      };
    });
  };

  return (
    <Layout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6" />Purchase Invoices</h1>
          <p className="text-sm text-muted-foreground">Supplier bills and purchase records</p>
        </div>
        <div className="flex items-center gap-2"><AccountRefreshButton />{manage && (
          <Dialog open={invOpen} onOpenChange={setInvOpen}>
            <DialogTrigger asChild><Button className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4" />New Invoice</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record Supplier Invoice</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Invoice date</Label><input type="date" className={dateCls} value={inv.date} onChange={e => is("date", e.target.value)} /></div>
                  <div><Label>Invoice no.</Label><Input value={inv.invoiceNo} onChange={e => is("invoiceNo", e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Purchase order</Label>
                    <Select value={inv.purchaseOrderId || "none"} onValueChange={onSelectPo}>
                      <SelectTrigger><SelectValue placeholder="Optional PO" /></SelectTrigger>
                      <SelectContent><SelectItem value="none">None</SelectItem>{(orders || []).map(o => <SelectItem key={o.id} value={String(o.id)}>{o.poNo} — {o.supplier?.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">Selecting a PO fills in the supplier, amount and due date for you.</p>
                  </div>
                  <div>
                    <Label>GRN / delivery note</Label>
                    <Select value={inv.grnId || "none"} onValueChange={v => is("grnId", v === "none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Optional GRN" /></SelectTrigger>
                      <SelectContent><SelectItem value="none">None</SelectItem>{matchingGrns.filter((g: any) => g.status !== "voided").map((g: any) => <SelectItem key={g.id} value={String(g.id)}>{g.grnNo} — {(g.items || [])[0]?.description || "Commodity"} ({(g.items || [])[0]?.qtyReceived || 0})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                {selectedPo && (
                  <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1">
                    <div className="font-medium text-sm">{selectedPo.poNo} summary</div>
                    {(selectedPo.lines || []).map((l: any, i: number) => <div key={i} className="flex justify-between"><span>{l.description} × {l.quantity}</span><span>{fmt(l.totalPrice)}</span></div>)}
                    <div className="flex justify-between pt-1 border-t"><span>Excl. VAT</span><span>{fmt(selectedPo.totalExclusiveVat)}</span></div>
                    <div className="flex justify-between"><span>VAT ({selectedPo.taxPercent}%)</span><span>{fmt(selectedPo.taxAmount)}</span></div>
                    <div className="flex justify-between font-semibold"><span>Total incl. VAT</span><span>{fmt(selectedPo.totalInclusiveVat)}</span></div>
                  </div>
                )}
                {selectedGrn && <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 p-3 text-xs space-y-1"><div className="font-semibold">Invoice delivery line</div><div>{(selectedGrn.items || [])[0]?.description || "—"} · Qty {(selectedGrn.items || [])[0]?.qtyReceived || 0} {(selectedGrn.items || [])[0]?.unit || ""}</div><div>GRN {selectedGrn.grnNo} · PO {selectedGrn.sourcePurchaseOrder?.poNo || selectedGrn.orderRefNo || selectedGrn.lpoNo || "—"}</div><div className="font-medium">Invoice amount can be adjusted to the quantity actually delivered.</div></div>}
                <div>
                  <Label>Supplier</Label>
                  <Select value={inv.supplierId} onValueChange={v => is("supplierId", v)} disabled={!!selectedPo}>
                    <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                    <SelectContent>{(suppliers || []).map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                  {selectedPo && <p className="text-[11px] text-muted-foreground">Locked to the purchase order's supplier — clear the PO to change.</p>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Amount (KES)</Label><Input type="number" value={inv.amount} onChange={e => is("amount", e.target.value)} /></div>
                  <div><Label>Due date</Label><Input type="date" value={inv.dueDate} onChange={e => is("dueDate", e.target.value)} /></div>
                </div>
                <div><Label>Expense / debit account</Label><Input value={inv.debitAccount} onChange={e => is("debitAccount", e.target.value)} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInvOpen(false)}>Cancel</Button>
                <Button onClick={() => createInv.mutate({ data: { ...inv, supplierId: Number(inv.supplierId), purchaseOrderId: inv.purchaseOrderId ? Number(inv.purchaseOrderId) : null, grnId: inv.grnId ? Number(inv.grnId) : null, amount: Number(inv.amount) } })}>Record Invoice</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      </div>

      <Card className="mb-3 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div><div className="mb-1 text-xs text-muted-foreground">From Date</div><input type="date" className={dateCls} value={fDraft.from} onChange={e => setFDraft(x => ({ ...x, from: e.target.value }))} /></div>
          <div><div className="mb-1 text-xs text-muted-foreground">To Date</div><input type="date" className={dateCls} value={fDraft.to} onChange={e => setFDraft(x => ({ ...x, to: e.target.value }))} /></div>
          <div className="min-w-[180px] flex-1"><div className="mb-1 text-xs text-muted-foreground">Supplier</div><Input placeholder="Search supplier..." value={fDraft.q} onChange={e => setFDraft(x => ({ ...x, q: e.target.value }))} /></div>
          <div><div className="mb-1 text-xs text-muted-foreground">Status</div>
            <select className={dateCls} value={fDraft.status} onChange={e => setFDraft(x => ({ ...x, status: e.target.value }))}>
              <option value="all">All Statuses</option><option value="paid">Paid</option><option value="part-paid">Partly Paid</option><option value="overdue">Overdue</option><option value="unpaid">Unpaid / Submitted</option><option value="draft">Draft / Cancelled</option>
            </select></div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setF(fDraft)}>Apply</Button>
          <Button variant="outline" onClick={() => { const r = { from: "", to: "", q: "", status: "all" }; setFDraft(r); setF(r); }}>Reset</Button>
        </div>
      </Card>
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        {Object.entries(STATUS_STYLE).map(([k, v]) => <span key={k} className="flex items-center gap-1.5"><i className={`h-2 w-2 rounded-full ${v.dot}`} />{v.legend}</span>)}
      </div>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead>Due Date</TableHead><TableHead>Supplier</TableHead>
              <TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Paid</TableHead><TableHead className="text-right">Outstanding</TableHead><TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={8} className="py-14 text-center text-muted-foreground"><FileText className="mx-auto mb-2 h-8 w-8 opacity-40" /><div className="font-medium text-foreground">No purchase invoices found</div><div className="text-xs">Try adjusting your date range, supplier, or status filter.</div></TableCell></TableRow>}
            {rows.map((i: any) => { const st = STATUS_STYLE[statusOf(i)]; return (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.invoiceNo}</TableCell>
                <TableCell className="text-sm">{i.date}</TableCell>
                <TableCell className="text-sm">{i.dueDate || "—"}</TableCell>
                <TableCell>{i.supplier?.name || "—"}</TableCell>
                <TableCell className="text-right font-mono text-sm">{fmt(i.amount)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{fmt(i.paidAmount || 0)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{fmt(Number(i.amount) - Number(i.paidAmount || 0))}</TableCell>
                <TableCell><span className="flex items-center gap-1.5 text-sm whitespace-nowrap"><i className={`h-2 w-2 rounded-full ${st.dot}`} />{st.label}</span></TableCell>
              </TableRow>); })}
          </TableBody>
        </Table>
      </Card>
      <p className="text-xs text-muted-foreground mt-4"><FileText className="inline h-3 w-3 mr-1" />Payments are recorded from the Payment Entries screen; use "Get Outstanding Invoices" there to settle these invoices.</p>
    </Layout>
  );
}
