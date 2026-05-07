import { useState } from "react";
import { format, parseISO, differenceInDays } from "date-fns";
import { Layout } from "@/components/layout";
import { DateRangePicker, firstOfMonth, todayStr } from "@/components/date-range-picker";
import {
  useListPurchases, getListPurchasesQueryKey,
  useCreatePurchase, useDeletePurchase,
  useListItems, getListItemsQueryKey,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, ShoppingCart, Download, FileSpreadsheet, Search, Loader2, AlertTriangle } from "lucide-react";
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

const EMPTY_FORM = {
  supplier: "", invoiceNo: "", itemId: "", quantity: "", unitPrice: "",
  purchasedAt: format(new Date(), "yyyy-MM-dd"), batchNo: "", expiryDate: "", note: ""
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
  const [itemSearch, setItemSearch] = useState("");
  const [loadingCsv, setLoadingCsv] = useState(false);
  const [loadingXlsx, setLoadingXlsx] = useState(false);

  const { data: items } = useListItems({ query: { queryKey: getListItemsQueryKey() } });

  const month = from.slice(0, 7);
  const queryParams = { month };
  const { data: purchases, isLoading } = useListPurchases(queryParams, { query: { queryKey: getListPurchasesQueryKey(queryParams) } });

  const createPurchase = useCreatePurchase({
    mutation: {
      onSuccess: () => {
        toast.success("Purchase recorded successfully");
        queryClient.invalidateQueries({ queryKey: getListPurchasesQueryKey(queryParams) });
        setIsDialogOpen(false);
        setForm(EMPTY_FORM);
        setItemSearch("");
      },
      onError: (e: any) => toast.error(e?.error || "Failed to record purchase")
    }
  });

  const deletePurchase = useDeletePurchase({
    mutation: {
      onSuccess: () => { toast.success("Purchase deleted"); queryClient.invalidateQueries({ queryKey: getListPurchasesQueryKey(queryParams) }); },
      onError: () => toast.error("Failed to delete purchase")
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.supplier.trim() || !form.itemId || !form.quantity || !form.unitPrice) return;
    createPurchase.mutate({ data: {
      supplier: form.supplier.trim(),
      invoiceNo: form.invoiceNo.trim() || undefined,
      itemId: Number(form.itemId),
      quantity: Number(form.quantity),
      unitPrice: Number(form.unitPrice),
      purchasedAt: form.purchasedAt,
      batchNo: form.batchNo.trim() || undefined,
      expiryDate: form.expiryDate || undefined,
      note: form.note || undefined,
    } as any });
  };

  const fmt = (v: any) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(Number(v));

  const filteredItems = items?.filter(i => i.description.toLowerCase().includes(itemSearch.toLowerCase()));

  // Filter displayed purchases by date range and search
  const displayed = (purchases || []).filter(p => {
    const inRange = p.purchasedAt >= from && p.purchasedAt <= to;
    const matchSearch = !search || p.supplier?.toLowerCase().includes(search.toLowerCase()) || p.item?.description?.toLowerCase().includes(search.toLowerCase()) || p.invoiceNo?.toLowerCase().includes(search.toLowerCase());
    return inRange && matchSearch;
  });

  const totalValue = displayed.reduce((s, p) => s + Number(p.quantity) * Number(p.unitPrice), 0);
  const csvUrl = `/api/export/purchases.csv?from=${from}&to=${to}`;
  const xlsxUrl = `/api/export/purchases.xlsx?from=${from}&to=${to}`;

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
              <input placeholder="Search supplier, item, invoice…" value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent text-sm outline-none w-48"/>
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

        {/* Add purchase button */}
        <div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4"/>Add Purchase</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader><DialogTitle>Record New Purchase</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate}>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label>Supplier / Company <span className="text-destructive">*</span></Label>
                      <Input placeholder="e.g. KEMSA, MEDS" value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} required/>
                    </div>
                    <div className="space-y-2">
                      <Label>Invoice Number</Label>
                      <Input placeholder="e.g. INV-0001" value={form.invoiceNo} onChange={e => setForm({...form, invoiceNo: e.target.value})}/>
                    </div>
                    <div className="space-y-2">
                      <Label>Purchase Date <span className="text-destructive">*</span></Label>
                      <Input type="date" value={form.purchasedAt} onChange={e => setForm({...form, purchasedAt: e.target.value})} required/>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Commodity (Item) <span className="text-destructive">*</span></Label>
                    <div className="flex items-center gap-2 border rounded-md px-3 h-9 bg-background mb-1">
                      <Search className="h-4 w-4 text-muted-foreground"/>
                      <input placeholder="Type to filter items…" value={itemSearch} onChange={e => setItemSearch(e.target.value)} className="bg-transparent text-sm outline-none flex-1"/>
                    </div>
                    <Select value={form.itemId} onValueChange={v => { setForm({...form, itemId: v}); setItemSearch(""); }}>
                      <SelectTrigger><SelectValue placeholder="Select item"/></SelectTrigger>
                      <SelectContent>
                        {filteredItems?.map(i => <SelectItem key={i.id} value={i.id.toString()}>{i.description} ({i.unit})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Quantity <span className="text-destructive">*</span></Label>
                      <Input type="number" min="1" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} required/>
                    </div>
                    <div className="space-y-2">
                      <Label>Unit Price (KES) <span className="text-destructive">*</span></Label>
                      <Input type="number" step="0.01" min="0" value={form.unitPrice} onChange={e => setForm({...form, unitPrice: e.target.value})} required/>
                    </div>
                    <div className="space-y-2">
                      <Label>Batch Number</Label>
                      <Input placeholder="e.g. BCH-2024-001" value={form.batchNo} onChange={e => setForm({...form, batchNo: e.target.value})}/>
                    </div>
                    <div className="space-y-2">
                      <Label>Expiry Date</Label>
                      <Input type="date" value={form.expiryDate} onChange={e => setForm({...form, expiryDate: e.target.value})}/>
                      {form.expiryDate && differenceInDays(parseISO(form.expiryDate), new Date()) < 90 && (
                        <p className="text-xs text-amber-600 font-medium">⚠ This item expires soon</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Note (Optional)</Label>
                    <Input placeholder="Storage conditions, delivery details…" value={form.note} onChange={e => setForm({...form, note: e.target.value})}/>
                  </div>

                  {form.quantity && form.unitPrice && (
                    <div className="bg-primary/5 border border-primary/20 rounded-md px-3 py-2 text-sm">
                      Total: <span className="font-bold text-primary">{fmt(Number(form.quantity) * Number(form.unitPrice))}</span>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createPurchase.isPending || !form.supplier.trim() || !form.itemId || !form.quantity || !form.unitPrice}>
                    {createPurchase.isPending ? "Recording…" : "Record Purchase"}
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
                  {canDelete && <TableHead className="w-10"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    {Array(9).fill(0).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full"/></TableCell>)}
                  </TableRow>
                )) : displayed.length > 0 ? displayed.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm whitespace-nowrap font-medium">{format(parseISO(p.purchasedAt), "d MMM yyyy")}</TableCell>
                    <TableCell className="text-sm font-medium">{p.supplier}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{p.invoiceNo || "—"}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{p.item?.description}</div>
                      <div className="text-xs text-muted-foreground">{p.item?.unit}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{p.quantity}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(p.unitPrice)}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold text-primary">{fmt(Number(p.quantity) * Number(p.unitPrice))}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{(p as any).batchNo || "—"}</TableCell>
                    <TableCell>{expiryBadge((p as any).expiryDate)}</TableCell>
                    {canDelete && (
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => { if (confirm("Delete this purchase?")) deletePurchase.mutate({ purchaseId: p.id }); }}>
                          <Trash2 className="h-4 w-4"/>
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                )) : (
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
    </Layout>
  );
}
