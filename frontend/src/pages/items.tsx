import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import {
  useListItemStock, getListItemStockQueryKey,
  useCreateItem, useUpdateItem, useDeleteItem,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PackageSearch, Plus, Search, Pencil, Trash2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";

// Collect all unique units from existing items + a base list
// Canonical units only — no duplicates (PIECE covers PC/PCS, PACKET covers PKT, etc.)
const BASE_UNITS = [
  "AMPOULE","BOTTLE","BOX","CAPSULE","DOZEN","GRAM","INJECTION",
  "KILOGRAM","LITRE","MILLILITRE","PACKET","PAIR","PIECE","ROLL",
  "SACHET","SET","SHEET","TABLET","TUBE","VIAL"
];
// Map common aliases → canonical so old data still matches
const UNIT_ALIASES: Record<string,string> = {
  PC:"PIECE",PCS:"PIECE",PKT:"PACKET",KG:"KILOGRAM",G:"GRAM",
  ML:"MILLILITRE",L:"LITRE",AMPL:"AMPOULE",
};
function canonicalUnit(u: string): string {
  const up = u.trim().toUpperCase();
  return UNIT_ALIASES[up] ?? up;
}

function UnitCombobox({ value, onChange, existingUnits }: { value: string; onChange: (v: string) => void; existingUnits: string[] }) {
  const [open, setOpen] = useState(false);
  const allUnits = Array.from(new Set([...BASE_UNITS, ...existingUnits.map(canonicalUnit)])).sort();
  const filtered = allUnits.filter(u => u.toLowerCase().includes(value.toLowerCase()));
  const showNew = value.trim() && !allUnits.some(u => u.toLowerCase() === value.toLowerCase());

  return (
    <div className="relative">
      <Input
        placeholder="e.g. PKT, ROLL, BOX"
        value={value}
        onChange={e => { onChange(e.target.value.toUpperCase()); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
      />
      {open && (filtered.length > 0 || showNew) && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filtered.map(u => (
            <div key={u} className="px-3 py-2 text-sm cursor-pointer hover:bg-muted font-mono"
              onMouseDown={() => { onChange(u); setOpen(false); }}>
              {u}
            </div>
          ))}
          {showNew && (
            <div className="px-3 py-2 text-sm cursor-pointer hover:bg-muted text-primary font-mono border-t"
              onMouseDown={() => { onChange(value.toUpperCase()); setOpen(false); }}>
              + Add new unit: <strong>{value.toUpperCase()}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Items() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canManageCatalog = !!user?.permissions?.manageCatalog;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editItemId, setEditItemId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [newItem, setNewItem] = useState({ description: "", unit: "", quantity: "0", lowStockThreshold: "10" });
  const [editItem, setEditItem] = useState({ description: "", unit: "", quantity: "0", lowStockThreshold: "10" });

  const { data: items, isLoading } = useListItemStock({ query: { queryKey: getListItemStockQueryKey() } });

  const existingUnits = useMemo(() => Array.from(new Set((items??[]).map(i=>i.unit.toUpperCase()))), [items]);

  // Fuzzy match for duplicate detection
  const similarItems = useMemo(() => {
    if (!newItem.description.trim() || !items) return [];
    const q = newItem.description.toLowerCase();
    return items.filter(item => {
      const d = item.description.toLowerCase();
      return d.includes(q.slice(0, Math.max(3, q.length - 2))) || q.includes(d.slice(0, Math.max(3, d.length - 2)));
    }).slice(0, 3);
  }, [newItem.description, items]);

  const createItem = useCreateItem({
    mutation: {
      onSuccess: () => {
        toast.success("Item created successfully");
        queryClient.invalidateQueries({ queryKey: getListItemStockQueryKey() });
        setIsDialogOpen(false);
        setNewItem({ description: "", unit: "", quantity: "0" });
      },
      onError: (err: any) => toast.error(err?.error || "Failed to create item — may already exist"),
    }
  });
  const updateItem = useUpdateItem({
    mutation: {
      onSuccess: () => {
        toast.success("Item updated");
        queryClient.invalidateQueries({ queryKey: getListItemStockQueryKey() });
        setEditDialogOpen(false); setEditItemId(null);
      },
      onError: (err: any) => toast.error(err?.error || "Failed to update item"),
    }
  });
  const deleteItem = useDeleteItem({
    mutation: {
      onSuccess: () => { toast.success("Item deleted"); queryClient.invalidateQueries({ queryKey: getListItemStockQueryKey() }); },
      onError: (err: any) => toast.error(err?.error || "Failed to delete item"),
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.description.trim() || !newItem.unit.trim()) return;
    // Save in UPPERCASE
    createItem.mutate({ data: { description: newItem.description.trim().toUpperCase(), unit: newItem.unit.trim().toUpperCase(), quantity: Number(newItem.quantity)||0, lowStockThreshold: newItem.lowStockThreshold!==''?Number(newItem.lowStockThreshold):null } as any });
  };

  const handleDelete = (id: number) => { if (!confirm("Delete this item?")) return; deleteItem.mutate({ itemId: id }); };

  const openEditDialog = (item: any) => {
    setEditItemId(item.id);
    setEditItem({ description: item.description, unit: item.unit, quantity: String(item.quantity??0), lowStockThreshold: item.lowStockThreshold!=null?String(item.lowStockThreshold):"10" });
    setEditDialogOpen(true);
  };
  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItemId || !editItem.description.trim() || !editItem.unit.trim()) return;
    updateItem.mutate({ itemId: editItemId, data: { description: editItem.description.trim().toUpperCase(), unit: editItem.unit.trim().toUpperCase(), quantity: Number(editItem.quantity)||0, lowStockThreshold: editItem.lowStockThreshold!==''?Number(editItem.lowStockThreshold):null } as any });
  };

  const filteredItems = items?.filter(item => item.description.toLowerCase().includes(search.toLowerCase()));

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
          {canManageCatalog && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2"/>Add Item</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add New Item</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        placeholder="e.g. COTTON WOOL 500G"
                        value={newItem.description}
                        onChange={e => setNewItem({...newItem, description: e.target.value})}
                        autoFocus
                      />
                      {/* Duplicate warning */}
                      {similarItems.length > 0 && (
                        <div className="bg-amber-50 border border-amber-300 rounded-md p-3 space-y-1">
                          <p className="text-xs text-amber-700 font-semibold flex items-center gap-1">
                            <AlertCircle className="h-3 w-3"/>Similar items already exist:
                          </p>
                          {similarItems.map(s=>(
                            <p key={s.id} className="text-xs text-amber-600 font-mono pl-4">• {s.description} ({s.unit})</p>
                          ))}
                          <p className="text-xs text-amber-600 pl-4">Make sure you're not adding a duplicate.</p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Unit</Label>
                      <UnitCombobox value={newItem.unit} onChange={v=>setNewItem({...newItem,unit:v})} existingUnits={existingUnits}/>
                    </div>
                    <div className="space-y-2">
                      <Label>Physical Quantity</Label>
                      <Input type="number" min="0" value={newItem.quantity} onChange={e=>setNewItem({...newItem,quantity:e.target.value})}/>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        Low Stock Alert Threshold
                        <span className="text-xs text-muted-foreground font-normal">(warn when stock falls to this level)</span>
                      </Label>
                      <Input type="number" min="0" placeholder="e.g. 10" value={newItem.lowStockThreshold} onChange={e=>setNewItem({...newItem,lowStockThreshold:e.target.value})}/>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={()=>setIsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={!newItem.description.trim()||!newItem.unit.trim()||createItem.isPending}>
                      {createItem.isPending?"Adding...":"Add Item"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="bg-card border rounded-lg overflow-hidden flex flex-col">
          <div className="p-4 border-b flex items-center gap-2 bg-muted/30">
            <Search className="h-4 w-4 text-muted-foreground"/>
            <Input placeholder="Search items..." value={search} onChange={e=>setSearch(e.target.value)} className="max-w-sm h-8 bg-background"/>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-24 text-center">Unit</TableHead>
                  <TableHead className="w-28 text-right">Physical Qty</TableHead>
                  <TableHead className="w-28 text-right">Purchased</TableHead>
                  <TableHead className="w-28 text-right">Issued</TableHead>
                  <TableHead className="w-28 text-right">In Stock</TableHead>
                  <TableHead className="w-20 text-right">Alert At</TableHead>
                  {canManageCatalog && <TableHead className="w-24 text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array(5).fill(0).map((_,i)=>(
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-48"/></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 mx-auto"/></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto"/></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto"/></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto"/></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto"/></TableCell>
                    {canManageCatalog&&<TableCell><Skeleton className="h-4 w-12 ml-auto"/></TableCell>}
                  </TableRow>
                )) : filteredItems&&filteredItems.length>0 ? filteredItems.map(item=>(
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell className="text-center"><Badge variant="secondary" className="font-normal">{item.unit}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{item.quantity??0}</TableCell>
                    <TableCell className="text-right font-mono">{item.purchasedTotal}</TableCell>
                    <TableCell className="text-right font-mono">{item.issuedTotal}</TableCell>
                    <TableCell className={`text-right font-mono ${getStockColorClass(item.stockBalance)}`}>{item.stockBalance<=0?"OUT":item.stockBalance}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">{item.lowStockThreshold!=null?item.lowStockThreshold:10}</TableCell>
                    {canManageCatalog&&(
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={()=>openEditDialog(item)}><Pencil className="h-4 w-4"/></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={()=>handleDelete(item.id)}><Trash2 className="h-4 w-4"/></Button>
                      </TableCell>
                    )}
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={canManageCatalog?7:6} className="h-32 text-center text-muted-foreground">
                      <PackageSearch className="h-8 w-8 mx-auto mb-2 opacity-50"/>
                      {search?"No items match your search":"No items found in catalog"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Item</DialogTitle></DialogHeader>
            <form onSubmit={handleEditSave}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={editItem.description} onChange={e=>setEditItem({...editItem,description:e.target.value})}/>
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <UnitCombobox value={editItem.unit} onChange={v=>setEditItem({...editItem,unit:v})} existingUnits={existingUnits}/>
                </div>
                <div className="space-y-2">
                  <Label>Physical Quantity</Label>
                  <Input type="number" min="0" value={editItem.quantity} onChange={e=>setEditItem({...editItem,quantity:e.target.value})}/>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    Low Stock Threshold
                    <span className="text-xs text-muted-foreground font-normal">(alert when at or below)</span>
                  </Label>
                  <Input type="number" min="0" placeholder="e.g. 10" value={editItem.lowStockThreshold} onChange={e=>setEditItem({...editItem,lowStockThreshold:e.target.value})}/>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={()=>setEditDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={updateItem.isPending||!editItem.description.trim()||!editItem.unit.trim()}>
                  {updateItem.isPending?"Saving...":"Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
