import { useState } from "react";
import { format, parseISO, differenceInDays } from "date-fns";
import { Layout } from "@/components/layout";
import { DateRangePicker, firstOfMonth, todayStr } from "@/components/date-range-picker";
import {
  useListPurchases, getListPurchasesQueryKey,
  useDeletePurchase,
  useListItems, getListItemsQueryKey,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, ShoppingCart, Download, FileSpreadsheet, Search, Loader2, AlertTriangle, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";

async function dl(url: string, filename: string, setLoading: (v: boolean) => void) {
  setLoading(true);
  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) { toast.error("Export failed"); return; }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch { toast.error("Download error"); }
  finally { setLoading(false); }
}

function expiryBadge(expiryDate: string | null | undefined) {
  if (!expiryDate) return null;
  const days = differenceInDays(parseISO(expiryDate), new Date());
  if (days < 0) return <Badge variant="destructive" className="text-xs gap-1"><AlertTriangle className="h-3 w-3"/>EXPIRED</Badge>;
  if (days < 90) return <Badge className="text-xs bg-amber-500 hover:bg-amber-600 gap-1"><AlertTriangle className="h-3 w-3"/>Exp in {days}d</Badge>;
  return <Badge variant="outline" className="text-xs text-green-600 border-green-400">{format(parseISO(expiryDate), "dd MMM yyyy")}</Badge>;
}

// ── Multi-item form types ──────────────────────────────────────────────────
interface LineItem {
  itemId: string;
  quantity: string;
  unitPrice: string;
  batchNo: string;
  expiryDate: string;
}

const EMPTY_LINE_ITEM: LineItem = {
  itemId: "", quantity: "", unitPrice: "", batchNo: "", expiryDate: ""
};

const EMPTY_FORM = {
  supplier: "",
  invoiceNo: "",
  purchasedAt: format(new Date(), "yyyy-MM-dd"),
  note: "",
  items: [{ ...EMPTY_LINE_ITEM }],
};

