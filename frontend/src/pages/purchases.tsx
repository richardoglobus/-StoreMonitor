import { useState, useMemo } from "react";
import { format, parseISO, differenceInDays } from "date-fns";
import { Layout } from "@/components/layout";
import { DateRangePicker, firstOfMonth, todayStr } from "@/components/date-range-picker";
import { API_BASE } from "@/lib/api";
import {
  useListPurchases, getListPurchasesQueryKey,
  useDeletePurchase,
  useListItems, getListItemsQueryKey,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, ShoppingCart, Download, FileSpreadsheet, Search, Loader2, AlertTriangle, Pencil, X, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";

async function dl(url: string, filename: string, setLoading: (v: boolean) => void) {
  setLoading(true);
  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) { toast.error("Export failed"); return; }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch { toast.error("Download error"); }
  finally { setLoading(false); }
}

function expiryBadge(expiryDate: string | null | undefined) {
  if (!expiryDate) return null;
  const days = differenceInDays(parseISO(expiryDate), new Date());
  if (days < 0) return <Badge variant="destructive" className="text-xs gap-1"><AlertTriangle className="h-3 w-3"/>EXPIRED</Badge>;
  if (days < 90) return <Badge className="text-xs bg-amber-500 hover:bg-amber-600 gap-1"><AlertTriangle className="h-3 w-3"/>Exp in {days}d</Badge>;
  return <Badge variant="outline" className="text-xs text-green-600 border-green-400">{format(parseISO(expiryDate),"dd MMM yyyy")}</Badge>;
}

const emptyLine = () => ({ itemId: "", quantity: "", unitPrice: "", totalPrice: "", batchNo: "", expiryDate: "", note: "", search: "" });

const dateInputCls = "w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground [color-scheme:light] dark:[color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-ring";

