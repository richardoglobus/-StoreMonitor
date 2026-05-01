import { useState } from "react";
import { format } from "date-fns";
import { Layout } from "@/components/layout";
import { MonthPicker, getCurrentMonth } from "@/components/month-picker";
import {
  useListPurchases,
  getListPurchasesQueryKey,
  useCreatePurchase,
  useDeletePurchase,
  useListItems,
  getListItemsQueryKey,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, ShoppingCart } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";

export default function Purchases() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  if (!user?.permissions?.managePurchases) {
    setLocation("/");
    return null;
  }
  const [month, setMonth] = useState(getCurrentMonth());
  const canDeleteTransactions = !!user?.permissions?.deleteTransactions;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [commoditySearch, setCommoditySearch] = useState("");
  const [purchaseData, setPurchaseData] = useState({
    supplier: "",
    invoiceNo: "",
    itemId: "",
    quantity: "",
    unitPrice: "",
    purchasedAt: format(new Date(), "yyyy-MM-dd"),
    note: ""
  });

  const { data: items } = useListItems({ query: { queryKey: getListItemsQueryKey() } });
  
  const queryParams = { month };
  const { data: purchases, isLoading } = useListPurchases(
    queryParams,
    { query: { queryKey: getListPurchasesQueryKey(queryParams) } }
  );

  const createPurchase = useCreatePurchase({
    mutation: {
      onSuccess: () => {
        toast.success("Purchase recorded successfully");
        queryClient.invalidateQueries({ queryKey: getListPurchasesQueryKey(queryParams) });
        setIsDialogOpen(false);
        setPurchaseData({
          supplier: "",
          invoiceNo: "",
          itemId: "",
          quantity: "",
          unitPrice: "",
          purchasedAt: format(new Date(), "yyyy-MM-dd"),
          note: ""
        });
      },
      onError: () => toast.error("Failed to record purchase")
    }
  });

  const deletePurchase = useDeletePurchase({
    mutation: {
      onSuccess: () => {
        toast.success("Purchase deleted");
        queryClient.invalidateQueries({ queryKey: getListPurchasesQueryKey(queryParams) });
      },
      onError: () => toast.error("Failed to delete purchase")
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseData.supplier.trim() || !purchaseData.invoiceNo.trim() || !purchaseData.itemId || !purchaseData.quantity || !purchaseData.unitPrice || !purchaseData.purchasedAt) return;
    
    createPurchase.mutate({
      data: {
        supplier: purchaseData.supplier.trim(),
        invoiceNo: purchaseData.invoiceNo.trim(),
        itemId: Number(purchaseData.itemId),
        quantity: Number(purchaseData.quantity),
        unitPrice: Number(purchaseData.unitPrice),
        purchasedAt: purchaseData.purchasedAt,
        note: purchaseData.note || undefined
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this purchase record?")) {
      deletePurchase.mutate({ purchaseId: id });
    }
  };

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(value));
  };
  const filteredItems = items?.filter(item => item.description.toLowerCase().includes(commoditySearch.toLowerCase()));

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Purchases</h1>
            <p className="text-muted-foreground">Manage and track incoming supply purchases.</p>
          </div>
          <MonthPicker month={month} onChange={setMonth} />
        </div>

        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Purchase
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Record New Purchase</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier / Company</Label>
                    <Input 
                      id="supplier" 
                      placeholder="e.g. KEMSA, MEDS, Private Supplier" 
                      value={purchaseData.supplier} 
                      onChange={e => setPurchaseData({...purchaseData, supplier: e.target.value})} 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoiceNo">Invoice Number</Label>
                    <Input id="invoiceNo" value={purchaseData.invoiceNo} onChange={e => setPurchaseData({...purchaseData, invoiceNo: e.target.value})} placeholder="e.g. INV-0001" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Commodity (Item)</Label>
                    <Input placeholder="Type/search commodity..." value={commoditySearch} onChange={e => setCommoditySearch(e.target.value)} />
                    <Select value={purchaseData.itemId} onValueChange={v => setPurchaseData({...purchaseData, itemId: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredItems?.map(item => (
                          <SelectItem key={item.id} value={item.id.toString()}>{item.description}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="qty">Quantity</Label>
                      <Input 
                        id="qty" 
                        type="number" 
                        min="1" 
                        value={purchaseData.quantity} 
                        onChange={e => setPurchaseData({...purchaseData, quantity: e.target.value})} 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Unit Price</Label>
                      <Input 
                        id="price" 
                        type="number" 
                        step="0.01" 
                        min="0" 
                        value={purchaseData.unitPrice} 
                        onChange={e => setPurchaseData({...purchaseData, unitPrice: e.target.value})} 
                        required 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Purchase Date</Label>
                    <Input 
                      id="date" 
                      type="date" 
                      value={purchaseData.purchasedAt} 
                      onChange={e => setPurchaseData({...purchaseData, purchasedAt: e.target.value})} 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="note">Note (Optional)</Label>
                    <Input 
                      id="note" 
                      value={purchaseData.note} 
                      onChange={e => setPurchaseData({...purchaseData, note: e.target.value})} 
                      placeholder="Batch number, expiry, etc." 
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createPurchase.isPending || !purchaseData.supplier.trim() || !purchaseData.invoiceNo.trim()}>
                    {createPurchase.isPending ? "Recording..." : "Record Purchase"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-32">Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ))
                ) : purchases && purchases.length > 0 ? (
                  purchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell className="font-medium text-sm whitespace-nowrap">
                        {format(new Date(purchase.purchasedAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-sm">{purchase.supplier}</TableCell>
                      <TableCell className="text-sm">{purchase.invoiceNo || "-"}</TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{purchase.item?.description}</div>
                        <div className="text-xs text-muted-foreground">{purchase.item?.unit}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{purchase.quantity}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(purchase.unitPrice)}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        {formatCurrency(purchase.quantity * Number(purchase.unitPrice))}
                      </TableCell>
                      <TableCell className="text-right">
                        {canDeleteTransactions && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(purchase.id)}
                            disabled={deletePurchase.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                      <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No purchases found for this month
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
