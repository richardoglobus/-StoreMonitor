import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Layout } from "@/components/layout";
import {
  useListStockMovements, getListStockMovementsQueryKey,
  useListStockBalances, getListStockBalancesQueryKey,
  useCreateStockAdjustment,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, PackageSearch } from "lucide-react";
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

export default function StockMovementPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  if (!user?.permissions?.viewReports) { setLocation("/"); return null; }
  const canManage = !!user?.permissions?.managePurchases;

  const [itemFilter, setItemFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ date: format(new Date(), "yyyy-MM-dd"), itemCode: "", description: "", unit: "", adjustmentQty: "", reason: "" });

  const params = itemFilter !== "all" ? { itemCode: itemFilter } : {};
  const { data: movements, isLoading } = useListStockMovements(params, { query: { queryKey: getListStockMovementsQueryKey(params) } });
  const { data: balances } = useListStockBalances({ query: { queryKey: getListStockBalancesQueryKey() } });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListStockMovementsQueryKey({}) });
    queryClient.invalidateQueries({ queryKey: getListStockBalancesQueryKey() });
  };

  const createAdjustment = useCreateStockAdjustment({
    mutation: {
      onSuccess: () => { toast.success("Stock adjustment recorded"); invalidate(); setIsDialogOpen(false); setForm({ date: format(new Date(), "yyyy-MM-dd"), itemCode: "", description: "", unit: "", adjustmentQty: "", reason: "" }); },
      onError: (e: any) => toast.error(e?.error || "Failed to record adjustment"),
      onSettled: () => setSubmitting(false),
    },
  });

  const handleSubmit = () => {
    if (!form.itemCode.trim()) { toast.error("Item is required"); return; }
    if (!Number(form.adjustmentQty)) { toast.error("Enter a non-zero adjustment quantity"); return; }
    if (!form.reason.trim()) { toast.error("Reason is required (in case physical count differs from system balance)"); return; }
    setSubmitting(true);
    createAdjustment.mutate({ data: form });
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><PackageSearch className="h-6 w-6"/>Stock Movement</h1>
          <p className="text-sm text-muted-foreground">Opening stock, receipts, issues and balances per item. Populated automatically when a GRN is approved.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={itemFilter} onValueChange={setItemFilter}>
            <SelectTrigger className="w-56"><SelectValue placeholder="All items"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All items</SelectItem>
              {(balances ?? []).map(b => <SelectItem key={b.itemCode} value={b.itemCode}>{b.description}</SelectItem>)}
            </SelectContent>
          </Select>
          {canManage && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4"/>Stock Adjustment</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Record Stock Adjustment</DialogTitle></DialogHeader>
                <p className="text-xs text-muted-foreground -mt-2">Use this when a physical count differs from the system balance.</p>
                <div className="space-y-3 py-2">
                  <div className="space-y-1"><Label>Date</Label><input type="date" className={dateCls} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}/></div>
                  <div className="space-y-1"><Label>Item Code / Name</Label><Input value={form.itemCode} onChange={e => setForm(f => ({ ...f, itemCode: e.target.value, description: f.description || e.target.value }))} placeholder="e.g. PARACETAMOL 500MG TABS"/></div>
                  <div className="space-y-1"><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}/></div>
                  <div className="space-y-1"><Label>Unit</Label><Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}/></div>
                  <div className="space-y-1"><Label>Adjustment Qty (use negative to reduce)</Label><Input type="number" value={form.adjustmentQty} onChange={e => setForm(f => ({ ...f, adjustmentQty: e.target.value }))}/></div>
                  <div className="space-y-1"><Label>Reason</Label><Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="e.g. Physical count discrepancy"/></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Saving..." : "Save Adjustment"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {itemFilter === "all" && (
        <Card className="overflow-x-auto mb-6">
          <div className="p-4 border-b"><h2 className="font-semibold text-sm">Current Balances</h2></div>
          <Table>
            <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Unit</TableHead><TableHead className="text-right">Available Balance</TableHead></TableRow></TableHeader>
            <TableBody>
              {(balances ?? []).length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No stock movements yet.</TableCell></TableRow>}
              {(balances ?? []).map(b => (
                <TableRow key={b.itemCode}>
                  <TableCell className="font-medium">{b.description}</TableCell>
                  <TableCell>{b.unit ?? "—"}</TableCell>
                  <TableCell className="text-right">{b.balance <= 0 ? <Badge variant="destructive">{b.balance}</Badge> : b.balance}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <div className="p-4 border-b"><h2 className="font-semibold text-sm">Movement History</h2></div>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Date</TableHead><TableHead>Reference</TableHead><TableHead>Item</TableHead><TableHead>Transaction</TableHead><TableHead className="text-right">Qty In</TableHead><TableHead className="text-right">Qty Out</TableHead><TableHead className="text-right">Balance</TableHead><TableHead>Note</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 4 }).map((_, i) => <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-6 w-full"/></TableCell></TableRow>)}
            {!isLoading && (movements ?? []).length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No movements recorded.</TableCell></TableRow>}
            {(movements ?? []).map(m => (
              <TableRow key={m.id}>
                <TableCell>{m.date}</TableCell>
                <TableCell>{m.reference}</TableCell>
                <TableCell>{m.description}</TableCell>
                <TableCell><Badge variant="outline">{m.transactionType}</Badge></TableCell>
                <TableCell className="text-right">{m.qtyIn > 0 ? m.qtyIn : "—"}</TableCell>
                <TableCell className="text-right">{m.qtyOut > 0 ? m.qtyOut : "—"}</TableCell>
                <TableCell className="text-right font-medium">{m.balance}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{m.note ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Layout>
  );
}