export default function Purchases() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  if (!user?.permissions?.managePurchases) { setLocation("/"); return null; }

  const canDelete = !!user?.permissions?.deleteTransactions;
  const canEdit = !!user?.permissions?.editPurchases;
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayStr());
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [loadingCsv, setLoadingCsv] = useState(false);
  const [loadingXlsx, setLoadingXlsx] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Multi-line voucher state
  const [header, setHeader] = useState({ supplier: "", invoiceNo: "", purchasedAt: format(new Date(), "yyyy-MM-dd") });
  const [lines, setLines] = useState([emptyLine()]);

  const { data: items } = useListItems({ query: { queryKey: getListItemsQueryKey() } });
  const queryParams = { from, to } as any;
  const { data: purchases, isLoading, refetch: refetchPurchases, isFetching } = useListPurchases(queryParams, { query: { queryKey: getListPurchasesQueryKey(queryParams) } });

  const deletePurchase = useDeletePurchase({
    mutation: {
      onSuccess: () => { toast.success("Purchase deleted"); queryClient.invalidateQueries({ queryKey: getListPurchasesQueryKey(queryParams) }); },
      onError: () => toast.error("Failed to delete"),
    }
  });

  // Existing units for dropdown
  const existingUnits = useMemo(() => Array.from(new Set((items || []).map(i => i.unit?.toUpperCase()).filter(Boolean))), [items]);

  const updateLine = (idx: number, field: string, value: string) => {
    const next = [...lines];
    (next[idx] as any)[field] = value;
    const line = next[idx] as any;
    // Bidirectional price calculation
    if (field === "unitPrice" && line.quantity) {
      const total = Number(value) * Number(line.quantity);
      line.totalPrice = total > 0 ? total.toFixed(2) : "";
    } else if (field === "totalPrice" && line.quantity) {
      const unit = Number(value) / Number(line.quantity);
      line.unitPrice = unit > 0 ? unit.toFixed(4) : "";
    } else if (field === "quantity") {
      if (line.unitPrice) {
        const total = Number(line.unitPrice) * Number(value);
        line.totalPrice = total > 0 ? total.toFixed(2) : "";
      } else if (line.totalPrice) {
        const unit = Number(line.totalPrice) / Number(value);
        line.unitPrice = unit > 0 ? unit.toFixed(4) : "";
      }
    }
    setLines(next);
  };

  const filteredItems = (lineSearch: string) =>
    lineSearch.trim() ? (items || []).filter(i => i.description.toLowerCase().includes(lineSearch.toLowerCase())) : (items || []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!header.supplier.trim() || !header.purchasedAt) { toast.error("Supplier and date are required"); return; }
    if (lines.some(l => !l.itemId || !l.quantity || !l.unitPrice)) { toast.error("Each line needs an item, quantity and unit price"); return; }
    setSubmitting(true);
    try {
      // Post each line as a separate purchase with shared header
      const results = await Promise.all(lines.map(line =>
        fetch(`${API_BASE}/api/purchases`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplier: header.supplier.trim().toUpperCase(),
            invoiceNo: header.invoiceNo.trim() || undefined,
            purchasedAt: header.purchasedAt,
            itemId: Number(line.itemId),
            quantity: Number(line.quantity),
            unitPrice: Number(line.unitPrice),
            batchNo: line.batchNo || undefined,
            expiryDate: line.expiryDate || undefined,
            note: line.note || undefined,
          }),
        }).then(r => r.json())
      ));
      const hasError = results.find((r: any) => r.error);
      if (hasError) { toast.error(hasError.error); return; }
      toast.success(`${lines.length} purchase line${lines.length > 1 ? "s" : ""} recorded successfully`);
      queryClient.invalidateQueries({ queryKey: getListPurchasesQueryKey(queryParams) });
      setIsDialogOpen(false);
      setHeader({ supplier: "", invoiceNo: "", purchasedAt: format(new Date(), "yyyy-MM-dd") });
      setLines([emptyLine()]);
    } catch { toast.error("Failed to record purchases"); }
    finally { setSubmitting(false); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editForm) return;
    setEditLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/purchases/${editForm.id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplier: editForm.supplier, invoiceNo: editForm.invoiceNo, quantity: Number(editForm.quantity), unitPrice: Number(editForm.unitPrice), purchasedAt: editForm.purchasedAt, batchNo: editForm.batchNo, expiryDate: editForm.expiryDate, note: editForm.note }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || "Update failed"); return; }
      toast.success("Purchase updated");
      queryClient.invalidateQueries({ queryKey: getListPurchasesQueryKey(queryParams) });
      setEditDialogOpen(false); setEditForm(null);
    } catch { toast.error("Update failed"); }
    finally { setEditLoading(false); }
  };

  const openEdit = (p: any) => {
    setEditForm({ id: p.id, supplier: p.supplier||"", invoiceNo: p.invoiceNo||"", quantity: p.quantity, unitPrice: p.unitPrice, purchasedAt: p.purchasedAt, batchNo: (p as any).batchNo||"", expiryDate: (p as any).expiryDate||"", note: p.note||"", itemDescription: p.item?.description||"" });
    setEditDialogOpen(true);
  };

  const fmt = (v: any) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(Number(v));

  const displayed = (purchases || []).filter(p => {
    const ms = !search || p.supplier?.toLowerCase().includes(search.toLowerCase()) || p.item?.description?.toLowerCase().includes(search.toLowerCase()) || p.invoiceNo?.toLowerCase().includes(search.toLowerCase());
    return ms;
  });

  const totalValue = displayed.reduce((s, p) => s + Number(p.quantity) * Number(p.unitPrice), 0);
  const lineTotal = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Purchases</h1>
            <p className="text-muted-foreground">Track all incoming stock — one supplier can have multiple commodities per voucher.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => refetchPurchases()} disabled={isFetching} title="Refresh">
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}/>
            </Button>
            <Button variant="outline" size="sm" disabled={loadingCsv} onClick={() => dl(`${API_BASE}/api/export/purchases.csv?from=${from}&to=${to}`, `purchases_${from}_${to}.csv`, setLoadingCsv)}>
              {loadingCsv ? <Loader2 className="h-4 w-4 mr-1 animate-spin"/> : <Download className="h-4 w-4 mr-1"/>}CSV
            </Button>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1" disabled={loadingXlsx} onClick={() => dl(`${API_BASE}/api/export/purchases.xlsx?from=${from}&to=${to}`, `purchases_${from}_${to}.xlsx`, setLoadingXlsx)}>
              {loadingXlsx ? <Loader2 className="h-4 w-4 animate-spin"/> : <FileSpreadsheet className="h-4 w-4"/>}Excel
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo}/>
            <div className="flex items-center gap-2 border rounded-md px-3 h-9 bg-background">
              <Search className="h-4 w-4 text-muted-foreground"/>
              <input placeholder="Search supplier, item, invoice…" value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent text-sm outline-none w-48 text-foreground"/>
            </div>
          </div>
        </Card>

        {/* Summary */}
        {displayed.length > 0 && (
          <div className="flex flex-wrap gap-4 px-1 text-sm text-muted-foreground">
            <span><span className="font-semibold text-foreground">{displayed.length}</span> record{displayed.length !== 1 ? "s" : ""}</span>
            <span>Total: <span className="font-bold text-primary">{fmt(totalValue)}</span></span>
            {displayed.some(p => (p as any).expiryDate && differenceInDays(parseISO((p as any).expiryDate), new Date()) < 90) && (
              <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3"/>Items expiring soon</Badge>
            )}
          </div>
        )}

        {/* Add Purchase Voucher */}
        <div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4"/>New Purchase Voucher</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record Purchase Voucher</DialogTitle>
                <p className="text-sm text-muted-foreground">One supplier, one invoice — add multiple commodities below.</p>
              </DialogHeader>
              <form onSubmit={handleCreate}>
                {/* Shared header */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4 pb-2 border-b">
                  <div className="space-y-2 col-span-1">
                    <Label>Supplier <span className="text-destructive">*</span></Label>
                    <Input placeholder="e.g. KEMSA" value={header.supplier} onChange={e => setHeader({...header, supplier: e.target.value.toUpperCase()})} required/>
                  </div>
                  <div className="space-y-2">
                    <Label>Invoice No</Label>
                    <Input placeholder="e.g. INV-001" value={header.invoiceNo} onChange={e => setHeader({...header, invoiceNo: e.target.value})}/>
                  </div>
                  <div className="space-y-2">
                    <Label>Purchase Date <span className="text-destructive">*</span></Label>
                    <input type="date" value={header.purchasedAt} onChange={e => setHeader({...header, purchasedAt: e.target.value})} required className={dateInputCls}/>
                  </div>
                </div>

                {/* Commodity lines */}
                <div className="py-4 space-y-3">
                  <Label className="text-base font-semibold">Commodities</Label>

                  {lines.map((line, idx) => (
                    <div key={idx} className="border rounded-lg p-3 bg-muted/20 space-y-3">
                      {/* Item search */}
                      <div className="flex items-center gap-2 border rounded-md px-3 h-8 bg-background">
                        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0"/>
                        <input placeholder="Search item…" value={line.search} onChange={e => updateLine(idx,"search",e.target.value)}
                          className="bg-transparent text-sm outline-none flex-1 text-foreground"/>
                      </div>
                      <div className="grid grid-cols-12 gap-2 items-end">
                        {/* Item select */}
                        <div className="col-span-12 sm:col-span-5 space-y-1">
                          <Label className="text-xs">Item <span className="text-destructive">*</span></Label>
                          <Select value={line.itemId} onValueChange={v => { updateLine(idx,"itemId",v); updateLine(idx,"search",""); }}>
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Select item">
                                {line.itemId ? items?.find(i => i.id === Number(line.itemId))?.description : "Select item"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {filteredItems(line.search).map(i => (
                                <SelectItem key={i.id} value={i.id.toString()}>{i.description} ({i.unit})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {/* Qty */}
                        <div className="col-span-4 sm:col-span-2 space-y-1">
                          <Label className="text-xs">Qty <span className="text-destructive">*</span></Label>
                          <Input type="number" min="1" className="h-8 text-sm" value={line.quantity} onChange={e => updateLine(idx,"quantity",e.target.value)} required/>
                        </div>
                        {/* Unit Price */}
                        <div className="col-span-4 sm:col-span-2 space-y-1">
                          <Label className="text-xs">Unit Price</Label>
                          <Input type="number" step="0.0001" min="0" className="h-8 text-sm" placeholder="Auto" value={line.unitPrice} onChange={e => updateLine(idx,"unitPrice",e.target.value)}/>
                        </div>
                        {/* Total Price */}
                        <div className="col-span-4 sm:col-span-2 space-y-1">
                          <Label className="text-xs">Total Price</Label>
                          <Input type="number" step="0.01" min="0" className="h-8 text-sm" placeholder="Auto" value={(line as any).totalPrice} onChange={e => updateLine(idx,"totalPrice",e.target.value)}/>
                        </div>
                        {/* Remove */}
                        <div className="col-span-12 sm:col-span-4 flex justify-end items-end">
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setLines(l => l.filter((_,i) => i !== idx))} disabled={lines.length === 1}>
                            <X className="h-4 w-4"/>
                          </Button>
                        </div>
                        {/* Row 2: batch + expiry + note */}
                        <div className="col-span-4 space-y-1">
                          <Label className="text-xs">Batch No</Label>
                          <Input className="h-8 text-sm" placeholder="Optional" value={line.batchNo} onChange={e => updateLine(idx,"batchNo",e.target.value)}/>
                        </div>
                        <div className="col-span-4 space-y-1">
                          <Label className="text-xs">Expiry Date</Label>
                          <input type="date" value={line.expiryDate} onChange={e => updateLine(idx,"expiryDate",e.target.value)} className={`${dateInputCls} h-8 text-sm`}/>
                        </div>
                        <div className="col-span-4 space-y-1">
                          <Label className="text-xs">Note</Label>
                          <Input className="h-8 text-sm" placeholder="Optional" value={line.note} onChange={e => updateLine(idx,"note",e.target.value)}/>
                        </div>
                      </div>
                      {line.quantity && line.unitPrice && (
                        <p className="text-xs text-right text-muted-foreground">
                          ✓ <span className="font-semibold text-primary">{fmt(Number(line.quantity)*Number(line.unitPrice))}</span> — Unit: {fmt(line.unitPrice)}
                        </p>
                      )}
                    </div>
                  ))}

                  {/* Add Item button - below last entry */}
                  <Button type="button" variant="outline" size="sm" className="w-full border-dashed gap-2" onClick={() => setLines(l => [...l, emptyLine()])}>
                    <Plus className="h-4 w-4"/>Add Another Item
                  </Button>

                  {/* Grand total */}
                  {lineTotal > 0 && (
                    <div className="flex justify-between items-center bg-primary/5 border border-primary/20 rounded-md px-4 py-2">
                      <span className="text-sm font-medium">{lines.length} item{lines.length>1?"s":""} — Grand Total</span>
                      <span className="font-bold text-primary text-lg">{fmt(lineTotal)}</span>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); setHeader({supplier:"",invoiceNo:"",purchasedAt:format(new Date(),"yyyy-MM-dd")}); setLines([emptyLine()]); }}>Cancel</Button>
                  <Button type="submit" disabled={submitting || !header.supplier.trim() || lines.some(l => !l.itemId || !l.quantity || !l.unitPrice)}>
                    {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Recording…</> : `Record ${lines.length} Purchase${lines.length>1?"s":""}`}
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
                {isLoading ? Array(5).fill(0).map((_,i) => (
                  <TableRow key={i}>{Array(10).fill(0).map((_,j) => <TableCell key={j}><Skeleton className="h-4 w-full"/></TableCell>)}</TableRow>
                )) : displayed.length > 0 ? displayed.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm font-medium whitespace-nowrap">{format(parseISO(p.purchasedAt),"d MMM yyyy")}</TableCell>
                    <TableCell className="text-sm font-medium">{p.supplier}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{p.invoiceNo||"—"}</TableCell>
                    <TableCell><div className="font-medium text-sm">{p.item?.description}</div><div className="text-xs text-muted-foreground">{p.item?.unit}</div></TableCell>
                    <TableCell className="text-right font-mono text-sm">{p.quantity}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(p.unitPrice)}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold text-primary">{fmt(Number(p.quantity)*Number(p.unitPrice))}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{(p as any).batchNo||"—"}</TableCell>
                    <TableCell>{expiryBadge((p as any).expiryDate)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {canEdit && <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5"/></Button>}
                        {canDelete && <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => { if(confirm("Delete this purchase?")) deletePurchase.mutate({purchaseId:p.id}); }}><Trash2 className="h-3.5 w-3.5"/></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={10} className="h-32 text-center text-muted-foreground"><ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-40"/>No purchases found for selected date range</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Edit Dialog */}
        {editForm && (
          <Dialog open={editDialogOpen} onOpenChange={v => { setEditDialogOpen(v); if(!v) setEditForm(null); }}>
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
                      <Input value={editForm.supplier} onChange={e => setEditForm({...editForm,supplier:e.target.value.toUpperCase()})} required/>
                    </div>
                    <div className="space-y-2">
                      <Label>Invoice No</Label>
                      <Input value={editForm.invoiceNo} onChange={e => setEditForm({...editForm,invoiceNo:e.target.value})}/>
                    </div>
                    <div className="space-y-2">
                      <Label>Purchase Date</Label>
                      <input type="date" value={editForm.purchasedAt} onChange={e => setEditForm({...editForm,purchasedAt:e.target.value})} required className={dateInputCls}/>
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input type="number" min="1" value={editForm.quantity} onChange={e => setEditForm({...editForm,quantity:e.target.value})} required/>
                    </div>
                    <div className="space-y-2">
                      <Label>Unit Price (KES)</Label>
                      <Input type="number" step="0.01" min="0" value={editForm.unitPrice} onChange={e => setEditForm({...editForm,unitPrice:e.target.value})} required/>
                    </div>
                    <div className="space-y-2">
                      <Label>Batch No</Label>
                      <Input value={editForm.batchNo} onChange={e => setEditForm({...editForm,batchNo:e.target.value})}/>
                    </div>
                    <div className="space-y-2">
                      <Label>Expiry Date</Label>
                      <input type="date" value={editForm.expiryDate} onChange={e => setEditForm({...editForm,expiryDate:e.target.value})} className={dateInputCls}/>
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Note</Label>
                      <Input value={editForm.note} onChange={e => setEditForm({...editForm,note:e.target.value})}/>
                    </div>
                  </div>
                  {editForm.quantity && editForm.unitPrice && (
                    <div className="bg-primary/5 border border-primary/20 rounded-md px-3 py-2 text-sm">
                      Total: <span className="font-bold text-primary">{fmt(Number(editForm.quantity)*Number(editForm.unitPrice))}</span>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setEditDialogOpen(false); setEditForm(null); }}>Cancel</Button>
                  <Button type="submit" disabled={editLoading}>{editLoading?"Saving…":"Save Changes"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Layout>
  );
}
