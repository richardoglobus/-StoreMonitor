import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout";
import { useAuth } from "@/lib/auth-context";
import { API_BASE } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Package2, Plus, Pencil, Trash2, ArrowRightLeft, Download, Search, FolderPlus, ChevronLeft, ChevronRight, AlertTriangle, RefreshCw } from "lucide-react";

interface Asset {
  id: number; category: string; description: string; quantity: string;
  serialNo: string; model: string; location: string; dateAcquired: string;
  status: string; ownership: string; notes: string;
}
interface AssetCategory { id: number; name: string; }

const PAGE_SIZE = 50;
const NONE_VAL = "__none__";
const EMPTY_FORM = { description:"", category:"", quantity:"1", serialNo:"", model:"", location:"", dateAcquired:"", status:"FUNCTIONAL", ownership:"FACILITY OWNED", notes:"" };

function statusBadge(status: string) {
  const s = (status||"").toLowerCase();
  if (s.includes("non") || s.includes("not")) return <Badge variant="destructive" className="text-xs">{status}</Badge>;
  if (s.includes("repair") || s.includes("partial")) return <Badge className="text-xs bg-yellow-500 hover:bg-yellow-600">{status}</Badge>;
  return <Badge className="text-xs bg-green-600 hover:bg-green-700">{status}</Badge>;
}

