import { useState } from "react";
import { Layout } from "@/components/layout";
import {
  useListSuppliers, getListSuppliersQueryKey,
  useCreateSupplier, useUpdateSupplier, useDeleteSupplier, useGetSupplierLedger,
  useMergeSuppliers, useListSupplierStatuses,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Pencil, Users, BookOpen, GitMerge, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";

const emptyForm = { name: "", contactPerson: "", phone: "", email: "", address: "", pin: "", contractStatus: "", status: "" };

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
  const [search, setSearch] = useState("");
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState("");
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [mergeName, setMergeName] = useState("");

  const { data: suppliers, isLoading } = useListSuppliers({ query: { queryKey: getListSuppliersQueryKey() } });
  const { data: ledger, isLoading: ledgerLoading } = useGetSupplierLedger(ledgerSupplierId ?? 0);
  const { data: supplierStatuses } = useListSupplierStatuses();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() });

  const createSupplier = useCreateSupplier({ mutation: { onSuccess: () => { toast.success("Supplier added"); invalidate(); closeDialog(); }, onError: (e: any) => toast.error(e?.error || "Failed to add supplier"), onSettled: () => setSubmitting(false) } });
  const updateSupplier = useUpdateSupplier({ mutation: { onSuccess: () => { toast.success("Supplier updated"); invalidate(); closeDialog(); }, onError: (e: any) => toast.error(e?.error || "Failed to update supplier"), onSettled: () => setSubmitting(false) } });
  const deleteSupplier = useDeleteSupplier({ mutation: { onSuccess: () => { toast.success("Supplier deleted"); invalidate(); }, onError: (e: any) => toast.error(e?.error || "Failed to delete supplier") } });
  const mergeSuppliers = useMergeSuppliers({ mutation: { onSuccess: (data) => { toast.success(`Suppliers merged; ${Object.values(data.moved).reduce((a, b) => a + b, 0)} linked records moved`); invalidate(); setMergeOpen(false); setMergeSourceId(""); setMergeTargetId(""); setMergeName(""); }, onError: (e: any) => toast.error(e?.error || "Failed to merge suppliers") } });

  const closeDialog = () => { setIsDialogOpen(false); setEditingId(null); setForm(emptyForm); };
  const openEdit = (s: any) => { setEditingId(s.id); setForm({ name: s.name, contactPerson: s.contactPerson ?? "", phone: s.phone ?? "", email: s.email ?? "", address: s.address ?? "", pin: s.pin ?? "", contractStatus: s.contractStatus ?? "", status: s.status ?? "" }); setIsDialogOpen(true); };

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error("Supplier name is required"); return; }
    if (!form.address.trim()) { toast.error("Address is required"); return; }
    if (!form.pin.trim()) { toast.error("PIN is required"); return; }
    if (!form.phone.trim()) { toast.error("Phone is required"); return; }
    setSubmitting(true);
    if (editingId) updateSupplier.mutate({ supplierId: editingId, data: form });
    else createSupplier.mutate({ data: form });
  };
  const visibleSuppliers = (suppliers ?? []).filter(s => !search.trim() || [s.name, s.contactPerson, s.phone, s.email, s.address].some(v => String(v || "").toLowerCase().includes(search.trim().toLowerCase())));
  const submitMerge = () => {
    if (!mergeSourceId || !mergeTargetId || mergeSourceId === mergeTargetId) return toast.error("Choose two different suppliers");
    const source = suppliers?.find(s => s.id === Number(mergeSourceId)), target = suppliers?.find(s => s.id === Number(mergeTargetId));
    if (!source || !target) return toast.error("Choose a source and target supplier");
    if (!confirm(`Merge ${source.name} into ${target.name}? All purchases, GRNs, payments and invoices will use the target supplier. This cannot be undone.`)) return;
    mergeSuppliers.mutate({ sourceSupplierId: Number(mergeSourceId), targetSupplierId: Number(mergeTargetId), name: mergeName.trim() || target.name });
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
                <div className="space-y-1"><Label>Name <span className="text-destructive">*</span></Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}/></div>
                <div className="space-y-1"><Label>Address <span className="text-destructive">*</span></Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}/></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>PIN <span className="text-destructive">*</span></Label><Input value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} placeholder="e.g. P0XXXXXXXXX" /></div>
                  <div className="space-y-1"><Label>Phone <span className="text-destructive">*</span></Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}/></div>
                </div>
                <div className="space-y-1"><Label>Contact Person <span className="text-muted-foreground font-normal">(optional)</span></Label><Input value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))}/></div>
                <div className="space-y-1"><Label>Email <span className="text-muted-foreground font-normal">(optional)</span></Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}/></div>
                <div className="space-y-1"><Label>Contract Status <span className="text-muted-foreground font-normal">(optional)</span></Label><Input value={form.contractStatus} onChange={e => setForm(f => ({ ...f, contractStatus: e.target.value }))} placeholder="e.g. Active until Dec 2026"/></div>
                <div className="space-y-1">
                  <Label>Supplier Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>{(supplierStatuses || []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">Manage the list in Settings → Purchases.</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Saving..." : "Save"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {canManage && <Dialog open={mergeOpen} onOpenChange={setMergeOpen}><DialogTrigger asChild><Button variant="outline" className="gap-2"><GitMerge className="h-4 w-4"/>Merge Suppliers</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Merge Supplier Records</DialogTitle><p className="text-sm text-muted-foreground">Choose the duplicate supplier as Source and the record to keep as Target. All linked records will be reassigned.</p></DialogHeader><div className="space-y-3"><div className="space-y-1"><Label>Source supplier (will be removed)</Label><select className="w-full h-9 rounded-md border bg-background px-2" value={mergeSourceId} onChange={e => setMergeSourceId(e.target.value)}><option value="">Select source</option>{(suppliers ?? []).filter(s => s.id !== Number(mergeTargetId)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div className="space-y-1"><Label>Target supplier (will be kept)</Label><select className="w-full h-9 rounded-md border bg-background px-2" value={mergeTargetId} onChange={e => setMergeTargetId(e.target.value)}><option value="">Select target</option>{(suppliers ?? []).filter(s => s.id !== Number(mergeSourceId)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div className="space-y-1"><Label>Final supplier name (optional)</Label><Input value={mergeName} onChange={e => setMergeName(e.target.value)} placeholder="Leave blank to keep target name"/></div></div><DialogFooter><Button variant="outline" onClick={() => setMergeOpen(false)}>Cancel</Button><Button onClick={submitMerge} disabled={mergeSuppliers.isPending}>{mergeSuppliers.isPending ? "Merging..." : "Merge records"}</Button></DialogFooter></DialogContent></Dialog>}
      </div>

      <div className="mb-4 relative max-w-xl"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/><Input className="pl-9" placeholder="Search suppliers" value={search} onChange={e => setSearch(e.target.value)} /></div>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Phone</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount Owed (KES)</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-6 w-full"/></TableCell></TableRow>)}
            {!isLoading && visibleSuppliers.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No suppliers match the search.</TableCell></TableRow>}
            {visibleSuppliers.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.contactPerson ?? "—"}</TableCell>
                <TableCell>{s.phone ?? "—"}</TableCell>
                <TableCell>{s.status ? <Badge variant={s.status === "Active" ? "outline" : "secondary"}>{s.status}</Badge> : "—"}</TableCell>
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
