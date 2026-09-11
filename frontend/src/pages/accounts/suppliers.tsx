import { useState } from "react";
import { Layout } from "@/components/layout";
import {
  useListSuppliers, getListSuppliersQueryKey,
  useCreateSupplier, useUpdateSupplier, useDeleteSupplier, useGetSupplierLedger,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Pencil, Users, BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";

const emptyForm = { name: "", contactPerson: "", phone: "", email: "", address: "" };

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  if (!user?.permissions?.viewAccounts) { setLocation("/"); return null; }
  const canManage = !!user?.permissions?.manageAccounts;
  const canDelete = !!user?.permissions?.deleteTransactions;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [ledgerSupplierId, setLedgerSupplierId] = useState<number | null>(null);

  const { data: suppliers, isLoading } = useListSuppliers({ query: { queryKey: getListSuppliersQueryKey() } });
  const { data: ledger, isLoading: ledgerLoading } = useGetSupplierLedger(ledgerSupplierId ?? 0);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() });

  const createSupplier = useCreateSupplier({ mutation: { onSuccess: () => { toast.success("Supplier added"); invalidate(); closeDialog(); }, onError: (e: any) => toast.error(e?.error || "Failed to add supplier"), onSettled: () => setSubmitting(false) } });
  const updateSupplier = useUpdateSupplier({ mutation: { onSuccess: () => { toast.success("Supplier updated"); invalidate(); closeDialog(); }, onError: (e: any) => toast.error(e?.error || "Failed to update supplier"), onSettled: () => setSubmitting(false) } });
  const deleteSupplier = useDeleteSupplier({ mutation: { onSuccess: () => { toast.success("Supplier deleted"); invalidate(); }, onError: (e: any) => toast.error(e?.error || "Failed to delete supplier") } });

  const closeDialog = () => { setIsDialogOpen(false); setEditingId(null); setForm(emptyForm); };
  const openEdit = (s: any) => { setEditingId(s.id); setForm({ name: s.name, contactPerson: s.contactPerson ?? "", phone: s.phone ?? "", email: s.email ?? "", address: s.address ?? "" }); setIsDialogOpen(true); };

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error("Supplier name is required"); return; }
    setSubmitting(true);
    if (editingId) updateSupplier.mutate({ supplierId: editingId, data: form });
    else createSupplier.mutate({ data: form });
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6"/>Suppliers</h1>
          <p className="text-sm text-muted-foreground">Supplier records and the amount currently owed to each (accounts payable).</p>
        </div>
        {canManage && (
          <Dialog open={isDialogOpen} onOpenChange={(v) => { setIsDialogOpen(v); if (!v) closeDialog(); }}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4"/>Add Supplier</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingId ? "Edit Supplier" : "New Supplier"}</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1"><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}/></div>
                <div className="space-y-1"><Label>Contact Person</Label><Input value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))}/></div>
                <div className="space-y-1"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}/></div>
                <div className="space-y-1"><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}/></div>
                <div className="space-y-1"><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}/></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Saving..." : "Save"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Phone</TableHead><TableHead className="text-right">Amount Owed (KES)</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-6 w-full"/></TableCell></TableRow>)}
            {!isLoading && (suppliers ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No suppliers added yet.</TableCell></TableRow>}
            {(suppliers ?? []).map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.contactPerson ?? "—"}</TableCell>
                <TableCell>{s.phone ?? "—"}</TableCell>
                <TableCell className="text-right">{s.balance > 0 ? <Badge variant="destructive">{s.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Badge> : "0.00"}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="View ledger" onClick={() => setLedgerSupplierId(s.id)}><BookOpen className="h-4 w-4"/></Button>
                  {canManage && <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(s)}><Pencil className="h-4 w-4"/></Button>}
                  {canDelete && <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { if (confirm(`Delete supplier ${s.name}?`)) deleteSupplier.mutate({ supplierId: s.id }); }}><Trash2 className="h-4 w-4"/></Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!ledgerSupplierId} onOpenChange={(v) => !v && setLedgerSupplierId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{ledger?.supplier?.name ?? "Supplier"} — Ledger</DialogTitle></DialogHeader>
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Reference</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
            <TableBody>
              {ledgerLoading && <TableRow><TableCell colSpan={6}><Skeleton className="h-6 w-full"/></TableCell></TableRow>}
              {!ledgerLoading && (ledger?.entries ?? []).length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No transactions yet.</TableCell></TableRow>}
              {(ledger?.entries ?? []).map((e: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>{e.date}</TableCell>
                  <TableCell><Badge variant="outline">{e.type}{e.status === "pending" ? " (pending)" : ""}</Badge></TableCell>
                  <TableCell>{e.reference}</TableCell>
                  <TableCell className="text-right">{e.debit > 0 ? e.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}</TableCell>
                  <TableCell className="text-right">{e.credit > 0 ? e.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}</TableCell>
                  <TableCell className="text-right font-medium">{e.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
