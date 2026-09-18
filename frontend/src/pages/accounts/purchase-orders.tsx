import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { Layout } from "@/components/layout";
import {
  useListPurchaseOrders, getListPurchaseOrdersQueryKey,
  useCreatePurchaseOrder, useUpdatePurchaseOrder, useDeletePurchaseOrder,
  useGetPurchaseOrderMeta,
  useListSuppliers, useListItems,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, ClipboardList, X, Pencil, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { AccountRefreshButton } from "@/components/account-refresh-button";

const dateCls = "w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground [color-scheme:light] dark:[color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-ring";

const emptyLine = () => ({ itemId: "", description: "", unit: "", quantity: "", unitPrice: "", totalPrice: "", totalIncludesTax: false, search: "" });

const emptyHeader = () => ({
  date: format(new Date(), "yyyy-MM-dd"),
  supplierId: "",
  orderRefType: "",
  orderRefNo: "",
  orderRefDate: "",
  requisitionNo: "",
  procurementRef: "",
  procurementMethod: "",
  paymentTerms: "30 days",
  classification: "",
  chargeableVoteCode: "",
  taxPercent: "16",
  taxEnabled: true,
  approvalStatus: "pending",
  note: "",
});

export default function PurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  if (!user?.permissions?.viewAccounts) { setLocation("/"); return null; }
  const canManage = !!user?.permissions?.manageAccounts;
  const canDelete = !!user?.permissions?.deleteTransactions || canManage;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [header, setHeader] = useState(emptyHeader());
  const [lines, setLines] = useState([emptyLine()]);
  const [folder, setFolder] = useState<"pending" | "approved">("pending");

  const { data: orders, isLoading } = useListPurchaseOrders();
  const { data: suppliers } = useListSuppliers();
  const { data: items } = useListItems();
  const { data: meta } = useGetPurchaseOrderMeta();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListPurchaseOrdersQueryKey() });
  const resetForm = () => { setEditingId(null); setHeader(emptyHeader()); setLines([emptyLine()]); };
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new") === "1" && canManage) {
      resetForm();
      setIsDialogOpen(true);
      window.history.replaceState({}, "", "/accounts/purchase-orders");
    }
  }, [canManage]);

  const createPo = useCreatePurchaseOrder({
    mutation: {
      onSuccess: () => { toast.success("Purchase order created"); invalidate(); resetForm(); setIsDialogOpen(false); },
      onError: (e: any) => toast.error(e?.error || "Could not create purchase order"),
      onSettled: () => setSubmitting(false),
    },
  });
  const updatePo = useUpdatePurchaseOrder({
    mutation: {
      onSuccess: () => { toast.success("Purchase order updated"); invalidate(); resetForm(); setIsDialogOpen(false); },
      onError: (e: any) => toast.error(e?.error || "Could not update purchase order"),
      onSettled: () => setSubmitting(false),
    },
  });
  const deletePo = useDeletePurchaseOrder({
    mutation: {
      onSuccess: () => { toast.success("Purchase order deleted"); invalidate(); },
      onError: (e: any) => toast.error(e?.error || "Could not delete purchase order"),
    },
  });

  const updateLine = (idx: number, field: string, value: any) => {
    setLines(ls => ls.map((l, i) => {
      if (i !== idx) return l;
      const next = { ...l, [field]: value } as any;
      if (field === "totalPrice") {
        const quantity = Number(next.quantity) || 0;
        const taxMultiplier = header.taxEnabled && next.totalIncludesTax ? 1 + (Number(header.taxPercent) || 0) / 100 : 1;
        if (quantity > 0 && value !== "") next.unitPrice = (Number(value) / quantity / taxMultiplier).toFixed(2);
      }
      if (field === "quantity" && next.totalPrice !== "" && Number(value) > 0) {
        const taxMultiplier = header.taxEnabled && next.totalIncludesTax ? 1 + (Number(header.taxPercent) || 0) / 100 : 1;
        next.unitPrice = (Number(next.totalPrice) / Number(value) / taxMultiplier).toFixed(2);
      }
      if (field === "unitPrice" && next.quantity) {
        const taxMultiplier = header.taxEnabled && next.totalIncludesTax ? 1 + (Number(header.taxPercent) || 0) / 100 : 1;
        next.totalPrice = (Number(value || 0) * Number(next.quantity || 0) * taxMultiplier).toFixed(2);
      }
      if (field === "totalIncludesTax" && next.totalPrice !== "" && next.quantity) {
        const taxMultiplier = header.taxEnabled && next.totalIncludesTax ? 1 + (Number(header.taxPercent) || 0) / 100 : 1;
        next.unitPrice = (Number(next.totalPrice) / Number(next.quantity) / taxMultiplier).toFixed(2);
      }
      if (field === "itemId") {
        const item = (items || []).find(it => String(it.id) === value);
        if (item) { next.description = item.description; next.unit = item.unit; next.search = item.description; }
      }
      return next;
    }));
  };
  const addLine = () => setLines(ls => [...ls, emptyLine()]);
  const removeLine = (idx: number) => setLines(ls => ls.filter((_, i) => i !== idx));
  const filteredItems = (lineSearch: string) =>
    lineSearch.trim() ? (items || []).filter(i => i.description.toLowerCase().includes(lineSearch.toLowerCase())) : (items || []);

  const lineTotal = (l: typeof lines[0]) => (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
  const totalExclusiveVat = useMemo(() => lines.reduce((s, l) => s + lineTotal(l), 0), [lines]);
  const taxAmount = useMemo(() => totalExclusiveVat * (Number(header.taxPercent) || 0) / 100, [totalExclusiveVat, header.taxPercent]);
  const totalInclusiveVat = totalExclusiveVat + taxAmount;

  const openEdit = (o: any) => {
    setEditingId(o.id);
    setHeader({
      date: o.date, supplierId: String(o.supplierId),
      orderRefType: o.orderRefType || "", orderRefNo: o.orderRefNo || "", orderRefDate: o.orderRefDate || "",
      requisitionNo: o.requisitionNo || "", procurementRef: o.procurementRef || "", procurementMethod: o.procurementMethod || "",
      paymentTerms: o.paymentTerms || "", classification: o.classification || "", chargeableVoteCode: o.chargeableVoteCode || "",
      taxPercent: String(o.taxPercent ?? 0), taxEnabled: o.taxEnabled !== false && Number(o.taxPercent || 0) > 0, approvalStatus: o.status || "pending", note: o.note || "",
    });
    setLines((o.lines || []).map((l: any) => ({ itemId: l.itemId ? String(l.itemId) : "", description: l.description || "", unit: l.unit || "", quantity: String(l.quantity ?? ""), unitPrice: String(l.unitPrice ?? ""), totalPrice: String(l.totalPrice ?? ((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0))), totalIncludesTax: false, search: l.description || "" })));
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!header.supplierId || !header.date) { toast.error("Supplier and date are required"); return; }
    const cleanLines = lines.filter(l => l.description && Number(l.quantity) > 0).map(l => ({
      itemId: l.itemId ? Number(l.itemId) : null, description: l.description, unit: l.unit,
      quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) || 0,
    }));
    if (!cleanLines.length) { toast.error("Add at least one item with a quantity"); return; }
    const payload = {
      date: header.date, supplierId: Number(header.supplierId),
      orderRefType: header.orderRefType || null, orderRefNo: header.orderRefNo || null, orderRefDate: header.orderRefDate || null,
      requisitionNo: header.requisitionNo || null, procurementRef: header.procurementRef || null, procurementMethod: header.procurementMethod || null,
      paymentTerms: header.paymentTerms || null, classification: header.classification || null, chargeableVoteCode: header.chargeableVoteCode || null,
      taxEnabled: header.taxEnabled, taxPercent: header.taxEnabled ? Number(header.taxPercent) || 0 : 0, approvalStatus: header.approvalStatus, note: header.note || null,
      lines: cleanLines,
    };
    setSubmitting(true);
    if (editingId) updatePo.mutate({ orderId: editingId, data: payload });
    else createPo.mutate({ data: payload });
  };

  const fmt = (n: number) => `KES ${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  const visibleOrders = (orders || []).filter(o => o.status === folder);
  const receivedSummary = (o: any) => {
    const grns = o.grns || (o.grn ? [o.grn] : []);
    const items = grns.flatMap((g: any) => g.items || []);
    return {
      items: items.map((item: any) => item.description || item.itemCode || "—").filter(Boolean).join(", ") || "—",
      quantity: items.reduce((sum: number, item: any) => sum + Number(item.qtyReceived || 0), 0),
      approvers: grns.filter((g: any) => g.status === "approved").map((g: any) => g.approvedByName).filter(Boolean).join(", ") || "—",
      voiders: grns.filter((g: any) => g.status === "voided").map((g: any) => g.voidedByName).filter(Boolean).join(", ") || "—",
    };
  };

  return (
    <Layout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="h-6 w-6" />Purchase Orders</h1>
          <p className="text-sm text-muted-foreground">Step 1 of Accounts: Purchase Order → GRN (Goods Received) → Purchase/Supplier Invoice.</p>
        </div>
        <div className="flex items-center gap-2">
        <AccountRefreshButton />
        {canManage && (
          <Dialog open={isDialogOpen} onOpenChange={(v) => { setIsDialogOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={resetForm}><Plus className="h-4 w-4" />New Purchase Order</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Purchase Order" : "New Purchase Order"}</DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 py-2">
                <div className="space-y-1"><Label>Date</Label><input type="date" className={dateCls} value={header.date} onChange={e => setHeader(h => ({ ...h, date: e.target.value }))} /></div>
                <div className="space-y-1 col-span-2 md:col-span-1">
                  <Label>Supplier</Label>
                  <Select value={header.supplierId} onValueChange={v => setHeader(h => ({ ...h, supplierId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                    <SelectContent>{(suppliers ?? []).map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Order Reference</Label>
                  <Select value={header.orderRefType} onValueChange={v => setHeader(h => ({ ...h, orderRefType: v }))}>
                    <SelectTrigger><SelectValue placeholder="LPO / LSO / IMPREST" /></SelectTrigger>
                    <SelectContent>{(meta?.orderRefTypes || ["LPO NO", "LSO NO", "IMPREST NO"]).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                {header.orderRefType && (
                  <>
                    <div className="space-y-1"><Label>{header.orderRefType}</Label><Input value={header.orderRefNo} onChange={e => setHeader(h => ({ ...h, orderRefNo: e.target.value }))} placeholder="Enter number" /></div>
                    <div className="space-y-1"><Label>{header.orderRefType} Date</Label><input type="date" className={dateCls} value={header.orderRefDate} onChange={e => setHeader(h => ({ ...h, orderRefDate: e.target.value }))} /></div>
                  </>
                )}

                <div className="space-y-1"><Label>Requisition No.</Label><Input value={header.requisitionNo} onChange={e => setHeader(h => ({ ...h, requisitionNo: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Procurement Ref <span className="text-muted-foreground font-normal">(optional)</span></Label><Input value={header.procurementRef} onChange={e => setHeader(h => ({ ...h, procurementRef: e.target.value }))} /></div>
                <div className="space-y-1">
                  <Label>Procurement Method</Label>
                  <Select value={header.procurementMethod} onValueChange={v => setHeader(h => ({ ...h, procurementMethod: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                    <SelectContent>{(meta?.procurementMethods || []).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">Manage the list in Settings → Purchases.</p>
                </div>

                <div className="space-y-1"><Label>Payment Terms</Label><Input value={header.paymentTerms} onChange={e => setHeader(h => ({ ...h, paymentTerms: e.target.value }))} placeholder="e.g. 30 days" /></div>
                <div className="space-y-1">
                  <Label>Classification</Label>
                  <Select value={header.classification} onValueChange={v => setHeader(h => ({ ...h, classification: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select classification" /></SelectTrigger>
                    <SelectContent>{(meta?.classifications || ["Expense", "PPE", "F.C"]).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Chargeable Vote Code</Label>
                  <Select value={header.chargeableVoteCode} onValueChange={v => setHeader(h => ({ ...h, chargeableVoteCode: v }))}>
                    <SelectTrigger><SelectValue placeholder="e.g. 2211002" /></SelectTrigger>
                    <SelectContent>{(meta?.chargeItemCodes || []).map(c => <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={header.approvalStatus} onValueChange={v => setHeader(h => ({ ...h, approvalStatus: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm">Items / Commodities</Label>
                {lines.map((l, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-2 relative">
                    {lines.length > 1 && (
                      <button onClick={() => removeLine(i)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      <div className="space-y-1 col-span-2 relative">
                        <Label className="text-xs">Item / Commodity (from catalog)</Label>
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                          <Input className="pl-7" placeholder="Search catalog…" value={l.search} onChange={e => updateLine(i, "search", e.target.value)} />
                        </div>
                        {l.search && !l.itemId && (
                          <div className="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto rounded-md border bg-popover shadow-md">
                            {filteredItems(l.search).slice(0, 20).map(it => (
                              <button key={it.id} type="button" className="block w-full text-left px-3 py-1.5 text-sm hover:bg-muted" onClick={() => updateLine(i, "itemId", String(it.id))}>{it.description} <span className="text-xs text-muted-foreground">({it.unit})</span></button>
                            ))}
                            {filteredItems(l.search).length === 0 && <div className="px-3 py-1.5 text-sm text-muted-foreground">No matching items</div>}
                          </div>
                        )}
                        {l.itemId && <p className="text-xs text-muted-foreground">Selected: {l.description} — <button className="underline" onClick={() => updateLine(i, "itemId", "")}>change</button></p>}
                      </div>
                      <div className="space-y-1"><Label className="text-xs">Unit</Label><Input value={l.unit} onChange={e => updateLine(i, "unit", e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">Quantity</Label><Input type="number" value={l.quantity} onChange={e => updateLine(i, "quantity", e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">Unit Price (KES)</Label><Input type="number" step="0.01" value={l.unitPrice} onChange={e => updateLine(i, "unitPrice", e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">Total Price (KES)</Label><Input type="number" step="0.01" value={l.totalPrice} onChange={e => updateLine(i, "totalPrice", e.target.value)} placeholder="Enter total if unit price is unknown" />{header.taxEnabled && <label className="flex items-center gap-1 text-[11px] text-muted-foreground"><input type="checkbox" checked={l.totalIncludesTax} onChange={e => updateLine(i, "totalIncludesTax", e.target.checked)} /> Total includes tax</label>}</div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">Line total (excl. VAT): <span className="font-semibold text-foreground">{fmt(lineTotal(l))}</span></div>
                  </div>
                ))}
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" className="gap-2" onClick={addLine}><Plus className="h-3.5 w-3.5" />Add Item</Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end border-t pt-3">
                <div className="space-y-2"><Label>Tax</Label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={header.taxEnabled} onChange={e => setHeader(h => ({ ...h, taxEnabled: e.target.checked }))} /> Apply tax</label><Input type="number" step="0.01" min="0" max="100" disabled={!header.taxEnabled} value={header.taxPercent} onChange={e => setHeader(h => ({ ...h, taxPercent: e.target.value }))} placeholder="16" /></div>
                <div className="text-sm"><div className="text-muted-foreground text-xs">Total excl. VAT</div><div className="font-semibold">{fmt(totalExclusiveVat)}</div></div>
                <div className="text-sm"><div className="text-muted-foreground text-xs">VAT amount</div><div className="font-semibold">{fmt(taxAmount)}</div></div>
                <div className="text-sm"><div className="text-muted-foreground text-xs">Total price {header.taxEnabled ? "(incl. tax)" : "(no tax)"}</div><div className="font-bold text-primary">{fmt(totalInclusiveVat)}</div></div>
              </div>

              <div className="space-y-1"><Label>Note</Label><Input value={header.note} onChange={e => setHeader(h => ({ ...h, note: e.target.value }))} /></div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Saving…" : editingId ? "Save Changes" : "Create Purchase Order"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      </div>

      <div className="flex gap-2 mb-4"><Button variant={folder === "pending" ? "default" : "outline"} onClick={() => setFolder("pending")}>Pending ({(orders || []).filter(o => o.status === "pending").length})</Button><Button variant={folder === "approved" ? "default" : "outline"} onClick={() => setFolder("approved")}>Approved ({(orders || []).filter(o => o.status === "approved").length})</Button></div>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO No.</TableHead><TableHead>Date</TableHead><TableHead>Supplier</TableHead>
              <TableHead>Ref</TableHead><TableHead>Commodity / Item</TableHead><TableHead>Qty received</TableHead><TableHead>Approved / Voided by</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Total (incl. VAT)</TableHead>
              <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 4 }).map((_, i) => <TableRow key={i}><TableCell colSpan={11}><Skeleton className="h-6 w-full" /></TableCell></TableRow>)}
            {!isLoading && visibleOrders.length === 0 && <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">No {folder} purchase orders.</TableCell></TableRow>}
            {visibleOrders.map(o => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.poNo}</TableCell>
                <TableCell className="whitespace-nowrap text-sm">{o.date}</TableCell>
                <TableCell>{o.supplier?.name ?? "—"}</TableCell>
                <TableCell className="text-xs font-mono">{o.orderRefType ? `${o.orderRefType}: ${o.orderRefNo || "—"}` : "—"}</TableCell>
                <TableCell className="min-w-48">{receivedSummary(o).items}</TableCell>
                <TableCell>{receivedSummary(o).quantity || "—"}</TableCell>
                <TableCell className="whitespace-nowrap">{receivedSummary(o).approvers !== "—" ? `Approved: ${receivedSummary(o).approvers}` : receivedSummary(o).voiders !== "—" ? `Voided: ${receivedSummary(o).voiders}` : "—"}</TableCell>
                <TableCell className="text-xs">{o.procurementMethod || "—"}</TableCell>
                <TableCell className="text-right font-mono text-sm">{fmt(o.totalInclusiveVat ?? o.totalAmount)}</TableCell>
                <TableCell>{o.status === "approved" ? <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge> : <Badge variant="secondary">Pending</Badge>}</TableCell>
                <TableCell className="text-right space-x-1">
                  {canManage && <Button size="sm" variant="outline" className="gap-1" onClick={() => openEdit(o)}><Pencil className="h-3.5 w-3.5" />Edit</Button>}
                  {canManage && <Button size="sm" variant={o.status === "approved" ? "secondary" : "outline"} onClick={() => updatePo.mutate({ orderId: o.id, data: { approvalStatus: o.status === "approved" ? "pending" : "approved" } })}>{o.status === "approved" ? "Set Pending" : "Approve"}</Button>}
                  {canDelete && <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => { if (confirm(`Delete purchase order ${o.poNo}?`)) deletePo.mutate({ orderId: o.id }); }}><Trash2 className="h-4 w-4" /></Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Layout>
  );
}
