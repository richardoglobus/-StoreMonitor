import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, RotateCcw, Settings2, Timer, Bell, FileText, Shield, Building2, ShoppingCart, Package, Database, AlertTriangle, Palette, Pencil, Trash2, Tag } from "lucide-react";
import { useTheme, THEMES, LOGOS, AppTheme, AppLogo } from "@/lib/theme-context";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { API_BASE } from "@/lib/api";

interface AppSettings {
  // Session & Security
  inactivityTimeoutMinutes: number;
  warningBeforeSeconds: number;
  sessionDurationDays: number;
  maxLoginAttempts: number;
  // Branding
  hospitalName: string;
  facilityCode: string;
  countyName: string;
  subCountyName: string;
  // Stock & Alerts
  lowStockDefaultThreshold: number;
  enableLowStockEmailAlert: boolean;
  alertEmailAddress: string;
  // Issue Rules
  issueDays: string[];
  requireFolioPerItem: boolean;
  requireS11PerVoucher: boolean;
  allowIssueOnNonScheduledDays: boolean;
  maxIssueQuantityPerItem: number;
  // Purchases
  defaultCurrency: string;
  requireInvoiceNumber: boolean;
  requireSupplierName: boolean;
  // Reports & Exports
  reportChargeItem: string;
  responsibleOfficer: string;
  storeOfficerTitle: string;
  reportingOfficerTitle: string;
  financialYear: string;
  allowDataExports: boolean;
  exportIncludeZeroStock: boolean;
  appLogo: string;
  appTheme: string;
  loginEffect: string;
  allowSelfRegistration: boolean;
  selfRegistrationNote: string;
}

const DEFAULTS: AppSettings = {
  inactivityTimeoutMinutes: 1,
  warningBeforeSeconds: 10,
  sessionDurationDays: 30,
  maxLoginAttempts: 5,
  hospitalName: "Mukurweini Hospital Stores",
  facilityCode: "",
  countyName: "",
  subCountyName: "",
  lowStockDefaultThreshold: 10,
  enableLowStockEmailAlert: false,
  alertEmailAddress: "",
  issueDays: ["TUESDAY","FRIDAY"],
  requireFolioPerItem: true,
  requireS11PerVoucher: true,
  allowIssueOnNonScheduledDays: true,
  maxIssueQuantityPerItem: 0,
  defaultCurrency: "KES",
  requireInvoiceNumber: true,
  requireSupplierName: true,
  reportChargeItem: "2211002",
  responsibleOfficer: "",
  storeOfficerTitle: "Store Officer",
  reportingOfficerTitle: "Reporting Officer",
  financialYear: "2025/2026",
  allowDataExports: true,
  exportIncludeZeroStock: false,
  appLogo: "Building2",
  appTheme: "indigo",
  loginEffect: "split",
  allowSelfRegistration: false,
  selfRegistrationNote: "New accounts require admin approval before login.",
};

const ALL_DAYS = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"];

