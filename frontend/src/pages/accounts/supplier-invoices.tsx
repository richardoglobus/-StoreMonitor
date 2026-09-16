import { useState } from "react";
import { format } from "date-fns";
import { Layout } from "@/components/layout";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
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

export default function SupplierInvoicesPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  if (!user?.permissions?.viewAccounts) { setLocation("/"); return null; }
  const manage = !!user.permissions.manageAccounts;

  const qc = useQueryClient();
  const [invOpen, setInvOpen] = useState(false);
  const [inv, setInv] = useState(emptyInv);

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

  const is = (k: string, v: string) => setInv(x => ({ ...x, [k]: v }));
  const fmt = (n: number) => `KES ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  return (
    <Layout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6" />Purchase / Supplier Invoices</h1>
          <p className="text-sm text-muted-foreground">Step 3 of Accounts: Purchase Order → GRN (Goods Received) → Purchase/Supplier Invoice.</p>
        </div>
        {manage && (
          <Dialog open={invOpen} onOpenChange={setInvOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />New Invoice</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record Supplier Invoice</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Invoice date</Label><input type="date" className={dateCls} value={inv.date} onChange={e => is("date", e.target.value)} /></div>
                  <div><Label>Invoice no.</Label><Input value={inv.invoiceNo} onChange={e => is("invoiceNo", e.target.value)} /></div>
                </div>
                <div>
                  <Label>Supplier</Label>
                  <Select value={inv.supplierId} onValueChange={v => is("supplierId", v)}>
                    <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                    <SelectContent>{(suppliers || []).map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Purchase order</Label>
                    <Select value={inv.purchaseOrderId || "none"} onValueChange={v => is("purchaseOrderId", v === "none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Optional PO" /></SelectTrigger>
                      <SelectContent><SelectItem value="none">None</SelectItem>{(orders || []).map(o => <SelectItem key={o.id} value={String(o.id)}>{o.poNo}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>GRN / delivery note</Label>
                    <Select value={inv.grnId || "none"} onValueChange={v => is("grnId", v === "none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Optional GRN" /></SelectTrigger>
                      <SelectContent><SelectItem value="none">None</SelectItem>{(grns || []).map(g => <SelectItem key={g.id} value={String(g.id)}>{g.grnNo}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
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

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead>Supplier</TableHead>
              <TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Paid</TableHead><TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isLoading && (invoices ?? []).length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No supplier invoices recorded yet.</TableCell></TableRow>}
            {(invoices || []).map(i => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.invoiceNo}</TableCell>
                <TableCell className="text-sm">{i.date}</TableCell>
                <TableCell>{i.supplier?.name || "—"}</TableCell>
                <TableCell className="text-right font-mono text-sm">{fmt(i.amount)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{fmt(i.paidAmount || 0)}</TableCell>
                <TableCell><Badge variant="outline">{i.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <p className="text-xs text-muted-foreground mt-4"><FileText className="inline h-3 w-3 mr-1" />Payments are recorded from the Payment Entries screen and can be assigned to an invoice.</p>
    </Layout>
  );
}
