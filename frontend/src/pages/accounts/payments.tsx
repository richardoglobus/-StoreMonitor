import { useState } from "react";
import { format } from "date-fns";
import { Layout } from "@/components/layout";
import {
  useListPayments, getListPaymentsQueryKey,
  useCreatePayment, useDeletePayment,
  useListSuppliers, getListSuppliersQueryKey,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";

const dateCls = "w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground [color-scheme:light] dark:[color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-ring";
const emptyForm = { date: format(new Date(), "yyyy-MM-dd"), supplierId: "", amount: "", method: "Bank", reference: "", note: "" };

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  if (!user?.permissions?.viewReports) { setLocation("/"); return null; }
  const canManage = !!user?.permissions?.managePurchases;
  const canDelete = !!user?.permissions?.deleteTransactions;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const { data: payments, isLoading } = useListPayments({}, { query: { queryKey: getListPaymentsQueryKey({}) } });
  const { data: suppliers } = useListSuppliers({ query: { queryKey: getListSuppliersQueryKey() } });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey({}) });
    queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
  };

  const createPayment = useCreatePayment({ mutation: { onSuccess: () => { toast.success("Payment recorded"); invalidate(); setIsDialogOpen(false); setForm(emptyForm); }, onError: (e: any) => toast.error(e?.error || "Failed to record payment"), onSettled: () => setSubmitting(false) } });
  const deletePayment = useDeletePayment({ mutation: { onSuccess: () => { toast.success("Payment removed"); invalidate(); }, onError: (e: any) => toast.error(e?.error || "Failed to delete payment") } });

  const handleSubmit = () => {
    if (!form.supplierId) { toast.error("Select a supplier"); return; }
    if (!Number(form.amount) || Number(form.amount) <= 0) { toast.error("Enter a valid amount"); return; }
    setSubmitting(true);
    createPayment.mutate({ data: { ...form, supplierId: Number(form.supplierId), amount: Number(form.amount) } });
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wallet className="h-6 w-6"/>Payment Entries</h1>
          <p className="text-sm text-muted-foreground">Payments made to suppliers. Debits Accounts Payable, credits Bank/Cash.</p>
        </div>
        {canManage && (
          <Dialog open={isDialogOpen} onOpenChange={(v) => { setIsDialogOpen(v); if (!v) setForm(emptyForm); }}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4"/>Record Payment</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1"><Label>Date</Label><input type="date" className={dateCls} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}/></div>
                <div className="space-y-1">
                  <Label>Supplier</Label>
                  <Select value={form.supplierId} onValueChange={v => setForm(f => ({ ...f, supplierId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select supplier"/></SelectTrigger>
                    <SelectContent>{(suppliers ?? []).map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name} (owed KES {s.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Amount (KES)</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}/></div>
                <div className="space-y-1">
                  <Label>Method</Label>
                  <Select value={form.method} onValueChange={v => setForm(f => ({ ...f, method: v }))}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank">Bank Transfer</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Mpesa">M-Pesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Reference No.</Label><Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}/></div>
                <div className="space-y-1"><Label>Note</Label><Input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}/></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Saving..." : "Save Payment"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Supplier</TableHead><TableHead className="text-right">Amount (KES)</TableHead><TableHead>Method</TableHead><TableHead>Reference</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-6 w-full"/></TableCell></TableRow>)}
            {!isLoading && (payments ?? []).length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No payments recorded yet.</TableCell></TableRow>}
            {(payments ?? []).map(p => (
              <TableRow key={p.id}>
                <TableCell>{p.date}</TableCell>
                <TableCell className="font-medium">{p.supplier?.name ?? "—"}</TableCell>
                <TableCell className="text-right">{p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                <TableCell><Badge variant="outline">{p.method}</Badge></TableCell>
                <TableCell>{p.reference ?? "—"}</TableCell>
                <TableCell className="text-right">
                  {canDelete && <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("Delete this payment entry? This will restore the supplier's balance.")) deletePayment.mutate({ paymentId: p.id }); }}><Trash2 className="h-4 w-4"/></Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Layout>
  );
}