function SectionCard({ icon: Icon, title, description, children }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-5 w-5 text-primary" />{title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function ToggleRow({ label, description, checked, onChange }: any) {
  return (
    <div className="flex items-center justify-between border rounded-lg p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  if (!user?.permissions?.manageUsers) { setLocation("/"); return null; }

  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const { setAppTheme, setAppLogo } = useTheme();
  const [units, setUnits] = useState<{unit:string;itemCount:number;items:{id:number;description:string}[]}[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [editingUnit, setEditingUnit] = useState<string|null>(null);
  const [newUnitName, setNewUnitName] = useState("");
  const [unitSearch, setUnitSearch] = useState("");

  const loadUnits = () => {
    setUnitsLoading(true);
    fetch(`${API_BASE}/api/catalog/units`,{credentials:"include"})
      .then(r=>r.json()).then(setUnits).catch(()=>{}).finally(()=>setUnitsLoading(false));
  };

  const handleRenameUnit = async (oldUnit: string) => {
    if (!newUnitName.trim()) return;
    const res = await fetch(`${API_BASE}/api/catalog/units/${encodeURIComponent(oldUnit)}`,{
      method:"PATCH",credentials:"include",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({newUnit:newUnitName.trim().toUpperCase()})
    });
    const data = await res.json();
    if (!res.ok){toast.error(data.error||"Rename failed");return;}
    toast.success(`Renamed "${oldUnit}" → "${data.newUnit}" on ${data.affectedItems} item(s)`);
    setEditingUnit(null); setNewUnitName("");
    loadUnits();
  };

  const handleDeleteUnit = async (unit: string, count: number) => {
    if (!confirm(`Delete unit "${unit}" from ${count} item(s)? Their unit will be cleared and must be reassigned.`)) return;
    const res = await fetch(`${API_BASE}/api/catalog/units/${encodeURIComponent(unit)}`,{method:"DELETE",credentials:"include"});
    const data = await res.json();
    if (!res.ok){toast.error(data.error||"Delete failed");return;}
    toast.success(`Deleted unit "${unit}" from ${data.affectedItems} item(s). Please update those items in Catalog.`);
    loadUnits();
  };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/settings`, { credentials: "include" })
      .then(r => r.json())
      .then(data => { setSettings({ ...DEFAULTS, ...data }); setLoading(false); })
      .catch(() => { toast.error("Failed to load settings"); setLoading(false); });
  }, []);

  const update = (key: keyof AppSettings, value: any) => {
    setSettings(s => ({ ...s, [key]: value }));
    setDirty(true);
    // Apply appearance changes immediately
    if (key === "appTheme") setAppTheme(value as AppTheme);
    if (key === "appLogo") setAppLogo(value as AppLogo);
  };

  const toggleDay = (day: string) => {
    const next = settings.issueDays.includes(day)
      ? settings.issueDays.filter(d => d !== day)
      : [...settings.issueDays, day];
    update("issueDays", next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Failed");
      const saved = await res.json();
      setSettings({ ...DEFAULTS, ...saved });
      setDirty(false);
      toast.success("Settings saved successfully");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/backup`, { credentials: "include" });
      if (!res.ok) { toast.error("Backup failed"); return; }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `storemonitor_backup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      toast.success("Backup downloaded successfully");
    } catch { toast.error("Backup failed"); }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm("WARNING: Restoring a backup will REPLACE all current data. Are you absolutely sure?")) {
      e.target.value = ""; return;
    }
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch(`${API_BASE}/api/admin/restore`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const err = await res.json(); toast.error(err.error || "Restore failed"); return; }
      toast.success("Backup restored! Refreshing in 2 seconds…");
      setTimeout(() => window.location.reload(), 2000);
    } catch { toast.error("Invalid backup file"); }
    e.target.value = "";
  };

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="flex flex-col gap-6 max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Settings2 className="h-7 w-7 text-primary" />System Settings
            </h1>
            <p className="text-muted-foreground mt-1">Configure system-wide behaviour for all users.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setSettings(DEFAULTS); setDirty(true); }} className="gap-2">
              <RotateCcw className="h-4 w-4" />Defaults
            </Button>
            <Button onClick={handleSave} disabled={saving || !dirty} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving…" : "Save Settings"}
            </Button>
          </div>
        </div>

        {dirty && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-lg px-4 py-2 text-amber-700 dark:text-amber-400 text-sm font-medium">
            Unsaved changes — click "Save Settings" to apply.
          </div>
        )}

        {/* 1. Facility Identity */}
        <SectionCard icon={Building2} title="Facility Identity" description="Names and codes that appear on reports and the app header.">
          <div className="space-y-2">
            <Label>Hospital / Facility Name</Label>
            <Input value={settings.hospitalName} onChange={e => update("hospitalName", e.target.value)} placeholder="e.g. Mukurweini Hospital Stores" />
            <p className="text-xs text-muted-foreground">Shown in the sidebar and on all exported reports.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Facility Code</Label>
              <Input value={settings.facilityCode} onChange={e => update("facilityCode", e.target.value)} placeholder="e.g. 14085" />
            </div>
            <div className="space-y-2">
              <Label>County</Label>
              <Input value={settings.countyName} onChange={e => update("countyName", e.target.value)} placeholder="e.g. Nyeri" />
            </div>
            <div className="space-y-2">
              <Label>Sub-County</Label>
              <Input value={settings.subCountyName} onChange={e => update("subCountyName", e.target.value)} placeholder="e.g. Mukurweini" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Financial Year</Label>
            <Input value={settings.financialYear} onChange={e => update("financialYear", e.target.value)} placeholder="e.g. 2025/2026" className="max-w-xs" />
            <p className="text-xs text-muted-foreground">Shown on monthly report headers.</p>
          </div>
        </SectionCard>

        {/* 2. Session & Security */}
        <SectionCard icon={Timer} title="Session & Security" description="Control how long users stay logged in and inactivity behaviour.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Inactivity Timeout (minutes)</Label>
              <Input type="number" min="1" max="480" value={settings.inactivityTimeoutMinutes} onChange={e => update("inactivityTimeoutMinutes", Number(e.target.value))} />
              <p className="text-xs text-muted-foreground">Logout after this many idle minutes. Currently <strong>{settings.inactivityTimeoutMinutes} min</strong>.</p>
            </div>
            <div className="space-y-2">
              <Label>Warning Before Logout (seconds)</Label>
              <Input type="number" min="5" max="120" value={settings.warningBeforeSeconds} onChange={e => update("warningBeforeSeconds", Number(e.target.value))} />
              <p className="text-xs text-muted-foreground">Show warning banner this many seconds before logging out.</p>
            </div>
            <div className="space-y-2">
              <Label>Session Duration (days)</Label>
              <Input type="number" min="1" max="365" value={settings.sessionDurationDays} onChange={e => update("sessionDurationDays", Number(e.target.value))} />
              <p className="text-xs text-muted-foreground">How long an active login lasts before requiring re-login.</p>
            </div>
            <div className="space-y-2">
              <Label>Max Failed Login Attempts</Label>
              <Input type="number" min="3" max="20" value={settings.maxLoginAttempts} onChange={e => update("maxLoginAttempts", Number(e.target.value))} />
              <p className="text-xs text-muted-foreground">Account locks after this many wrong passwords.</p>
            </div>
          </div>
        </SectionCard>

        {/* 3. Stock & Alerts */}
        <SectionCard icon={Bell} title="Stock & Alerts" description="Default thresholds and notification rules for low stock.">
          <div className="space-y-2">
            <Label>Default Low Stock Threshold</Label>
            <Input type="number" min="0" value={settings.lowStockDefaultThreshold} onChange={e => update("lowStockDefaultThreshold", Number(e.target.value))} className="max-w-xs" />
            <p className="text-xs text-muted-foreground">Alert when stock falls to or below this level. Items with their own threshold in Catalog override this.</p>
          </div>
          <Separator />
          <ToggleRow
            label="Enable Email Alerts for Low Stock"
            description="Send an email when any item falls below its threshold. (Requires email configuration on the server.)"
            checked={settings.enableLowStockEmailAlert}
            onChange={(v: boolean) => update("enableLowStockEmailAlert", v)}
          />
          {settings.enableLowStockEmailAlert && (
            <div className="space-y-2">
              <Label>Alert Email Address</Label>
              <Input type="email" value={settings.alertEmailAddress} onChange={e => update("alertEmailAddress", e.target.value)} placeholder="stores@hospital.go.ke" />
            </div>
          )}
        </SectionCard>

        {/* 4. Issue Rules */}
        <SectionCard icon={Shield} title="Issue Rules" description="Control how items are issued to departments.">
          <div className="space-y-2">
            <Label>Scheduled Issue Days</Label>
            <div className="flex flex-wrap gap-2 pt-1">
              {ALL_DAYS.map(day => {
                const active = settings.issueDays.includes(day);
                return (
                  <button key={day} type="button" onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:bg-muted/80"}`}>
                    {day.charAt(0) + day.slice(1).toLowerCase()}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">Highlighted in the department grid and Excel export. Tuesdays & Fridays are standard issue days.</p>
          </div>
          <ToggleRow label="Allow Issues on Non-Scheduled Days" description="If off, staff cannot record an issue on a day not in the schedule above." checked={settings.allowIssueOnNonScheduledDays} onChange={(v: boolean) => update("allowIssueOnNonScheduledDays", v)} />
          <ToggleRow label="Require Folio Number Per Item" description="Each commodity in a voucher must have its own unique folio number." checked={settings.requireFolioPerItem} onChange={(v: boolean) => update("requireFolioPerItem", v)} />
          <ToggleRow label="Require S11 Number Per Voucher" description="Every issue voucher must have an S11 reference number." checked={settings.requireS11PerVoucher} onChange={(v: boolean) => update("requireS11PerVoucher", v)} />
          <div className="space-y-2">
            <Label>Max Issue Quantity Per Item</Label>
            <Input type="number" min="0" value={settings.maxIssueQuantityPerItem} onChange={e => update("maxIssueQuantityPerItem", Number(e.target.value))} className="max-w-xs" />
            <p className="text-xs text-muted-foreground">Set to 0 for no limit. If set, staff cannot issue more than this quantity of any single item per voucher.</p>
          </div>
        </SectionCard>

        {/* 5. Purchases */}
        <SectionCard icon={ShoppingCart} title="Purchases" description="Rules for recording incoming stock purchases.">
          <div className="space-y-2">
            <Label>Default Currency</Label>
            <Input value={settings.defaultCurrency} onChange={e => update("defaultCurrency", e.target.value.toUpperCase())} placeholder="KES" className="max-w-xs font-mono" />
            <p className="text-xs text-muted-foreground">Used when displaying prices in the Purchases log.</p>
          </div>
          <ToggleRow label="Require Invoice Number" description="Each purchase record must have a supplier invoice number." checked={settings.requireInvoiceNumber} onChange={(v: boolean) => update("requireInvoiceNumber", v)} />
          <ToggleRow label="Require Supplier Name" description="Each purchase must have a named supplier (KEMSA, MEDS, etc.)." checked={settings.requireSupplierName} onChange={(v: boolean) => update("requireSupplierName", v)} />
        </SectionCard>

        {/* 6. Reports & Exports */}
        <SectionCard icon={FileText} title="Reports & Exports" description="Configure what appears on monthly reports and Excel exports.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Charge Item Code</Label>
              <Input value={settings.reportChargeItem} onChange={e => update("reportChargeItem", e.target.value)} placeholder="2211002" className="font-mono" />
              <p className="text-xs text-muted-foreground">Appears in "Charge Item" column on every monthly report row.</p>
            </div>
            <div className="space-y-2">
              <Label>Responsible Officer Name</Label>
              <Input value={settings.responsibleOfficer} onChange={e => update("responsibleOfficer", e.target.value)} placeholder="e.g. John Kamau" />
              <p className="text-xs text-muted-foreground">Name shown in "Responsible Officer" column on reports and Excel.</p>
            </div>
            <div className="space-y-2">
              <Label>Store Officer Title</Label>
              <Input value={settings.storeOfficerTitle} onChange={e => update("storeOfficerTitle", e.target.value)} placeholder="Store Officer" />
            </div>
            <div className="space-y-2">
              <Label>Reporting Officer Title</Label>
              <Input value={settings.reportingOfficerTitle} onChange={e => update("reportingOfficerTitle", e.target.value)} placeholder="Reporting Officer" />
            </div>
          </div>
          <Separator />
          <ToggleRow label="Allow Data Exports" description="Permit users with export permission to download CSV and Excel files." checked={settings.allowDataExports} onChange={(v: boolean) => update("allowDataExports", v)} />
          <ToggleRow label="Include Zero-Stock Items in Exports" description="If on, items with zero stock appear in inventory exports. If off, they are hidden." checked={settings.exportIncludeZeroStock} onChange={(v: boolean) => update("exportIncludeZeroStock", v)} />
        </SectionCard>

        {/* 7. Backup & Restore */}
        <SectionCard icon={Database} title="Backup & Restore" description="Download a backup of all data or restore from a previous backup.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Download Backup</Label>
              <Button variant="outline" className="w-full gap-2" onClick={handleBackup}>
                <Database className="h-4 w-4" />Download Backup JSON
              </Button>
              <p className="text-xs text-muted-foreground">Downloads all data (items, purchases, issues, users) as a JSON file. Store it safely.</p>
            </div>
            <div className="space-y-2">
              <Label>Restore from Backup</Label>
              <label className="w-full">
                <div className="flex items-center justify-center gap-2 border-2 border-dashed border-destructive/40 rounded-md py-2 px-4 cursor-pointer hover:bg-destructive/5 transition-colors">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Choose backup file…</span>
                </div>
                <input type="file" accept=".json" className="sr-only" onChange={handleRestore} />
              </label>
              <p className="text-xs text-destructive font-medium">⚠ This will replace ALL current data. Cannot be undone.</p>
            </div>
          </div>
        </SectionCard>

        {/* 7. Units Management */}
        <SectionCard icon={Tag} title="Units Management" description="View, rename or delete measurement units used in the item catalog.">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadUnits} disabled={unitsLoading} className="gap-2">
              {unitsLoading ? <Loader2 className="h-3 w-3 animate-spin"/> : <Tag className="h-3 w-3"/>}
              {unitsLoading ? "Loading…" : units.length ? "Refresh Units" : "Load Units"}
            </Button>
            {units.length > 0 && (
              <div className="flex items-center gap-2 border rounded-md px-3 h-8 bg-background flex-1 max-w-xs">
                <input placeholder="Search units…" value={unitSearch} onChange={e=>setUnitSearch(e.target.value)}
                  className="bg-transparent text-sm outline-none flex-1"/>
              </div>
            )}
          </div>

          {units.length > 0 && (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {units.filter(u=>!unitSearch||u.unit.toLowerCase().includes(unitSearch.toLowerCase())).map(u=>(
                <div key={u.unit} className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                  {editingUnit === u.unit ? (
                    <>
                      <Input
                        value={newUnitName} onChange={e=>setNewUnitName(e.target.value.toUpperCase())}
                        placeholder="New unit name" className="h-7 text-sm font-mono flex-1 max-w-[140px]"
                        autoFocus onKeyDown={e=>{if(e.key==="Enter") handleRenameUnit(u.unit); if(e.key==="Escape"){setEditingUnit(null);setNewUnitName("");}}}
                      />
                      <Button size="sm" className="h-7 text-xs" onClick={()=>handleRenameUnit(u.unit)} disabled={!newUnitName.trim()}>Save</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={()=>{setEditingUnit(null);setNewUnitName("");}}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <span className="font-mono font-semibold text-sm w-28 shrink-0">{u.unit}</span>
                      <span className="text-xs text-muted-foreground flex-1">{u.itemCount} item{u.itemCount!==1?"s":""}</span>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        onClick={()=>{setEditingUnit(u.unit);setNewUnitName(u.unit);}}>
                        <Pencil className="h-3 w-3"/>
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={()=>handleDeleteUnit(u.unit,u.itemCount)}>
                        <Trash2 className="h-3 w-3"/>
                      </Button>
                    </>
                  )}
                </div>
              ))}
              {units.filter(u=>!unitSearch||u.unit.toLowerCase().includes(unitSearch.toLowerCase())).length===0&&(
                <p className="text-sm text-muted-foreground text-center py-4">No units match your search</p>
              )}
            </div>
          )}

          {!unitsLoading && units.length===0&&(
            <p className="text-sm text-muted-foreground italic">Click "Load Units" to see all units currently in use in the catalog.</p>
          )}
          <p className="text-xs text-muted-foreground">Renaming a unit updates all catalog items using that unit. Deleting clears the unit from those items — you must then reassign them in the Catalog.</p>
        </SectionCard>

        {/* 8. Appearance */}
        <SectionCard icon={Palette} title="Appearance" description="Customize the logo icon and color theme of the app. Changes apply instantly for everyone.">
          {/* Logo picker */}
          <div className="space-y-2">
            <Label>App Logo / Icon</Label>
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(LOGOS).map(([key, val]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => update("appLogo", key)}
                  title={val.label}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${
                    settings.appLogo === key
                      ? "border-primary bg-primary/10 scale-105"
                      : "border-border hover:border-primary/40 hover:bg-muted"
                  }`}
                >
                  <span className="text-2xl">{val.emoji}</span>
                  <span className="text-[9px] text-muted-foreground truncate w-full text-center">{val.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Theme color picker */}
          <div className="space-y-2 pt-2">
            <Label>Color Theme</Label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(THEMES).map(([key, val]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => update("appTheme", key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                    settings.appTheme === key
                      ? "border-primary scale-105 shadow-sm"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: val.primary }} />
                  <span className="text-xs truncate">{val.label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Theme color is saved and applied for all users after clicking Save.</p>
          </div>

          {/* Login Effect picker */}
          <div className="space-y-2 pt-2">
            <Label>Login Page Animation Style</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {([
                { key: "split",     label: "Split Panel",       desc: "Left form, right welcome panel",     preview: "🟧🟦" },
                { key: "particles", label: "Particle Network",  desc: "Floating connected particles on dark", preview: "✨" },
                { key: "glass",     label: "Glassmorphism",     desc: "Frosted glass card with blobs",        preview: "🫧" },
                { key: "wave",      label: "Wave Gradient",     desc: "Animated flowing colour gradient",     preview: "🌊" },
                { key: "gradient",  label: "Mesh Gradient",     desc: "Colourful glowing mesh background",    preview: "🎨" },
              ] as const).map(ef => (
                <button
                  key={ef.key}
                  type="button"
                  onClick={() => update("loginEffect", ef.key)}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                    settings.loginEffect === ef.key
                      ? "border-primary bg-primary/10 scale-[1.02]"
                      : "border-border hover:border-primary/40 hover:bg-muted"
                  }`}
                >
                  <span className="text-2xl shrink-0">{ef.preview}</span>
                  <div>
                    <p className="text-sm font-semibold">{ef.label}</p>
                    <p className="text-xs text-muted-foreground">{ef.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Applies on next login page load. Staff can also click the <strong>🎨 1/5</strong> button on the login page to cycle through all styles in real time.
            </p>
          </div>

          {/* Self-registration */}
          <Separator />
          <ToggleRow
            label="Allow Self-Registration"
            description="Let staff create their own accounts from the login page. New accounts still require admin approval before they can log in."
            checked={settings.allowSelfRegistration}
            onChange={(v: boolean) => update("allowSelfRegistration", v)}
          />
          {settings.allowSelfRegistration && (
            <div className="space-y-2">
              <Label>Registration Notice (shown to new users)</Label>
              <Input
                value={settings.selfRegistrationNote}
                onChange={e => update("selfRegistrationNote", e.target.value)}
                placeholder="e.g. New accounts require admin approval before login."
              />
            </div>
          )}
        </SectionCard>

        {/* 8. Catalog */}
        <SectionCard icon={Package} title="Catalog" description="Rules for the item catalog.">
          <div className="p-3 bg-muted/40 rounded-lg text-sm text-muted-foreground space-y-2">
            <p>Per-item settings (low stock threshold, unit) are managed directly on each item in the <strong>Catalog</strong> section.</p>
            <p>To set a threshold for a specific item: go to <strong>Catalog → edit the item → set "Alert At" value</strong>. That value overrides the default threshold above.</p>
          </div>
        </SectionCard>

        <div className="flex justify-end gap-2 pb-8">
          <Button variant="outline" onClick={() => { setSettings(DEFAULTS); setDirty(true); }} className="gap-2">
            <RotateCcw className="h-4 w-4" />Restore Defaults
          </Button>
          <Button onClick={handleSave} disabled={saving || !dirty} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving…" : "Save Settings"}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
