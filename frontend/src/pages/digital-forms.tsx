import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout";
import { useAuth } from "@/lib/auth-context";
import { API_BASE } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ClipboardList, Download, Plus, Pencil, Trash2, ShieldAlert, Film, Wrench, ChevronLeft, ChevronRight } from "lucide-react";

// ─────────────── Types ───────────────
interface DailyLog { id:number; date:string; cameraStatus:string; nvrStatus:string; checkedBy:string; remarks:string; }
interface WeeklyLog { id:number; date:string; recordingVerified:boolean; storageSpaceGb:number; networkConnectivity:string; firmwareUpdated:boolean; conductedBy:string; remarks:string; }
interface FootageLog { id:number; date:string; facility:string; reason:string; footageDate:string; authorizedBy:string; retrievedBy:string; witness:string; }
interface IncidentLog { id:number; dateTime:string; natureOfIncident:string; reportedBy:string; actionTaken:string; status:string; }

const PAGE = 20;
const TODAY = new Date().toISOString().split('T')[0];

const TABS = [
  { key:"daily",    label:"Daily Checklist",    icon: ClipboardList },
  { key:"weekly",   label:"Weekly Maintenance", icon: Wrench },
  { key:"footage",  label:"Footage Access Log", icon: Film },
  { key:"incident", label:"Incident Reports",   icon: ShieldAlert },
] as const;
type TabKey = typeof TABS[number]["key"];

const STATUS_COLORS: Record<string,string> = {
  RESOLVED: "bg-green-600",
  "UNDER INVESTIGATION": "bg-yellow-500",
  PENDING: "bg-red-600",
};

