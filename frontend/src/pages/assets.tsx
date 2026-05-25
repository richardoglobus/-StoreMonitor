import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout";
import { useAuth } from "@/lib/auth-context";
import { API_BASE } from "@/lib/api";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Package2, Plus, Pencil, Trash2, ArrowRightLeft, Download, Search, FolderPlus, ChevronLeft, ChevronRight, AlertTriangle, X } from "lucide-react";

interface Asset {
  id: number;
  category: string;
  description: string;
  quantity: string;
  serialNo: string;
  model: string;
  location: string;
  dateAcquired: string;
  status: string;
  ownership: string;
  notes: string;
}

interface AssetCategory { id: number; name: string; }

const PAGE_SIZE = 50;

function statusBadge(status: string) {
  const s = (status || "").toLowerCase();
  if (s.includes("non") || s.includes("not")) return <Badge variant="destructive" className="text-xs">{status}</Badge>;
  if (s.includes("repair") || s.includes("partial")) return <Badge className="text-xs bg-yellow-500 hover:bg-yellow-600">{status}</Badge>;
  return <Badge className="text-xs bg-green-600 hover:bg-green-700">{status}</Badge>;
}

const EMPTY_FORM = { description:"", category:"", quantity:"1", serialNo:"", model:"", location:"", dateAcquired:"", status:"FUNCTIONAL", ownership:"FACILITY OWNED", notes:"" };

