import { useState } from "react";
import { format } from "date-fns";
import { Layout } from "@/components/layout";
import {
  useListGrns, getListGrnsQueryKey,
  useCreateGrn, useApproveGrn, useUpdateGrn, useVoidGrn, useApproveVoidGrn, useRejectVoidGrn, useUnvoidGrn, useDeleteGrn,
  useListSuppliers, useChargeItemCodes,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, CheckCircle2, ReceiptText, X, Pencil, Ban, Search } from "lucide-react";
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

const emptyLine = () => ({ itemCode: "", description: "", unit: "", qtyReceived: "", unitCost: "", batchNo: "", expiryDate: "", chargeItemCode: "", folioNo: "" });

export default function GrnPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  if (!user?.permissions?.viewAccounts) { setLocation("/"); return null; }
  const canManage = !!user?.permissions?.manageAccounts;
  const canDelete = !!user?.permissions?.deleteTransactions;
  const isAdmin = user.role === "admin";

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [header, setHeader] = useState({ date: format(new Date(), "yyyy-MM-dd"), lpoNo: "", supplierId: "", invoiceNo: "" });
  const [lines, setLines] = useState([emptyLine()]);
  const [editingGrnId, setEditingGrnId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const grnQuery = search.trim() ? { search: search.trim() } : {};
  const { data: grns, isLoading } = useListGrns(grnQuery, { query: { queryKey: getListGrnsQueryKey(grnQuery) } });
  const { data: suppliers } = useListSuppliers();
  const { data: chargeItemCodes } = useChargeItemCodes();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/accounts/grns"] });

  const createGrn = useCreateGrn({
    mutation: {
      onSuccess: () => { toast.success("GRN created — pending approval"); invalidate(); resetForm(); setIsDialogOpen(false); },
      onError: (e: any) => toast.error(e?.error || "Failed to create GRN"),
      onSettled: () => setSubmitting(false),
    },
  });
  const approveGrn = useApproveGrn({
    mutation: {
      onSuccess: () => { toast.success("GRN approved — stock and accounts updated"); invalidate(); },
      onError: (e: any) => toast.error(e?.error || "Failed to approve GRN"),
    },
  });
  const deleteGrn = useDeleteGrn({
    mutation: {
      onSuccess: () => { toast.success("GRN deleted"); invalidate(); },
      onError: (e: any) => toast.error(e?.error || "Failed to delete GRN"),
    },
  });
  const updateGrn = useUpdateGrn({
    mutation: {
      onSuccess: () => { toast.success("Pending GRN updated"); invalidate(); resetForm(); setIsDialogOpen(false); },
      onError: (e: any) => toast.error(e?.error || "Failed to update GRN"),
      onSettled: () => setSubmitting(false),
    },
  });
  const voidGrn = useVoidGrn({
    mutation: {
      onSuccess: () => { toast.success("Approved GRN voided and stock reversed"); invalidate(); },
      onError: (e: any) => toast.error(e?.error || "Failed to void GRN"),
    },
  });
  const approveVoidGrn = useApproveVoidGrn({ mutation: { onSuccess: () => { toast.success("Void approved; stock and accounts reversed"); invalidate(); }, onError: (e: any) => toast.error(e?.error || "Failed to approve void") } });
  const rejectVoidGrn = useRejectVoidGrn({ mutation: { onSuccess: () => { toast.success("Void request rejected"); invalidate(); }, onError: (e: any) => toast.error(e?.error || "Failed to reject request") } });
  const unvoidGrn = useUnvoidGrn({ mutation: { onSuccess: () => { toast.success("GRN restored; stock and accounts reinstated"); invalidate(); }, onError: (e: any) => toast.error(e?.error || "Failed to unvoid GRN") } });

  const resetForm = () => { setEditingGrnId(null); setHeader({ date: format(new Date(), "yyyy-MM-dd"), lpoNo: "", supplierId: "", invoiceNo: "" }); setLines([emptyLine()]); };
  const openEdit = (g: any) => {
    setEditingGrnId(g.id);
    setHeader({ date: g.date, lpoNo: g.lpoNo || "", supplierId: String(g.supplierId), invoiceNo: g.invoiceNo || "" });
    setLines((g.items || []).map((l: any) => ({ ...l, itemCode: l.itemCode || "", description: l.description || "", unit: l.unit || "", qtyReceived: String(l.qtyReceived ?? ""), unitCost: String(l.unitCost ?? ""), batchNo: l.batchNo || "", expiryDate: l.expiryDate || "", chargeItemCode: l.chargeItemCode || l.chargedTo || "", folioNo: l.folioNo || "" })));
    setIsDialogOpen(true);
  };
  const updateLine = (i: number, field: string, value: string) => setLines(ls => ls.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  const addLine = () => setLines(ls => [...ls, emptyLine()]);
  const removeLine = (i: number) => setLines(ls => ls.filter((_, idx) => idx !== i));
  const lineTotal = (l: typeof lines[0]) => (Number(l.qtyReceived) || 0) * (Number(l.unitCost) || 0);
  const grandTotal = lines.reduce((s, l) => s + lineTotal(l), 0);

  const handleSubmit = () => {
    if (!header.supplierId) { toast.error("Select a supplier"); return; }
    const validLines = lines.filter(l => l.description.trim() && Number(l.qtyReceived) > 0);
    if (validLines.length === 0) { toast.error("Add at least one valid item line"); return; }
    setSubmitting(true);
    const data = { ...header, supplierId: Number(header.supplierId), items: validLines.map(l => ({ ...l, qtyReceived: Number(l.qtyReceived), unitCost: Number(l.unitCost) })) };
    if (editingGrnId) updateGrn.mutate({ grnId: editingGrnId, data });
    else createGrn.mutate({ data });
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ReceiptText className="h-6 w-6"/>Goods Received Notes (GRN)</h1>
          <p className="text-sm text-muted-foreground">Record deliveries from suppliers. Approving a GRN updates stock and posts it to accounts.</p>
        </div>
        {canManage && (
          <Dialog open={isDialogOpen} onOpenChange={(v) => { setIsDialogOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => { resetForm(); }}><Plus className="h-4 w-4"/>New GRN</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingGrnId ? "Edit GRN" : "New Goods Received Note"}</DialogTitle><p className="text-sm text-muted-foreground">Approved GRN edits reverse and repost integrated stock/accounting entries automatically.</p></DialogHeader>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-2">
                <div className="space-y-1"><Label>Date</Label><input type="date" className={dateCls} value={header.date} onChange={e => setHeader(h => ({ ...h, date: e.target.value }))}/></div>
                <div className="space-y-1"><Label>LPO No.</Label><Input value={header.lpoNo} onChange={e => setHeader(h => ({ ...h, lpoNo: e.target.value }))}/></div>
                <div className="space-y-1 col-span-2 md:col-span-1">
                  <Label>Supplier</Label>
                  <Select value={header.supplierId} onValueChange={v => setHeader(h => ({ ...h, supplierId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select supplier"/></SelectTrigger>
                    <SelectContent>{(suppliers ?? []).map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Invoice No.</Label><Input value={header.invoiceNo} onChange={e => setHeader(h => ({ ...h, invoiceNo: e.target.value }))}/></div>
              </div>

              <div className="space-y-3">
                {lines.map((l, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-2 relative">
                    {lines.length > 1 && (
                      <button onClick={() => removeLine(i)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"><X className="h-4 w-4"/></button>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="space-y-1"><Label className="text-xs">Item Code</Label><Input value={l.itemCode} onChange={e => updateLine(i, "itemCode", e.target.value)}/></div>
                      <div className="space-y-1 col-span-2 md:col-span-1"><Label className="text-xs">Description</Label><Input value={l.description} onChange={e => updateLine(i, "description", e.target.value)}/></div>
                      <div className="space-y-1"><Label className="text-xs">Unit</Label><Input value={l.unit} onChange={e => updateLine(i, "unit", e.target.value)}/></div>
                      <div className="space-y-1"><Label className="text-xs">Qty Received</Label><Input type="number" value={l.qtyReceived} onChange={e => updateLine(i, "qtyReceived", e.target.value)}/></div>
                      <div className="space-y-1"><Label className="text-xs">Unit Cost</Label><Input type="number" value={l.unitCost} onChange={e => updateLine(i, "unitCost", e.target.value)}/></div>
                      <div className="space-y-1"><Label className="text-xs">Total Cost</Label><Input disabled value={lineTotal(l).toFixed(2)}/></div>
                      <div className="space-y-1"><Label className="text-xs">Batch No.</Label><Input value={l.batchNo} onChange={e => updateLine(i, "batchNo", e.target.value)}/></div>
                      <div className="space-y-1"><Label className="text-xs">Expiry Date</Label><input type="date" className={dateCls} value={l.expiryDate} onChange={e => updateLine(i, "expiryDate", e.target.value)}/></div>
                      <div className="space-y-1"><Label className="text-xs">Charge Item Code</Label><select value={l.chargeItemCode} onChange={e => updateLine(i, "chargeItemCode", e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"><option value="">Select code</option>{(chargeItemCodes || []).map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></div>
                      <div className="space-y-1"><Label className="text-xs">Folio No.</Label><Input value={l.folioNo} onChange={e => updateLine(i, "folioNo", e.target.value)}/></div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="gap-2" onClick={addLine}><Plus className="h-3.5 w-3.5"/>Add Line</Button>
              </div>

              <div className="flex justify-end text-sm font-semibold pt-2 border-t">
                Grand Total: KES {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Saving..." : editingGrnId ? "Update GRN" : "Save GRN"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="mb-4 relative max-w-xl"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/><Input className="pl-9" placeholder="Search GRN number, supplier, invoice, LPO, item, batch, folio, or charge item code" value={search} onChange={e => setSearch(e.target.value)} /></div>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>GRN No.</TableHead><TableHead>Date</TableHead><TableHead>Supplier</TableHead>
              <TableHead>Invoice No.</TableHead><TableHead>Total (KES)</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 4 }).map((_, i) => <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-6 w-full"/></TableCell></TableRow>)}
            {!isLoading && (grns ?? []).length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No GRNs recorded yet.</TableCell></TableRow>}
            {(grns ?? []).map(g => (
              <TableRow key={g.id}>
                <TableCell className="font-medium">{g.grnNo}</TableCell>
                <TableCell>{g.date}</TableCell>
                <TableCell>{g.supplier?.name ?? "—"}</TableCell>
                <TableCell>{g.invoiceNo ?? "—"}</TableCell>
                <TableCell>{g.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                <TableCell><div>{g.status === "approved" ? <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge> : g.status === "voided" ? <Badge variant="destructive">Voided</Badge> : <Badge variant="secondary">Pending</Badge>}{g.voidRequestStatus === "pending" && <Badge className="ml-1 bg-amber-100 text-amber-800">Void requested</Badge>}{g.voidRequestStatus === "rejected" && <Badge className="ml-1">Void rejected</Badge>}</div>{g.voidRequestStatus === "pending" && <p className="text-[11px] text-amber-700 mt-1">By {g.voidRequestedByName || "user"}: {g.voidRequestReason}</p>}</TableCell>
                <TableCell className="text-right space-x-1">
                  {canManage && ["pending", "approved"].includes(g.status) && (
                    <>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => openEdit(g)}><Pencil className="h-3.5 w-3.5"/>Edit</Button>
                      {g.status === "pending" && <Button size="sm" variant="outline" className="gap-1" onClick={() => approveGrn.mutate({ grnId: g.id })}><CheckCircle2 className="h-3.5 w-3.5"/>Approve</Button>}
                    </>
                  )}
                  {canManage && g.status === "approved" && g.voidRequestStatus !== "pending" && <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => { const reason = prompt(isAdmin ? "Why are you voiding this approved GRN?" : "Why are you requesting this GRN to be voided?"); if (reason?.trim()) voidGrn.mutate({ grnId: g.id, reason: reason.trim() }); }}><Ban className="h-3.5 w-3.5"/>{isAdmin ? "Void" : "Request void"}</Button>}
                  {isAdmin && g.status === "approved" && g.voidRequestStatus === "pending" && <><Button size="sm" variant="outline" className="gap-1 text-destructive" title={g.voidRequestReason || "No reason supplied"} onClick={() => approveVoidGrn.mutate({ grnId: g.id })}><CheckCircle2 className="h-3.5 w-3.5"/>Approve void</Button><Button size="sm" variant="ghost" onClick={() => rejectVoidGrn.mutate({ grnId: g.id })}>Reject</Button></>}
                  {isAdmin && g.status === "voided" && <Button size="sm" variant="outline" className="gap-1 text-green-700" onClick={() => { const reason = prompt("Why are you restoring this voided GRN?"); if (reason?.trim()) unvoidGrn.mutate({ grnId: g.id, reason: reason.trim() }); }}>Unvoid</Button>}
                  {canDelete && g.status === "pending" && (
                    <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => { if (confirm("Delete this GRN?")) deleteGrn.mutate({ grnId: g.id }); }}><Trash2 className="h-4 w-4"/></Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Layout>
  );
}