export default function Assets() {
  const { user } = useAuth();
  const canManage = !!user?.permissions?.manageAssets;

  // ── All state declared first ──────────────────────────────────────────────
  const [assets,             setAssets]             = useState<Asset[]>([]);
  const [categories,         setCategories]         = useState<AssetCategory[]>([]);
  const [departments,        setDepartments]        = useState<string[]>([]);
  const [loading,            setLoading]            = useState(true);
  const [page,               setPage]               = useState(1);
  const [search,             setSearch]             = useState("");
  const [filterCat,          setFilterCat]          = useState("all");
  const [filterLoc,          setFilterLoc]          = useState("all");
  const [filterSt,           setFilterSt]           = useState("all");
  const [addOpen,            setAddOpen]            = useState(false);
  const [editAsset,          setEditAsset]          = useState<Asset|null>(null);
  const [moveAsset,          setMoveAsset]          = useState<Asset|null>(null);
  const [deleteTarget,       setDeleteTarget]       = useState<Asset|null>(null);
  const [catOpen,            setCatOpen]            = useState(false);
  const [form,               setForm]               = useState({ ...EMPTY_FORM });
  const [moveForm,           setMoveForm]           = useState({ location:"", category:"" });
  const [saving,             setSaving]             = useState(false);
  const [newCatName,         setNewCatName]         = useState("");
  const [editCat,            setEditCat]            = useState<AssetCategory|null>(null);
  const [deleteCat,          setDeleteCat]          = useState<AssetCategory|null>(null);
  const [locationMismatches, setLocationMismatches] = useState<string[]>([]);
  const [syncOpen,           setSyncOpen]           = useState(false);
  const [syncing,            setSyncing]            = useState(false);
  const [syncProgress,       setSyncProgress]       = useState({ current: 0, total: 0, currentLoc: "" });
  const [syncSuggestions,    setSyncSuggestions]    = useState<{assetLoc:string,deptName:string,count:number}[]>([]);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, cRes, dRes] = await Promise.all([
        fetch(`${API_BASE}/api/assets`,       { credentials:"include" }),
        fetch(`${API_BASE}/api/asset-categories`, { credentials:"include" }),
        fetch(`${API_BASE}/api/departments`,  { credentials:"include" }),
      ]);
      const [a, c, d] = await Promise.all([aRes.json(), cRes.json(), dRes.json()]);
      const assetList = Array.isArray(a) ? a : [];
      const deptNames = (Array.isArray(d) ? d : []).map((dep: any) => dep.name.toUpperCase());
      setAssets(assetList);
      setCategories(Array.isArray(c) ? c : []);
      setDepartments(deptNames);
      const assetLocs = [...new Set(assetList.map((x: Asset) => (x.location||"").trim().toUpperCase()).filter(Boolean))];
      setLocationMismatches(assetLocs.filter(l => !deptNames.includes(l)));
    } catch { toast.error("Failed to load assets"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Filtered + paginated ──────────────────────────────────────────────────
  const filtered = assets.filter(a => {
    if (filterCat !== "all" && a.category !== filterCat) return false;
    if (filterLoc !== "all" && a.location !== filterLoc) return false;
    if (filterSt !== "all") {
      const s = (a.status||"").toLowerCase();
      if (filterSt === "functional"     && (s.includes("non")||s.includes("not"))) return false;
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

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.description || !form.category) { toast.error("Description and category are required"); return; }
    setSaving(true);
    try {
      const url    = editAsset ? `${API_BASE}/api/assets/${editAsset.id}` : `${API_BASE}/api/assets`;
      const method = editAsset ? "PATCH" : "POST";
      const res    = await fetch(url, { method, credentials:"include", headers:{"Content-Type":"application/json"}, body: JSON.stringify(form) });
      const data   = await res.json();
      if (!res.ok) { toast.error(data.error || "Save failed"); return; }
      toast.success(editAsset ? "Asset updated" : "Asset added");
      setAddOpen(false); setEditAsset(null); setForm({...EMPTY_FORM}); fetchAll();
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`${API_BASE}/api/assets/${deleteTarget.id}`, { method:"DELETE", credentials:"include" });
      if (res.status === 204 || res.ok) { toast.success("Asset deleted"); setDeleteTarget(null); fetchAll(); return; }
      const d = await res.json(); toast.error(d.error || "Delete failed");
    } catch { toast.error("Delete failed"); }
  };

  const handleMove = async () => {
    if (!moveAsset) return;
    setSaving(true);
    try {
      const payload: any = {};
      if (moveForm.location && moveForm.location !== NONE_VAL) payload.location = moveForm.location;
      if (moveForm.category && moveForm.category !== NONE_VAL) payload.category = moveForm.category;
      const res  = await fetch(`${API_BASE}/api/assets/${moveAsset.id}/move`, { method:"PATCH", credentials:"include", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Move failed"); return; }
      toast.success("Asset moved"); setMoveAsset(null); setMoveForm({ location:"", category:"" }); fetchAll();
    } catch { toast.error("Move failed"); }
    finally { setSaving(false); }
  };

  const handleAddCat = async () => {
    if (!newCatName.trim()) return;
    const res = await fetch(`${API_BASE}/api/asset-categories`, { method:"POST", credentials:"include", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ name: newCatName }) });
    const d   = await res.json();
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
    if (res.status === 204 || res.ok) { toast.success("Category deleted"); setDeleteCat(null); fetchAll(); return; }
    const d = await res.json(); toast.error(d.error || "Failed"); setDeleteCat(null);
  };

  const handleSuggestSync = () => {
    const suggestions: {assetLoc:string,deptName:string,count:number}[] = [];
    for (const assetLoc of locationMismatches) {
      const norm  = assetLoc.toUpperCase().trim();
      const match = departments.find(dep => {
        const dn = dep.toUpperCase().trim();
        return dn.includes(norm) || norm.includes(dn) ||
          norm.split(/\s+/).some(w => w.length > 3 && dn.includes(w));
      });
      if (match) {
        const count = assets.filter(a => (a.location||"").toUpperCase().trim() === norm).length;
        suggestions.push({ assetLoc, deptName: match, count });
      }
    }
    setSyncSuggestions(suggestions);
    setSyncOpen(true);
  };

  const handleApplySync = async () => {
    const allToUpdate = syncSuggestions.flatMap(s =>
      assets
        .filter(a => (a.location || "").toUpperCase().trim() === s.assetLoc.toUpperCase().trim())
        .map(a => ({ asset: a, newLoc: s.deptName }))
    );
    setSyncing(true);
    setSyncProgress({ current: 0, total: allToUpdate.length, currentLoc: "" });
    try {
      let updated = 0;
      for (const { asset, newLoc } of allToUpdate) {
        setSyncProgress({ current: updated + 1, total: allToUpdate.length, currentLoc: newLoc });
        await fetch(`${API_BASE}/api/assets/${asset.id}`, {
          method: "PATCH", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ location: newLoc })
        });
        updated++;
      }
      toast.success(`Updated ${updated} asset locations`);
      setSyncOpen(false);
      setSyncSuggestions([]);
      setSyncProgress({ current: 0, total: 0, currentLoc: "" });
      fetchAll();
    } catch { toast.error("Sync failed"); }
    finally { setSyncing(false); }
  };

  const downloadExport = async (type: "csv"|"xlsx") => {
    try {
      const res  = await fetch(`${API_BASE}/api/assets/export/${type}`, { credentials:"include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a"); a.href = url; a.download = `asset-register.${type}`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Export failed"); }
  };

  // ── Location Select helper ────────────────────────────────────────────────
  const locSelectVal = (v: string) => v || NONE_VAL;
  const locSelectChange = (v: string, setter: (val: string) => void) => setter(v === NONE_VAL ? "" : v);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-4 max-w-full">

        {/* Header */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Package2 className="h-6 w-6"/>
              <h1 className="text-2xl font-bold">Asset Register</h1>
            </div>
            <p className="text-muted-foreground text-sm">{assets.length} assets · {categories.length} categories</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canManage && (
              <>
                <Button size="sm" variant="outline" onClick={() => setCatOpen(true)}><FolderPlus className="h-4 w-4 mr-1"/>Categories</Button>
                <Button size="sm" onClick={() => { setForm({...EMPTY_FORM}); setEditAsset(null); setAddOpen(true); }}><Plus className="h-4 w-4 mr-1"/>Add Asset</Button>
              </>
            )}
            <Button size="sm" variant="outline" onClick={() => downloadExport("csv")}><Download className="h-4 w-4 mr-1"/>CSV</Button>
            <Button size="sm" variant="outline" onClick={() => downloadExport("xlsx")}><Download className="h-4 w-4 mr-1"/>Excel</Button>
          </div>
        </div>

        {/* Location mismatch banner */}
        {locationMismatches.length > 0 && (
          <Card className="border-yellow-400 bg-yellow-50/20">
            <CardContent className="p-4">
              <div className="flex gap-2 items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5"/>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-yellow-600">{locationMismatches.length} asset location{locationMismatches.length>1?"s":""} not matching existing departments</p>
                  <p className="text-xs text-muted-foreground mt-1">{locationMismatches.slice(0,8).join(", ")}{locationMismatches.length>8?` +${locationMismatches.length-8} more`:""}</p>
                  {canManage && (
                    <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={handleSuggestSync}>
                      <RefreshCw className="h-3 w-3 mr-1"/>Auto-match to departments
                    </Button>
                  )}
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
                <Input placeholder="Search description, serial, model, location…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9"/>
              </div>
              <Select value={filterCat} onValueChange={v => { setFilterCat(v); setPage(1); }}>
                <SelectTrigger className="sm:w-48"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterLoc} onValueChange={v => { setFilterLoc(v); setPage(1); }}>
                <SelectTrigger className="sm:w-48"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {uniqueLocs.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterSt} onValueChange={v => { setFilterSt(v); setPage(1); }}>
                <SelectTrigger className="sm:w-40"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="functional">Functional</SelectItem>
                  <SelectItem value="non-functional">Non-Functional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Showing {filtered.length} of {assets.length} assets</p>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left p-3 font-semibold">#</th>
                    <th className="text-left p-3 font-semibold">Description</th>
                    <th className="text-left p-3 font-semibold hidden md:table-cell">Category</th>
                    <th className="text-left p-3 font-semibold">Qty</th>
                    <th className="text-left p-3 font-semibold hidden lg:table-cell">Serial No</th>
                    <th className="text-left p-3 font-semibold">Location</th>
                    <th className="text-left p-3 font-semibold hidden lg:table-cell">Date Acquired</th>
                    <th className="text-left p-3 font-semibold">Status</th>
                    {canManage && <th className="text-right p-3 font-semibold">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading && [...Array(5)].map((_,i) => (
                    <tr key={i} className="border-t">
                      {[...Array(canManage ? 9 : 8)].map((_,j) => (
                        <td key={j} className="p-3"><div className="h-4 bg-muted rounded animate-pulse"/></td>
                      ))}
                    </tr>
                  ))}
                  {!loading && paginated.length === 0 && (
                    <tr><td colSpan={canManage ? 9 : 8} className="text-center py-16 text-muted-foreground">
                      <Package2 className="h-10 w-10 mx-auto mb-2 opacity-30"/>No assets found
                    </td></tr>
                  )}
                  {paginated.map((a, idx) => (
                    <tr key={a.id} className={`border-t hover:bg-muted/30 ${idx%2===0?"":"bg-muted/10"}`}>
                      <td className="p-3 text-muted-foreground text-xs">{a.id}</td>
                      <td className="p-3 font-medium max-w-xs">
                        <div className="truncate">{a.description}</div>
                        {a.model && <div className="text-xs text-muted-foreground">{a.model}</div>}
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <Badge variant="outline" className="text-xs">{a.category}</Badge>
                      </td>
                      <td className="p-3">{a.quantity}</td>
                      <td className="p-3 hidden lg:table-cell font-mono text-xs text-muted-foreground">{a.serialNo||"—"}</td>
                      <td className="p-3 text-sm">{a.location||"—"}</td>
                      <td className="p-3 hidden lg:table-cell text-xs text-muted-foreground">{a.dateAcquired||"—"}</td>
                      <td className="p-3">{statusBadge(a.status)}</td>
                      {canManage && (
                        <td className="p-3">
                          <div className="flex gap-1 justify-end">
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit" onClick={() => { setForm({...a}); setEditAsset(a); setAddOpen(true); }}><Pencil className="h-3.5 w-3.5"/></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Move" onClick={() => { setMoveAsset(a); setMoveForm({ location:"", category:"" }); }}><ArrowRightLeft className="h-3.5 w-3.5"/></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" title="Delete" onClick={() => setDeleteTarget(a)}><Trash2 className="h-3.5 w-3.5"/></Button>
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
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <span className="text-sm text-muted-foreground">Page {page} of {totalPages} · {filtered.length} assets</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page===1} onClick={() => setPage(p=>p-1)}><ChevronLeft className="h-4 w-4"/>Prev</Button>
                  <Button size="sm" variant="outline" disabled={page===totalPages} onClick={() => setPage(p=>p+1)}>Next<ChevronRight className="h-4 w-4"/></Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Add / Edit Dialog ── */}
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
              <Select value={form.category || NONE_VAL} onValueChange={v => setForm(f => ({...f, category: v===NONE_VAL?"":v}))}>
                <SelectTrigger><SelectValue placeholder="Select category"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VAL}>— Select —</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
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
              <Label>Location (Department)</Label>
              <Select value={locSelectVal(form.location)} onValueChange={v => locSelectChange(v, loc => setForm(f => ({...f, location: loc})))}>
                <SelectTrigger><SelectValue placeholder="Select department"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VAL}>— None —</SelectItem>
                  {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Date Acquired</Label>
              <Input value={form.dateAcquired} onChange={e => setForm(f => ({...f, dateAcquired: e.target.value}))} placeholder="e.g. 15TH JULY 2022"/>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status || "FUNCTIONAL"} onValueChange={v => setForm(f => ({...f, status: v}))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FUNCTIONAL">FUNCTIONAL</SelectItem>
                  <SelectItem value="NON-FUNCTIONAL">NON-FUNCTIONAL</SelectItem>
                  <SelectItem value="UNDER REPAIR">UNDER REPAIR</SelectItem>
                  <SelectItem value="DECOMMISSIONED">DECOMMISSIONED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Ownership</Label>
              <Select value={form.ownership || "FACILITY OWNED"} onValueChange={v => setForm(f => ({...f, ownership: v}))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FACILITY OWNED">FACILITY OWNED</SelectItem>
                  <SelectItem value="ON PLACEMENT">ON PLACEMENT</SelectItem>
                  <SelectItem value="LEASED">LEASED</SelectItem>
                  <SelectItem value="DONATED">DONATED</SelectItem>
                </SelectContent>
              </Select>
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

      {/* ── Move Dialog ── */}
      <Dialog open={!!moveAsset} onOpenChange={open => { if(!open) setMoveAsset(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Move Asset</DialogTitle></DialogHeader>
          {moveAsset && (
            <div className="space-y-4 py-2">
              <p className="text-sm font-medium">{moveAsset.description}</p>
              <p className="text-xs text-muted-foreground">Current: {moveAsset.location||"—"} · {moveAsset.category}</p>
              <div className="space-y-1">
                <Label>New Location</Label>
                <Select value={locSelectVal(moveForm.location)} onValueChange={v => locSelectChange(v, loc => setMoveForm(f => ({...f, location: loc})))}>
                  <SelectTrigger><SelectValue placeholder="Keep current location"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VAL}>— Keep current —</SelectItem>
                    {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>New Category</Label>
                <Select value={moveForm.category || NONE_VAL} onValueChange={v => setMoveForm(f => ({...f, category: v===NONE_VAL?"":v}))}>
                  <SelectTrigger><SelectValue placeholder="Keep current category"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VAL}>— Keep current —</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
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

      {/* ── Categories Dialog ── */}
      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Asset Categories</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Input value={newCatName} onChange={e => setNewCatName(e.target.value.toUpperCase())} placeholder="NEW CATEGORY NAME" onKeyDown={e => e.key==="Enter" && handleAddCat()}/>
              <Button onClick={handleAddCat} disabled={!newCatName.trim()}><Plus className="h-4 w-4"/></Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center gap-2 p-2 rounded border">
                  {editCat?.id === cat.id ? (
                    <>
                      <Input value={editCat.name} onChange={e => setEditCat({...editCat, name: e.target.value.toUpperCase()})} className="h-7 text-sm flex-1"/>
                      <Button size="sm" className="h-7" onClick={handleEditCat}>Save</Button>
                      <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditCat(null)}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm">{cat.name}</span>
                      <span className="text-xs text-muted-foreground">{assets.filter(a=>a.category===cat.name).length} assets</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditCat(cat)}><Pencil className="h-3 w-3"/></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteCat(cat)}><Trash2 className="h-3 w-3"/></Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Asset Confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if(!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.description}"?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Category Confirm ── */}
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

      {/* ── Auto-sync Dialog ── */}
      <Dialog open={syncOpen} onOpenChange={open => { if(!open) setSyncOpen(false); }}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Auto-match Locations to Departments</DialogTitle>
          </DialogHeader>

          {syncSuggestions.length === 0 ? (
            <div className="py-4 space-y-2">
              <p className="text-sm text-muted-foreground">No automatic matches found. All unmatched locations are too different from your department names.</p>
              <p className="text-sm text-muted-foreground">Use the <strong>Edit</strong> button on individual assets to update their location manually.</p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Review each suggestion. Edit the target department, or remove rows you don't want to apply.
              </p>
              <div className="rounded border divide-y text-sm">
                {syncSuggestions.map((s, idx) => (
                  <div key={s.assetLoc} className="flex items-center gap-2 px-3 py-2">
                    {/* Asset location (fixed) */}
                    <div className="flex-1 min-w-0">
                      <span className="font-mono text-xs text-red-500 block truncate">{s.assetLoc}</span>
                      <span className="text-xs text-muted-foreground">{s.count} asset{s.count!==1?"s":""}</span>
                    </div>
                    <span className="text-muted-foreground text-xs shrink-0">→</span>
                    {/* Editable target department */}
                    <Select
                      value={s.deptName}
                      onValueChange={v => setSyncSuggestions(prev => prev.map((r,i) => i===idx ? {...r, deptName: v} : r))}
                    >
                      <SelectTrigger className="w-44 h-7 text-xs">
                        <SelectValue/>
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(d => <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {/* Remove this row */}
                    <Button
                      size="icon" variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                      title="Remove this mapping"
                      onClick={() => setSyncSuggestions(prev => prev.filter((_,i) => i!==idx))}
                    >
                      <Trash2 className="h-3.5 w-3.5"/>
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {syncSuggestions.reduce((n,s)=>n+s.count,0)} assets will be updated across {syncSuggestions.length} location{syncSuggestions.length!==1?"s":""}.
              </p>
            </div>
          )}

          {syncing && syncProgress.total > 0 && (
            <div className="px-4 pb-2 space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Updating <strong>{syncProgress.currentLoc}</strong>…</span>
                <span className="font-mono font-semibold">{syncProgress.current} / {syncProgress.total}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${Math.round((syncProgress.current / syncProgress.total) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-right text-muted-foreground">
                {Math.round((syncProgress.current / syncProgress.total) * 100)}% complete
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSyncOpen(false)} disabled={syncing}>Cancel</Button>
            <Button onClick={handleApplySync} disabled={syncing}>
              {syncing ? "Applying…" : `Apply ${syncSuggestions.length} Mapping${syncSuggestions.length!==1?"s":""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