export default function Assets() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const canManage = !!user?.permissions?.manageAssets;

  const [assets, setAssets]         = useState<Asset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading]        = useState(true);
  const [page, setPage]              = useState(1);

  // Filters
  const [search, setSearch]       = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterLoc, setFilterLoc] = useState("all");
  const [filterSt, setFilterSt]   = useState("all");

  // Dialogs
  const [addOpen, setAddOpen]         = useState(false);
  const [editAsset, setEditAsset]     = useState<Asset|null>(null);
  const [moveAsset, setMoveAsset]     = useState<Asset|null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Asset|null>(null);
  const [catOpen, setCatOpen]         = useState(false);
  const [form, setForm]               = useState({ ...EMPTY_FORM });
  const [moveForm, setMoveForm]       = useState({ location:"", category:"" });
  const [saving, setSaving]           = useState(false);

  // Category management
  const [newCatName, setNewCatName]   = useState("");
  const [editCat, setEditCat]         = useState<AssetCategory|null>(null);
  const [deleteCat, setDeleteCat]     = useState<AssetCategory|null>(null);

  // Locations not matching existing departments (mismatch warning)
  const [locationMismatches, setLocationMismatches] = useState<string[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, cRes, dRes] = await Promise.all([
        fetch(`${API_BASE}/api/assets`, { credentials:"include" }),
        fetch(`${API_BASE}/api/asset-categories`, { credentials:"include" }),
        fetch(`${API_BASE}/api/departments`, { credentials:"include" }),
      ]);
      const [a, c, d] = await Promise.all([aRes.json(), cRes.json(), dRes.json()]);
      setAssets(Array.isArray(a) ? a : []);
      setCategories(Array.isArray(c) ? c : []);
      const deptNames = (Array.isArray(d) ? d : []).map((dep: any) => dep.name.toUpperCase());
      setDepartments(deptNames);
      // Check location mismatches
      const assetLocations = [...new Set((Array.isArray(a) ? a : []).map((x: Asset) => (x.location||"").trim().toUpperCase()).filter(Boolean))];
      const mismatches = assetLocations.filter(l => !deptNames.includes(l));
      setLocationMismatches(mismatches);
    } catch { toast.error("Failed to load assets"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Filtered + paginated
  const filtered = assets.filter(a => {
    if (filterCat !== "all" && a.category !== filterCat) return false;
    if (filterLoc !== "all" && a.location !== filterLoc) return false;
    if (filterSt !== "all") {
      const s = (a.status||"").toLowerCase();
      if (filterSt === "functional" && (s.includes("non") || s.includes("not"))) return false;
      if (filterSt === "non-functional" && !s.includes("non") && !s.includes("not")) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return (a.description||"").toLowerCase().includes(q) ||
             (a.serialNo||"").toLowerCase().includes(q) ||
             (a.model||"").toLowerCase().includes(q) ||
             (a.location||"").toLowerCase().includes(q);
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  const uniqueLocs = [...new Set(assets.map(a => a.location).filter(Boolean))].sort();

  // Handlers
  const handleSave = async () => {
    if (!form.description || !form.category) { toast.error("Description and category are required"); return; }
    setSaving(true);
    try {
      const url  = editAsset ? `${API_BASE}/api/assets/${editAsset.id}` : `${API_BASE}/api/assets`;
      const method = editAsset ? "PATCH" : "POST";
      const res  = await fetch(url, { method, credentials:"include", headers:{"Content-Type":"application/json"}, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Save failed"); return; }
      toast.success(editAsset ? "Asset updated" : "Asset added");
      setAddOpen(false); setEditAsset(null); setForm({...EMPTY_FORM});
      fetchAll();
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`${API_BASE}/api/assets/${deleteTarget.id}`, { method:"DELETE", credentials:"include" });
      if (res.status === 204) { toast.success("Asset deleted"); setDeleteTarget(null); fetchAll(); return; }
      const d = await res.json(); toast.error(d.error || "Delete failed");
    } catch { toast.error("Delete failed"); }
  };

  const handleMove = async () => {
    if (!moveAsset) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/assets/${moveAsset.id}/move`, {
        method:"PATCH", credentials:"include",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify(moveForm)
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Move failed"); return; }
      toast.success("Asset moved");
      setMoveAsset(null); setMoveForm({ location:"", category:"" });
      fetchAll();
    } catch { toast.error("Move failed"); }
    finally { setSaving(false); }
  };

  const handleAddCat = async () => {
    if (!newCatName.trim()) return;
    const res = await fetch(`${API_BASE}/api/asset-categories`, { method:"POST", credentials:"include", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ name: newCatName }) });
    const d = await res.json();
    if (!res.ok) { toast.error(d.error || "Failed"); return; }
    toast.success("Category added"); setNewCatName(""); fetchAll();
  };

  const handleEditCat = async () => {
    if (!editCat) return;
    const res = await fetch(`${API_BASE}/api/asset-categories/${editCat.id}`, { method:"PATCH", credentials:"include", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ name: editCat.name }) });
    if (!res.ok) { const d = await res.json(); toast.error(d.error || "Failed"); return; }
    toast.success("Category renamed"); setEditCat(null); fetchAll();
  };

  const handleDeleteCat = async () => {
    if (!deleteCat) return;
    const res = await fetch(`${API_BASE}/api/asset-categories/${deleteCat.id}`, { method:"DELETE", credentials:"include" });
    if (res.status === 204) { toast.success("Category deleted"); setDeleteCat(null); fetchAll(); return; }
    const d = await res.json(); toast.error(d.error || "Failed"); setDeleteCat(null);
  };

  const downloadExport = async (type: "csv"|"xlsx") => {
    try {
      const res = await fetch(`${API_BASE}/api/assets/export/${type}`, { credentials:"include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `asset-register.${type}`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Export failed"); }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Package2 className="h-8 w-8 text-primary"/>Asset Register
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {assets.length.toLocaleString()} assets · {categories.length} categories
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canManage && (
              <>
                <Button variant="outline" size="sm" onClick={() => setCatOpen(true)}>
                  <FolderPlus className="h-4 w-4 mr-1"/>Categories
                </Button>
                <Button size="sm" onClick={() => { setForm({...EMPTY_FORM}); setAddOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1"/>Add Asset
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => downloadExport("csv")}>
              <Download className="h-4 w-4 mr-1"/>CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadExport("xlsx")}>
              <Download className="h-4 w-4 mr-1"/>Excel
            </Button>
          </div>
        </div>

        {/* Location mismatch warning */}
        {locationMismatches.length > 0 && (
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="p-4">
              <div className="flex gap-2 items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5"/>
                <div>
                  <p className="font-semibold text-sm text-yellow-600">
                    {locationMismatches.length} asset location{locationMismatches.length>1?"s":""} not matching existing departments
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {locationMismatches.slice(0,8).join(", ")}{locationMismatches.length > 8 ? ` +${locationMismatches.length-8} more` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    These locations exist only in the asset register. You can add them as departments or update the asset location.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/>
                <Input placeholder="Search description, serial, model, location…"
                  value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"/>
              </div>
              <Select value={filterCat} onValueChange={v => { setFilterCat(v); setPage(1); }}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Categories"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterLoc} onValueChange={v => { setFilterLoc(v); setPage(1); }}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Locations"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {uniqueLocs.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterSt} onValueChange={v => { setFilterSt(v); setPage(1); }}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Status"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="functional">Functional</SelectItem>
                  <SelectItem value="non-functional">Non-Functional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
              <span>Showing {paginated.length} of {filtered.length} assets</span>
              {(search || filterCat !== "all" || filterLoc !== "all" || filterSt !== "all") && (
                <button className="text-primary hover:underline flex items-center gap-1" onClick={() => { setSearch(""); setFilterCat("all"); setFilterLoc("all"); setFilterSt("all"); setPage(1); }}>
                  <X className="h-3 w-3"/>Clear filters
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left p-3 font-semibold w-8">#</th>
                    <th className="text-left p-3 font-semibold">Description</th>
                    <th className="text-left p-3 font-semibold">Category</th>
                    <th className="text-left p-3 font-semibold">Qty</th>
                    <th className="text-left p-3 font-semibold">Serial No</th>
                    <th className="text-left p-3 font-semibold">Location</th>
                    <th className="text-left p-3 font-semibold">Status</th>
                    <th className="text-left p-3 font-semibold">Date Acquired</th>
                    {canManage && <th className="text-right p-3 font-semibold">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(8)].map((_,i) => (
                      <tr key={i} className="border-b">
                        {[...Array(canManage ? 9 : 8)].map((_,j) => (
                          <td key={j} className="p-3"><div className="h-4 bg-muted animate-pulse rounded"/></td>
                        ))}
                      </tr>
                    ))
                  ) : paginated.length === 0 ? (
                    <tr><td colSpan={canManage ? 9 : 8} className="text-center py-16 text-muted-foreground">
                      <Package2 className="h-8 w-8 mx-auto mb-2 opacity-30"/>No assets found
                    </td></tr>
                  ) : paginated.map((a, idx) => (
                    <tr key={a.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="p-3 text-muted-foreground">{(page-1)*PAGE_SIZE + idx + 1}</td>
                      <td className="p-3 font-medium max-w-[220px]">
                        <div className="truncate" title={a.description}>{a.description}</div>
                        {a.model && <div className="text-xs text-muted-foreground">{a.model}</div>}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs whitespace-nowrap">{a.category}</Badge>
                      </td>
                      <td className="p-3 font-mono">{a.quantity}</td>
                      <td className="p-3 text-xs text-muted-foreground font-mono max-w-[120px]">
                        <div className="truncate" title={a.serialNo}>{a.serialNo || "—"}</div>
                      </td>
                      <td className="p-3 max-w-[140px]">
                        <div className="truncate text-xs" title={a.location}>
                          {locationMismatches.includes((a.location||"").toUpperCase()) && (
                            <AlertTriangle className="h-3 w-3 text-yellow-500 inline mr-1"/>
                          )}
                          {a.location || "—"}
                        </div>
                      </td>
                      <td className="p-3">{statusBadge(a.status)}</td>
                      <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{a.dateAcquired || "—"}</td>
                      {canManage && (
                        <td className="p-3">
                          <div className="flex gap-1 justify-end">
                            <button title="Edit" onClick={() => { setEditAsset(a); setForm({ description:a.description, category:a.category, quantity:a.quantity, serialNo:a.serialNo, model:a.model, location:a.location, dateAcquired:a.dateAcquired, status:a.status, ownership:a.ownership, notes:a.notes }); }}
                              className="p-1.5 rounded hover:bg-muted"><Pencil className="h-3.5 w-3.5 text-muted-foreground"/></button>
                            <button title="Move" onClick={() => { setMoveAsset(a); setMoveForm({ location: a.location, category: a.category }); }}
                              className="p-1.5 rounded hover:bg-muted"><ArrowRightLeft className="h-3.5 w-3.5 text-blue-500"/></button>
                            <button title="Delete" onClick={() => setDeleteTarget(a)}
                              className="p-1.5 rounded hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive"/></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page===1} onClick={() => setPage(p => p-1)}>
                    <ChevronLeft className="h-4 w-4"/>
                  </Button>
                  <Button size="sm" variant="outline" disabled={page===totalPages} onClick={() => setPage(p => p+1)}>
                    <ChevronRight className="h-4 w-4"/>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add / Edit Asset Dialog */}
      <Dialog open={addOpen || !!editAsset} onOpenChange={open => { if(!open){ setAddOpen(false); setEditAsset(null); setForm({...EMPTY_FORM}); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editAsset ? "Edit Asset" : "Add New Asset"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1">
              <Label>Description *</Label>
              <Input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value.toUpperCase()}))} placeholder="e.g. EXAMINATION LAMP"/>
            </div>
            <div className="space-y-1">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({...f, category: v}))}>
                <SelectTrigger><SelectValue placeholder="Select category"/></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Quantity</Label>
              <Input value={form.quantity} onChange={e => setForm(f => ({...f, quantity: e.target.value}))} placeholder="1"/>
            </div>
            <div className="space-y-1">
              <Label>Serial No</Label>
              <Input value={form.serialNo} onChange={e => setForm(f => ({...f, serialNo: e.target.value}))} placeholder="NONE"/>
            </div>
            <div className="space-y-1">
              <Label>Model</Label>
              <Input value={form.model} onChange={e => setForm(f => ({...f, model: e.target.value}))}/>
            </div>
            <div className="space-y-1">
              <Label>Location</Label>
              <Input value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value.toUpperCase()}))} placeholder="e.g. MATERNITY"/>
            </div>
            <div className="space-y-1">
              <Label>Date Acquired</Label>
              <Input value={form.dateAcquired} onChange={e => setForm(f => ({...f, dateAcquired: e.target.value}))} placeholder="e.g. 15TH JULY 2022"/>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Status</Label>
              <Input value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value.toUpperCase()}))} placeholder="FUNCTIONAL"/>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Ownership</Label>
              <Input value={form.ownership} onChange={e => setForm(f => ({...f, ownership: e.target.value.toUpperCase()}))} placeholder="FACILITY OWNED"/>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}/>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setEditAsset(null); setForm({...EMPTY_FORM}); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : editAsset ? "Save Changes" : "Add Asset"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Asset Dialog */}
      <Dialog open={!!moveAsset} onOpenChange={open => { if(!open) setMoveAsset(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Move Asset</DialogTitle></DialogHeader>
          {moveAsset && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground font-medium">{moveAsset.description}</p>
              <div className="space-y-1">
                <Label>New Location</Label>
                <Input value={moveForm.location} onChange={e => setMoveForm(f => ({...f, location: e.target.value.toUpperCase()}))} placeholder="e.g. MALE WARD"/>
              </div>
              <div className="space-y-1">
                <Label>New Category</Label>
                <Select value={moveForm.category} onValueChange={v => setMoveForm(f => ({...f, category: v}))}>
                  <SelectTrigger><SelectValue placeholder="Keep current category"/></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveAsset(null)}>Cancel</Button>
            <Button onClick={handleMove} disabled={saving}>{saving ? "Moving…" : "Move Asset"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Categories Dialog */}
      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Asset Categories</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {/* Add new */}
            <div className="flex gap-2">
              <Input value={newCatName} onChange={e => setNewCatName(e.target.value.toUpperCase())} placeholder="New category name"/>
              <Button onClick={handleAddCat} disabled={!newCatName.trim()}><Plus className="h-4 w-4"/></Button>
            </div>
            {/* List */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {categories.map(c => (
                <div key={c.id} className="flex items-center gap-2 p-2 border rounded">
                  {editCat?.id === c.id ? (
                    <>
                      <Input className="h-7 text-sm flex-1" value={editCat.name} onChange={e => setEditCat({...editCat, name: e.target.value.toUpperCase()})}/>
                      <Button size="sm" className="h-7" onClick={handleEditCat}>Save</Button>
                      <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditCat(null)}>×</Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium">{c.name}</span>
                      <button onClick={() => setEditCat(c)} className="p-1 hover:bg-muted rounded"><Pencil className="h-3.5 w-3.5 text-muted-foreground"/></button>
                      <button onClick={() => setDeleteCat(c)} className="p-1 hover:bg-destructive/10 rounded"><Trash2 className="h-3.5 w-3.5 text-destructive"/></button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Asset */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if(!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.description}"?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the asset. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Category */}
      <AlertDialog open={!!deleteCat} onOpenChange={open => { if(!open) setDeleteCat(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category "{deleteCat?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>Categories with existing assets cannot be deleted. Move or delete those assets first.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCat} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