// ─────────────── Component ───────────────
export default function DigitalForms() {
  const { user } = useAuth();
  const canManage = !!user?.permissions?.manageDigitalForms;
  const [tab, setTab] = useState<TabKey>("daily");

  // Data
  const [daily,    setDaily]    = useState<DailyLog[]>([]);
  const [weekly,   setWeekly]   = useState<WeeklyLog[]>([]);
  const [footage,  setFootage]  = useState<FootageLog[]>([]);
  const [incident, setIncident] = useState<IncidentLog[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [page,     setPage]     = useState(1);

  // Dialogs
  const [addOpen,  setAddOpen]  = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [delItem,  setDelItem]  = useState<any>(null);
  const [saving,   setSaving]   = useState(false);
  const [form,     setForm]     = useState<Record<string,any>>({});

  const fetchTab = useCallback(async (t: TabKey) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/cctv/${t}`, { credentials:"include" });
      const data = await res.json();
      if (t==="daily")    setDaily(data);
      if (t==="weekly")   setWeekly(data);
      if (t==="footage")  setFootage(data);
      if (t==="incident") setIncident(data);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTab(tab); setPage(1); }, [tab, fetchTab]);

  const rows: any[] = tab==="daily" ? daily : tab==="weekly" ? weekly : tab==="footage" ? footage : incident;
  const totalPages = Math.ceil(rows.length / PAGE);
  const paged = rows.slice((page-1)*PAGE, page*PAGE);

  // Default forms per tab
  const defaultForm = () => {
    if (tab==="daily")    return { date:TODAY, cameraStatus:"ALL CAMERAS OPERATIONAL", nvrStatus:"NVR RECORDING - OK", checkedBy:"", remarks:"" };
    if (tab==="weekly")   return { date:TODAY, recordingVerified:true, storageSpaceGb:"", networkConnectivity:"STABLE", firmwareUpdated:false, conductedBy:"", remarks:"" };
    if (tab==="footage")  return { date:TODAY, facility:"MUKURWEINI SUB-COUNTY HOSPITAL", reason:"", footageDate:TODAY, authorizedBy:"", retrievedBy:"", witness:"" };
    return { dateTime: TODAY+" 08:00", natureOfIncident:"", reportedBy:"", actionTaken:"", status:"PENDING" };
  };

  const openAdd  = () => { setForm(defaultForm()); setAddOpen(true); };
  const openEdit = (item: any) => { setEditItem(item); setForm({...item}); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url    = editItem ? `${API_BASE}/api/cctv/${tab}/${editItem.id}` : `${API_BASE}/api/cctv/${tab}`;
      const method = editItem ? "PATCH" : "POST";
      const res = await fetch(url, { method, credentials:"include", headers:{"Content-Type":"application/json"}, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Save failed"); return; }
      toast.success(editItem ? "Updated" : "Entry added");
      setAddOpen(false); setEditItem(null); setForm({});
      fetchTab(tab);
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!delItem) return;
    try {
      const res = await fetch(`${API_BASE}/api/cctv/${tab}/${delItem.id}`, { method:"DELETE", credentials:"include" });
      if (res.status===204) { toast.success("Deleted"); setDelItem(null); fetchTab(tab); return; }
      const d = await res.json(); toast.error(d.error || "Delete failed");
    } catch { toast.error("Delete failed"); }
  };

  const handleExport = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/cctv/export/xlsx`, { credentials:"include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a"); a.href=url; a.download="cctv-logs.xlsx"; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Export failed"); }
  };

  const setF = (k: string, v: any) => setForm(f => ({...f, [k]: v}));

  // ─── Form fields per tab ───
  const renderForm = () => {
    if (tab==="daily") return (
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1"><Label>Date *</Label><Input type="date" value={form.date||""} onChange={e=>setF("date",e.target.value)}/></div>
        <div className="col-span-2 space-y-1"><Label>Camera Status</Label><Input value={form.cameraStatus||""} onChange={e=>setF("cameraStatus",e.target.value.toUpperCase())} placeholder="ALL CAMERAS OPERATIONAL"/></div>
        <div className="col-span-2 space-y-1"><Label>NVR/DVR Status</Label><Input value={form.nvrStatus||""} onChange={e=>setF("nvrStatus",e.target.value.toUpperCase())} placeholder="NVR RECORDING - OK"/></div>
        <div className="col-span-2 space-y-1"><Label>Checked By *</Label><Input value={form.checkedBy||""} onChange={e=>setF("checkedBy",e.target.value.toUpperCase())} placeholder="SECURITY OFFICER"/></div>
        <div className="col-span-2 space-y-1"><Label>Remarks</Label><Input value={form.remarks||""} onChange={e=>setF("remarks",e.target.value)}/></div>
      </div>
    );
    if (tab==="weekly") return (
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1"><Label>Date *</Label><Input type="date" value={form.date||""} onChange={e=>setF("date",e.target.value)}/></div>
        <div className="space-y-1"><Label>Recording Verified</Label>
          <select className="w-full border rounded px-3 py-2 text-sm bg-background" value={form.recordingVerified?"yes":"no"} onChange={e=>setF("recordingVerified",e.target.value==="yes")}>
            <option value="yes">YES</option><option value="no">NO</option>
          </select>
        </div>
        <div className="space-y-1"><Label>Storage (GB free)</Label><Input type="number" value={form.storageSpaceGb||""} onChange={e=>setF("storageSpaceGb",Number(e.target.value))}/></div>
        <div className="space-y-1"><Label>Network</Label>
          <select className="w-full border rounded px-3 py-2 text-sm bg-background" value={form.networkConnectivity||"STABLE"} onChange={e=>setF("networkConnectivity",e.target.value)}>
            <option>STABLE</option><option>INTERMITTENT</option><option>DOWN</option>
          </select>
        </div>
        <div className="space-y-1"><Label>Firmware Updated</Label>
          <select className="w-full border rounded px-3 py-2 text-sm bg-background" value={form.firmwareUpdated?"yes":"no"} onChange={e=>setF("firmwareUpdated",e.target.value==="yes")}>
            <option value="no">NO</option><option value="yes">YES</option>
          </select>
        </div>
        <div className="col-span-2 space-y-1"><Label>Conducted By *</Label><Input value={form.conductedBy||""} onChange={e=>setF("conductedBy",e.target.value.toUpperCase())} placeholder="ICT OFFICER"/></div>
        <div className="col-span-2 space-y-1"><Label>Remarks</Label><Input value={form.remarks||""} onChange={e=>setF("remarks",e.target.value)}/></div>
      </div>
    );
    if (tab==="footage") return (
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Date of Access *</Label><Input type="date" value={form.date||""} onChange={e=>setF("date",e.target.value)}/></div>
        <div className="space-y-1"><Label>Footage Date</Label><Input type="date" value={form.footageDate||""} onChange={e=>setF("footageDate",e.target.value)}/></div>
        <div className="col-span-2 space-y-1"><Label>Facility</Label><Input value={form.facility||""} onChange={e=>setF("facility",e.target.value.toUpperCase())}/></div>
        <div className="col-span-2 space-y-1"><Label>Reason for Access *</Label><Input value={form.reason||""} onChange={e=>setF("reason",e.target.value)}/></div>
        <div className="space-y-1"><Label>Authorized By</Label><Input value={form.authorizedBy||""} onChange={e=>setF("authorizedBy",e.target.value.toUpperCase())}/></div>
        <div className="space-y-1"><Label>Retrieved By</Label><Input value={form.retrievedBy||""} onChange={e=>setF("retrievedBy",e.target.value.toUpperCase())}/></div>
        <div className="col-span-2 space-y-1"><Label>Witness</Label><Input value={form.witness||""} onChange={e=>setF("witness",e.target.value.toUpperCase())}/></div>
      </div>
    );
    // incident
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1"><Label>Date &amp; Time *</Label><Input type="datetime-local" value={(form.dateTime||"").replace(" ","T")} onChange={e=>setF("dateTime",e.target.value.replace("T"," "))}/></div>
        <div className="col-span-2 space-y-1"><Label>Nature of Incident *</Label><Input value={form.natureOfIncident||""} onChange={e=>setF("natureOfIncident",e.target.value)}/></div>
        <div className="space-y-1"><Label>Reported By</Label><Input value={form.reportedBy||""} onChange={e=>setF("reportedBy",e.target.value.toUpperCase())}/></div>
        <div className="space-y-1"><Label>Status</Label>
          <select className="w-full border rounded px-3 py-2 text-sm bg-background" value={form.status||"PENDING"} onChange={e=>setF("status",e.target.value)}>
            <option>PENDING</option><option>UNDER INVESTIGATION</option><option>RESOLVED</option>
          </select>
        </div>
        <div className="col-span-2 space-y-1"><Label>Action Taken</Label><Input value={form.actionTaken||""} onChange={e=>setF("actionTaken",e.target.value)}/></div>
      </div>
    );
  };

  // ─── Table per tab ───
  const renderTable = () => {
    if (loading) return (
      <div className="space-y-2 p-4">
        {[...Array(6)].map((_,i)=><div key={i} className="h-10 bg-muted animate-pulse rounded"/>)}
      </div>
    );
    if (!paged.length) return <div className="text-center py-16 text-muted-foreground"><ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30"/>No entries found</div>;

    if (tab==="daily") return (
      <table className="w-full text-sm">
        <thead><tr className="border-b bg-muted/40">
          <th className="p-3 text-left w-8">#</th>
          <th className="p-3 text-left">Date</th>
          <th className="p-3 text-left">Camera Status</th>
          <th className="p-3 text-left">NVR/DVR Status</th>
          <th className="p-3 text-left">Checked By</th>
          <th className="p-3 text-left">Remarks</th>
          {canManage && <th className="p-3 text-right">Actions</th>}
        </tr></thead>
        <tbody>{(paged as DailyLog[]).map((r,i)=>(
          <tr key={r.id} className="border-b hover:bg-muted/20">
            <td className="p-3 text-muted-foreground">{(page-1)*PAGE+i+1}</td>
            <td className="p-3 whitespace-nowrap font-mono text-xs">{r.date}</td>
            <td className="p-3 text-xs">{r.cameraStatus}</td>
            <td className="p-3 text-xs">{r.nvrStatus}</td>
            <td className="p-3 text-xs">{r.checkedBy}</td>
            <td className="p-3 text-xs text-muted-foreground">{r.remarks||"—"}</td>
            {canManage && <td className="p-3"><div className="flex gap-1 justify-end">
              <button onClick={()=>openEdit(r)} className="p-1.5 rounded hover:bg-muted"><Pencil className="h-3.5 w-3.5 text-muted-foreground"/></button>
              <button onClick={()=>setDelItem(r)} className="p-1.5 rounded hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive"/></button>
            </div></td>}
          </tr>
        ))}</tbody>
      </table>
    );

    if (tab==="weekly") return (
      <table className="w-full text-sm">
        <thead><tr className="border-b bg-muted/40">
          <th className="p-3 text-left w-8">#</th>
          <th className="p-3 text-left">Date</th>
          <th className="p-3 text-left">Recording</th>
          <th className="p-3 text-left">Storage (GB)</th>
          <th className="p-3 text-left">Network</th>
          <th className="p-3 text-left">Firmware</th>
          <th className="p-3 text-left">Conducted By</th>
          <th className="p-3 text-left">Remarks</th>
          {canManage && <th className="p-3 text-right">Actions</th>}
        </tr></thead>
        <tbody>{(paged as WeeklyLog[]).map((r,i)=>(
          <tr key={r.id} className="border-b hover:bg-muted/20">
            <td className="p-3 text-muted-foreground">{(page-1)*PAGE+i+1}</td>
            <td className="p-3 whitespace-nowrap font-mono text-xs">{r.date}</td>
            <td className="p-3"><Badge className={`text-xs ${r.recordingVerified?"bg-green-600":"bg-red-600"}`}>{r.recordingVerified?"OK":"FAILED"}</Badge></td>
            <td className="p-3 font-mono text-xs">{r.storageSpaceGb}</td>
            <td className="p-3 text-xs">{r.networkConnectivity}</td>
            <td className="p-3"><Badge variant="outline" className="text-xs">{r.firmwareUpdated?"YES":"NO"}</Badge></td>
            <td className="p-3 text-xs">{r.conductedBy}</td>
            <td className="p-3 text-xs text-muted-foreground">{r.remarks||"—"}</td>
            {canManage && <td className="p-3"><div className="flex gap-1 justify-end">
              <button onClick={()=>openEdit(r)} className="p-1.5 rounded hover:bg-muted"><Pencil className="h-3.5 w-3.5 text-muted-foreground"/></button>
              <button onClick={()=>setDelItem(r)} className="p-1.5 rounded hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive"/></button>
            </div></td>}
          </tr>
        ))}</tbody>
      </table>
    );

    if (tab==="footage") return (
      <table className="w-full text-sm">
        <thead><tr className="border-b bg-muted/40">
          <th className="p-3 text-left w-8">#</th>
          <th className="p-3 text-left">Date</th>
          <th className="p-3 text-left">Footage Date</th>
          <th className="p-3 text-left">Reason</th>
          <th className="p-3 text-left">Authorized By</th>
          <th className="p-3 text-left">Retrieved By</th>
          <th className="p-3 text-left">Witness</th>
          {canManage && <th className="p-3 text-right">Actions</th>}
        </tr></thead>
        <tbody>{(paged as FootageLog[]).map((r,i)=>(
          <tr key={r.id} className="border-b hover:bg-muted/20">
            <td className="p-3 text-muted-foreground">{(page-1)*PAGE+i+1}</td>
            <td className="p-3 whitespace-nowrap font-mono text-xs">{r.date}</td>
            <td className="p-3 whitespace-nowrap font-mono text-xs">{r.footageDate}</td>
            <td className="p-3 text-xs max-w-[200px]"><div className="truncate" title={r.reason}>{r.reason}</div></td>
            <td className="p-3 text-xs">{r.authorizedBy}</td>
            <td className="p-3 text-xs">{r.retrievedBy}</td>
            <td className="p-3 text-xs">{r.witness}</td>
            {canManage && <td className="p-3"><div className="flex gap-1 justify-end">
              <button onClick={()=>openEdit(r)} className="p-1.5 rounded hover:bg-muted"><Pencil className="h-3.5 w-3.5 text-muted-foreground"/></button>
              <button onClick={()=>setDelItem(r)} className="p-1.5 rounded hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive"/></button>
            </div></td>}
          </tr>
        ))}</tbody>
      </table>
    );

    // incident
    return (
      <table className="w-full text-sm">
        <thead><tr className="border-b bg-muted/40">
          <th className="p-3 text-left w-8">#</th>
          <th className="p-3 text-left">Date & Time</th>
          <th className="p-3 text-left">Nature of Incident</th>
          <th className="p-3 text-left">Reported By</th>
          <th className="p-3 text-left">Action Taken</th>
          <th className="p-3 text-left">Status</th>
          {canManage && <th className="p-3 text-right">Actions</th>}
        </tr></thead>
        <tbody>{(paged as IncidentLog[]).map((r,i)=>(
          <tr key={r.id} className="border-b hover:bg-muted/20">
            <td className="p-3 text-muted-foreground">{(page-1)*PAGE+i+1}</td>
            <td className="p-3 whitespace-nowrap font-mono text-xs">{r.dateTime}</td>
            <td className="p-3 text-xs max-w-[220px]"><div className="truncate" title={r.natureOfIncident}>{r.natureOfIncident}</div></td>
            <td className="p-3 text-xs">{r.reportedBy}</td>
            <td className="p-3 text-xs max-w-[200px]"><div className="truncate" title={r.actionTaken}>{r.actionTaken}</div></td>
            <td className="p-3"><Badge className={`text-xs text-white ${STATUS_COLORS[r.status]||"bg-gray-500"}`}>{r.status}</Badge></td>
            {canManage && <td className="p-3"><div className="flex gap-1 justify-end">
              <button onClick={()=>openEdit(r)} className="p-1.5 rounded hover:bg-muted"><Pencil className="h-3.5 w-3.5 text-muted-foreground"/></button>
              <button onClick={()=>setDelItem(r)} className="p-1.5 rounded hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive"/></button>
            </div></td>}
          </tr>
        ))}</tbody>
      </table>
    );
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardList className="h-8 w-8 text-primary"/>Digital Forms
            </h1>
            <p className="text-muted-foreground text-sm mt-1">CCTV Surveillance Logs — Nyeri County Health Facilities SOP</p>
          </div>
          <div className="flex gap-2">
            {canManage && (
              <Button size="sm" onClick={openAdd}>
                <Plus className="h-4 w-4 mr-1"/>Add Entry
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1"/>Download Excel
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          {TABS.map(t => {
            const Icon = t.icon;
            const count = t.key==="daily"?daily.length:t.key==="weekly"?weekly.length:t.key==="footage"?footage.length:incident.length;
            return (
              <button key={t.key}
                onClick={()=>setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
                  ${tab===t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                <Icon className="h-4 w-4"/>
                {t.label}
                <span className="ml-1 text-xs bg-muted rounded-full px-1.5 py-0.5">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">{renderTable()}</div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <span className="text-xs text-muted-foreground">Page {page} of {totalPages} · {rows.length} entries</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page===1} onClick={()=>setPage(p=>p-1)}><ChevronLeft className="h-4 w-4"/></Button>
                  <Button size="sm" variant="outline" disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}><ChevronRight className="h-4 w-4"/></Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={addOpen || !!editItem} onOpenChange={open=>{ if(!open){setAddOpen(false);setEditItem(null);setForm({});} }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Entry" : "Add New Entry"} — {TABS.find(t=>t.key===tab)?.label}</DialogTitle>
          </DialogHeader>
          <div className="py-2">{renderForm()}</div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>{setAddOpen(false);setEditItem(null);setForm({});}}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving?"Saving…":editItem?"Save Changes":"Add Entry"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!delItem} onOpenChange={open=>{if(!open)setDelItem(null);}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