export default function Purchases() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  if (!user?.permissions?.managePurchases) { setLocation("/"); return null; }

  const canDelete = !!user?.permissions?.deleteTransactions;
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayStr());
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  // Per-item search strings (one entry per line item)
  const [itemSearches, setItemSearches] = useState<string[]>([""]);
  const [creating, setCreating] = useState(false);
  const [loadingCsv, setLoadingCsv] = useState(false);
  const [loadingXlsx, setLoadingXlsx] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);

  const { data: items } = useListItems({ query: { queryKey: getListItemsQueryKey() } });

  const queryParams = { from, to } as any;
  const { data: purchases, isLoading } = useListPurchases(queryParams, { query: { queryKey: getListPurchasesQueryKey(queryParams) } });

  const deletePurchase = useDeletePurchase({
    mutation: {
      onSuccess: () => { toast.success("Purchase deleted"); queryClient.invalidateQueries({ queryKey: getListPurchasesQueryKey(queryParams) }); },
      onError: () => toast.error("Failed to delete purchase")
    }
  });

  // ── Add line item row ─────────────────────────────────────────────────────
  const addLineItem = () => {
    setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_LINE_ITEM }] }));
    setItemSearches(s => [...s, ""]);
  };

  const removeLineItem = (idx: number) => {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
    setItemSearches(s => s.filter((_, i) => i !== idx));
  };

  const updateLineItem = (idx: number, patch: Partial<LineItem>) => {
    setForm(f => ({
      ...f,
      items: f.items.map((item, i) => i === idx ? { ...item, ...patch } : item)
    }));
  };

  const updateItemSearch = (idx: number, val: string) => {
    setItemSearches(s => s.map((v, i) => i === idx ? val : v));
  };

  // ── Submit: one POST per valid line item, sharing header fields ───────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.supplier.trim()) return;
    const validItems = form.items.filter(i => i.itemId && i.quantity && i.unitPrice);
    if (validItems.length === 0) return;

    setCreating(true);
    try {
      const responses = await Promise.all(
        validItems.map(item =>
          fetch("/api/purchases", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              supplier: form.supplier.trim().toUpperCase(),
              invoiceNo: form.invoiceNo.trim() || undefined,
              purchasedAt: form.purchasedAt,
              note: form.note.trim() || undefined,
              itemId: Number(item.itemId),
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
              batchNo: item.batchNo.trim() || undefined,
              expiryDate: item.expiryDate || undefined,
            }),
          })
        )
      );

      const failed = responses.filter(r => !r.ok).length;
      const succeeded = responses.length - failed;

      if (failed === responses.length) {
        toast.error("Failed to record purchase — check your connection.");
      } else if (failed > 0) {
        toast.warning(`${succeeded} of ${responses.length} items recorded. ${failed} failed.`);
        queryClient.invalidateQueries({ queryKey: getListPurchasesQueryKey(queryParams) });
      } else {
        toast.success(
          validItems.length > 1
            ? `${validItems.length} items recorded under ${form.invoiceNo ? `Invoice ${form.invoiceNo}` : "one purchase"}`
            : "Purchase recorded successfully"
        );
        queryClient.invalidateQueries({ queryKey: getListPurchasesQueryKey(queryParams) });
        setIsDialogOpen(false);
        setForm(EMPTY_FORM);
        setItemSearches([""]);
      }
    } catch {
      toast.error("Failed to record purchase");
    } finally {
      setCreating(false);
    }
  };

  // ── Edit existing purchase (single item only — by design) ─────────────────
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/purchases/${editForm.id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier: editForm.supplier, invoiceNo: editForm.invoiceNo,
          quantity: Number(editForm.quantity), unitPrice: Number(editForm.unitPrice),
          purchasedAt: editForm.purchasedAt, batchNo: editForm.batchNo,
          expiryDate: editForm.expiryDate, note: editForm.note,
        }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || "Update failed"); return; }
      toast.success("Purchase updated");
      queryClient.invalidateQueries({ queryKey: getListPurchasesQueryKey(queryParams) });
      setEditDialogOpen(false); setEditForm(null);
    } catch { toast.error("Update failed"); }
    finally { setEditLoading(false); }
  };

  const openEdit = (p: any) => {
    setEditForm({
      id: p.id, supplier: p.supplier || "", invoiceNo: p.invoiceNo || "",
      quantity: p.quantity, unitPrice: p.unitPrice, purchasedAt: p.purchasedAt,
      batchNo: (p as any).batchNo || "", expiryDate: (p as any).expiryDate || "",
      note: p.note || "", itemDescription: p.item?.description || "",
    });
    setEditDialogOpen(true);
  };

  const fmt = (v: any) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(Number(v));

  const displayed = (purchases || []).filter(p => {
    const inRange = p.purchasedAt >= from && p.purchasedAt <= to;
    const matchSearch = !search
      || p.supplier?.toLowerCase().includes(search.toLowerCase())
      || p.item?.description?.toLowerCase().includes(search.toLowerCase())
      || p.invoiceNo?.toLowerCase().includes(search.toLowerCase());
    return inRange && matchSearch;
  });

  const totalValue = displayed.reduce((s, p) => s + Number(p.quantity) * Number(p.unitPrice), 0);
  const csvUrl = `/api/export/purchases.csv?from=${from}&to=${to}`;
  const xlsxUrl = `/api/export/purchases.xlsx?from=${from}&to=${to}`;

  // Grand total of the current form
  const formGrandTotal = form.items.reduce(
    (s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
    0
  );

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Purchases</h1>
            <p className="text-muted-foreground">Track all incoming stock from suppliers.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={loadingCsv} onClick={() => dl(csvUrl, `purchases_${from}_${to}.csv`, setLoadingCsv)}>
              {loadingCsv ? <Loader2 className="h-4 w-4 mr-1 animate-spin"/> : <Download className="h-4 w-4 mr-1"/>}CSV
            </Button>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1" disabled={loadingXlsx} onClick={() => dl(xlsxUrl, `purchases_${from}_${to}.xlsx`, setLoadingXlsx)}>
              {loadingXlsx ? <Loader2 className="h-4 w-4 animate-spin"/> : <FileSpreadsheet className="h-4 w-4"/>}Excel
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
            <div className="flex items-center gap-2 border rounded-md px-3 h-9 bg-background">
              <Search className="h-4 w-4 text-muted-foreground"/>
              <input
                placeholder="Search supplier, item, invoice…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent text-sm outline-none w-48"
              />
            </div>
          </div>
        </Card>

        {/* Summary bar */}
        {displayed.length > 0 && (
          <div className="flex flex-wrap gap-4 px-1">
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{displayed.length}</span> record{displayed.length !== 1 ? "s" : ""}
            </div>
            <div className="text-sm text-muted-foreground">
              Total value: <span className="font-bold text-primary">{fmt(totalValue)}</span>
            </div>
            {displayed.some(p => p.expiryDate && differenceInDays(parseISO(p.expiryDate as string), new Date()) < 90) && (
              <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3"/>Some items expiring soon</Badge>
            )}
          </div>
        )}

        {/* Add Purchase dialog */}
        <div>
          <Dialog open={isDialogOpen} onOpenChange={v => { setIsDialogOpen(v); if (!v) { setForm(EMPTY_FORM); setItemSearches([""]); } }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4"/>Add Purchase</Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record New Purchase</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  One invoice can contain multiple commodities. Fill in the shared details below, then add each item.
                </p>
              </DialogHeader>

              <form onSubmit={handleCreate}>
                <div className="space-y-5 py-4">

                  {/* ── Shared header: supplier / invoice / date ── */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label>Supplier / Company <span className="text-destructive">*</span></Label>
                      <Input
                        placeholder="e.g. KEMSA, MEDS, PHARMACY DEPOT"
                        value={form.supplier}
                        onChange={e => setForm({ ...form, supplier: e.target.value.toUpperCase() })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Invoice Number</Label>
                      <Input
                        placeholder="e.g. INV-0001"
                        value={form.invoiceNo}
                        onChange={e => setForm({ ...form, invoiceNo: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Purchase Date <span className="text-destructive">*</span></Label>
                      <input
                        type="date"
                        value={form.purchasedAt}
                        onChange={e => setForm({ ...form, purchasedAt: e.target.value })}
                        required
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm text-foreground [color-scheme:light] dark:[color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  </div>

                  {/* ── Line items ── */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-semibold">
                        Commodities / Items <span className="text-destructive">*</span>
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1 h-7 text-xs"
                        onClick={addLineItem}
                      >
                        <Plus className="h-3 w-3"/> Add Item
                      </Button>
                    </div>

                    {form.items.map((item, idx) => {
                      const filteredForIdx = items?.filter(i =>
                        i.description.toLowerCase().includes((itemSearches[idx] || "").toLowerCase())
                      );
                      const subtotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);

                      return (
                        <div
                          key={idx}
                          className="border rounded-lg p-3 space-y-3 bg-muted/20"
                        >
                          {/* Row header */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Item {idx + 1}
                              {item.itemId && items && (
                                <span className="ml-2 text-foreground normal-case font-medium">
                                  — {items.find(i => i.id.toString() === item.itemId)?.description}
                                </span>
                              )}
                            </span>
                            {form.items.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => removeLineItem(idx)}
                              >
                                <Trash2 className="h-3 w-3"/>
                              </Button>
                            )}
                          </div>

                          {/* Commodity picker */}
                          <div className="space-y-1">
                            <Label className="text-xs">Commodity <span className="text-destructive">*</span></Label>
                            <div className="flex items-center gap-2 border rounded-md px-3 h-9 bg-background mb-1">
                              <Search className="h-4 w-4 text-muted-foreground"/>
                              <input
                                placeholder="Type to filter items…"
                                value={itemSearches[idx] || ""}
                                onChange={e => updateItemSearch(idx, e.target.value)}
                                className="bg-transparent text-sm outline-none flex-1"
                              />
                            </div>
                            <Select
                              value={item.itemId}
                              onValueChange={v => {
                                updateLineItem(idx, { itemId: v });
                                updateItemSearch(idx, "");
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select commodity"/>
                              </SelectTrigger>
                              <SelectContent>
                                {filteredForIdx?.map(i => (
                                  <SelectItem key={i.id} value={i.id.toString()}>
                                    {i.description} ({i.unit})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Qty / Price / Batch / Expiry */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Quantity <span className="text-destructive">*</span></Label>
                              <Input
                                type="number"
                                min="1"
                                placeholder="0"
                                value={item.quantity}
                                onChange={e => updateLineItem(idx, { quantity: e.target.value })}
                                required
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Unit Price (KES) <span className="text-destructive">*</span></Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={item.unitPrice}
                                onChange={e => updateLineItem(idx, { unitPrice: e.target.value })}
                                required
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Batch Number</Label>
                              <Input
                                placeholder="e.g. BCH-2024-001"
                                value={item.batchNo}
                                onChange={e => updateLineItem(idx, { batchNo: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Expiry Date</Label>
                              <input
                                type="date"
                                value={item.expiryDate}
                                onChange={e => updateLineItem(idx, { expiryDate: e.target.value })}
                                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground [color-scheme:light] dark:[color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-ring"
                              />
                              {item.expiryDate && differenceInDays(parseISO(item.expiryDate), new Date()) < 90 && (
                                <p className="text-xs text-amber-600 font-medium">⚠ This item expires soon</p>
                              )}
                            </div>
                          </div>

                          {/* Per-item subtotal */}
                          {item.quantity && item.unitPrice && (
                            <div className="text-xs text-right text-muted-foreground">
                              Subtotal:{" "}
                              <span className="font-semibold text-foreground">{fmt(subtotal)}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Note */}
                  <div className="space-y-2">
                    <Label>Note (Optional)</Label>
                    <Input
                      placeholder="Storage conditions, delivery details…"
                      value={form.note}
                      onChange={e => setForm({ ...form, note: e.target.value })}
                    />
                  </div>

                  {/* Grand total */}
                  {formGrandTotal > 0 && (
                    <div className="bg-primary/5 border border-primary/20 rounded-md px-3 py-2 text-sm flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {form.items.length > 1
                          ? `Grand Total (${form.items.filter(i => i.itemId).length} item${form.items.filter(i => i.itemId).length !== 1 ? "s" : ""})`
                          : "Total"}
                      </span>
                      <span className="font-bold text-primary text-base">{fmt(formGrandTotal)}</span>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      creating ||
                      !form.supplier.trim() ||
                      form.items.every(i => !i.itemId || !i.quantity || !i.unitPrice)
                    }
                  >
                    {creating
                      ? <><Loader2 className="h-4 w-4 mr-1 animate-spin"/>Recording…</>
                      : form.items.filter(i => i.itemId && i.quantity && i.unitPrice).length > 1
                        ? `Record ${form.items.filter(i => i.itemId && i.quantity && i.unitPrice).length} Items`
                        : "Record Purchase"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-28">Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array(5).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        {Array(10).fill(0).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full"/></TableCell>)}
                      </TableRow>
                    ))
                  : displayed.length > 0
                    ? displayed.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm whitespace-nowrap font-medium">
                            {format(parseISO(p.purchasedAt), "d MMM yyyy")}
                          </TableCell>
                          <TableCell className="text-sm font-medium">{p.supplier}</TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">{p.invoiceNo || "—"}</TableCell>
                          <TableCell>
                            <div className="font-medium text-sm">{p.item?.description}</div>
                            <div className="text-xs text-muted-foreground">{p.item?.unit}</div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">{p.quantity}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{fmt(p.unitPrice)}</TableCell>
                          <TableCell className="text-right font-mono text-sm font-semibold text-primary">
                            {fmt(Number(p.quantity) * Number(p.unitPrice))}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{(p as any).batchNo || "—"}</TableCell>
                          <TableCell>{expiryBadge((p as any).expiryDate)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => openEdit(p)}
                              >
                                <Pencil className="h-3.5 w-3.5"/>
                              </Button>
                              {canDelete && (
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => { if (confirm("Delete this purchase?")) deletePurchase.mutate({ purchaseId: p.id }); }}
                                >
                                  <Trash2 className="h-3.5 w-3.5"/>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    : (
                        <TableRow>
                          <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                            <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-40"/>
                            No purchases found for the selected date range
                          </TableCell>
                        </TableRow>
                      )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Edit Purchase Dialog (single record) */}
      {editForm && (
        <Dialog open={editDialogOpen} onOpenChange={v => { setEditDialogOpen(v); if (!v) setEditForm(null); }}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Edit Purchase</DialogTitle>
              <p className="text-sm text-muted-foreground">{editForm.itemDescription}</p>
            </DialogHeader>
            <form onSubmit={handleEdit}>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Supplier</Label>
                    <Input
                      value={editForm.supplier}
                      onChange={e => setEditForm({ ...editForm, supplier: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Invoice No</Label>
                    <Input value={editForm.invoiceNo} onChange={e => setEditForm({ ...editForm, invoiceNo: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Purchase Date</Label>
                    <input
                      type="date"
                      value={editForm.purchasedAt}
                      onChange={e => setEditForm({ ...editForm, purchasedAt: e.target.value })}
                      required
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground [color-scheme:light] dark:[color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input type="number" min="1" value={editForm.quantity} onChange={e => setEditForm({ ...editForm, quantity: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit Price (KES)</Label>
                    <Input type="number" step="0.01" min="0" value={editForm.unitPrice} onChange={e => setEditForm({ ...editForm, unitPrice: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Batch No</Label>
                    <Input value={editForm.batchNo} onChange={e => setEditForm({ ...editForm, batchNo: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Expiry Date</Label>
                    <input
                      type="date"
                      value={editForm.expiryDate}
                      onChange={e => setEditForm({ ...editForm, expiryDate: e.target.value })}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground [color-scheme:light] dark:[color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Note</Label>
                    <Input value={editForm.note} onChange={e => setEditForm({ ...editForm, note: e.target.value })} />
                  </div>
                </div>
                {editForm.quantity && editForm.unitPrice && (
                  <div className="bg-primary/5 border border-primary/20 rounded-md px-3 py-2 text-sm">
                    Total: <span className="font-bold text-primary">{fmt(Number(editForm.quantity) * Number(editForm.unitPrice))}</span>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setEditDialogOpen(false); setEditForm(null); }}>Cancel</Button>
                <Button type="submit" disabled={editLoading}>{editLoading ? "Saving…" : "Save Changes"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  );
}
