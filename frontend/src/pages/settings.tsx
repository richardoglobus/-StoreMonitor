import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, RotateCcw, Settings2, Timer, Bell, FileText, Shield, Building2, ShoppingCart, Package } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetch("/api/settings", { credentials: "include" })
      .then(r => r.json())
      .then(data => { setSettings({ ...DEFAULTS, ...data }); setLoading(false); })
      .catch(() => { toast.error("Failed to load settings"); setLoading(false); });
  }, []);

  const update = (key: keyof AppSettings, value: any) => {
    setSettings(s => ({ ...s, [key]: value }));
    setDirty(true);
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
      const res = await fetch("/api/settings", {
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

        {/* 7. Catalog */}
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
