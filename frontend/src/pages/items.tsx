import { useState } from "react";
import { Layout } from "@/components/layout";
import {
  useListItemStock,
  getListItemStockQueryKey,
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PackageSearch, Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";

export default function Items() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canManageCatalog = !!user?.permissions?.manageCatalog;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editItemId, setEditItemId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [newItem, setNewItem] = useState({ description: "", unit: "", quantity: "0" });
  const [editItem, setEditItem] = useState({ description: "", unit: "", quantity: "0" });

  const { data: items, isLoading } = useListItemStock({
    query: { queryKey: getListItemStockQueryKey() }
  });

  const createItem = useCreateItem({
    mutation: {
      onSuccess: () => {
        toast.success("Item created successfully");
        queryClient.invalidateQueries({ queryKey: getListItemStockQueryKey() });
        setIsDialogOpen(false);
        setNewItem({ description: "", unit: "", quantity: "0" });
      },
      onError: () => {
        toast.error("Failed to create item");
      }
    }
  });
  const updateItem = useUpdateItem({
    mutation: {
      onSuccess: () => {
        toast.success("Item updated successfully");
        queryClient.invalidateQueries({ queryKey: getListItemStockQueryKey() });
        setEditDialogOpen(false);
        setEditItemId(null);
      },
      onError: (err: any) => toast.error(err?.error || "Failed to update item")
    }
  });
  const deleteItem = useDeleteItem({
    mutation: {
      onSuccess: () => {
        toast.success("Item deleted");
        queryClient.invalidateQueries({ queryKey: getListItemStockQueryKey() });
      },
      onError: (err: any) => toast.error(err?.error || "Failed to delete item")
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.description.trim() || !newItem.unit.trim()) return;
    createItem.mutate({ data: { ...newItem, quantity: Number(newItem.quantity) || 0 } as any });
  };
  const handleDelete = (id: number) => {
    if (!confirm("Delete this item?")) return;
    deleteItem.mutate({ itemId: id });
  };
  const openEditDialog = (item: any) => {
    setEditItemId(item.id);
    setEditItem({
      description: item.description,
      unit: item.unit,
      quantity: String(item.quantity ?? 0)
    });
    setEditDialogOpen(true);
  };
  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItemId || !editItem.description.trim() || !editItem.unit.trim()) return;
    updateItem.mutate({
      itemId: editItemId,
      data: {
        description: editItem.description.trim(),
        unit: editItem.unit.trim(),
        quantity: Number(editItem.quantity) || 0
      }
    });
  };

  const filteredItems = items?.filter(item => 
    item.description.toLowerCase().includes(search.toLowerCase())
  );

  const getStockBadgeVariant = (balance: number) => {
    if (balance <= 0) return "destructive";
    if (balance <= 10) return "warning"; // Need to handle warning color if not in shadcn default
    return "secondary";
  };

  const getStockColorClass = (balance: number) => {
    if (balance <= 0) return "text-destructive font-bold";
    if (balance <= 10) return "text-orange-500 font-bold";
    return "text-green-600 font-bold";
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Item Catalog</h1>
            <p className="text-muted-foreground">Master list of all hospital supplies with current stock levels.</p>
          </div>
          {canManageCatalog && <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Item</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="desc">Description</Label>
                    <Input
                      id="desc"
                      placeholder="e.g. Cotton Wool 500g"
                      value={newItem.description}
                      onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Input
                      id="unit"
                      placeholder="e.g. Roll, Pkt, Box"
                      value={newItem.unit}
                      onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Physical Quantity</Label>
                    <Input id="quantity" type="number" min="0" value={newItem.quantity} onChange={(e) => setNewItem({...newItem, quantity: e.target.value})} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={!newItem.description.trim() || !newItem.unit.trim() || createItem.isPending}>
                    {createItem.isPending ? "Adding..." : "Add Item"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>}
        </div>

        <div className="bg-card border rounded-lg overflow-hidden flex flex-col">
          <div className="p-4 border-b flex items-center gap-2 bg-muted/30">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search items..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm h-8 bg-background"
            />
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-24 text-center">Unit</TableHead>
                  <TableHead className="w-32 text-right">Physical Qty</TableHead>
                  <TableHead className="w-32 text-right">Purchased</TableHead>
                  <TableHead className="w-32 text-right">Issued</TableHead>
                  <TableHead className="w-32 text-right">In Stock</TableHead>
                  {canManageCatalog && <TableHead className="w-24 text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      {canManageCatalog && <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>}
                    </TableRow>
                  ))
                ) : filteredItems && filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.description}
                        <div className="text-[10px] text-muted-foreground font-mono">ID: {item.id}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-normal">{item.unit}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{item.quantity ?? 0}</TableCell>
                      <TableCell className="text-right font-mono">{item.purchasedTotal}</TableCell>
                      <TableCell className="text-right font-mono">{item.issuedTotal}</TableCell>
                      <TableCell className={`text-right font-mono ${getStockColorClass(item.stockBalance)}`}>
                        {item.stockBalance}
                      </TableCell>
                      {canManageCatalog && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={canManageCatalog ? 8 : 7} className="h-32 text-center text-muted-foreground">
                      <PackageSearch className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      {search ? "No items match your search" : "No items found in catalog"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSave}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-desc">Description</Label>
                  <Input id="edit-desc" value={editItem.description} onChange={(e) => setEditItem({ ...editItem, description: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-unit">Unit (full name)</Label>
                  <Input id="edit-unit" value={editItem.unit} onChange={(e) => setEditItem({ ...editItem, unit: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-quantity">Physical Quantity</Label>
                  <Input id="edit-quantity" type="number" min="0" value={editItem.quantity} onChange={(e) => setEditItem({ ...editItem, quantity: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={updateItem.isPending || !editItem.description.trim() || !editItem.unit.trim()}>
                  {updateItem.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
