import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, RotateCcw, Settings2, Timer, Bell, FileText, Shield, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";

interface AppSettings {
  inactivityTimeoutMinutes: number;
  warningBeforeSeconds: number;
  lowStockDefaultThreshold: number;
  issueDays: string[];
  hospitalName: string;
  sessionDurationDays: number;
  requireFolioPerItem: boolean;
  reportChargeItem: string;
  allowDataExports: boolean;
  maxLoginAttempts: number;
}

const DEFAULTS: AppSettings = {
  inactivityTimeoutMinutes: 1,
  warningBeforeSeconds: 10,
  lowStockDefaultThreshold: 10,
  issueDays: ["TUESDAY", "FRIDAY"],
  hospitalName: "Mukurweini Hospital Stores",
  sessionDurationDays: 30,
  requireFolioPerItem: true,
  reportChargeItem: "2211002",
  allowDataExports: true,
  maxLoginAttempts: 5,
};

const ALL_DAYS = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"];

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

  const handleReset = () => {
    setSettings(DEFAULTS);
    setDirty(true);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Settings2 className="h-7 w-7 text-primary" />System Settings
            </h1>
            <p className="text-muted-foreground mt-1">Configure system-wide behaviour for all users.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RotateCcw className="h-4 w-4" />Restore Defaults
            </Button>
            <Button onClick={handleSave} disabled={saving || !dirty} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving…" : "Save Settings"}
            </Button>
          </div>
        </div>

        {dirty && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-lg px-4 py-2 text-amber-700 dark:text-amber-400 text-sm font-medium">
            You have unsaved changes — click "Save Settings" to apply them.
          </div>
        )}

        {/* Session & Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Timer className="h-5 w-5 text-primary" />Session & Security</CardTitle>
            <CardDescription>Control how long users stay logged in and inactivity behaviour.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Inactivity Timeout (minutes)</Label>
                <Input
                  type="number" min="1" max="480"
                  value={settings.inactivityTimeoutMinutes}
                  onChange={e => update("inactivityTimeoutMinutes", Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">User is logged out after this many minutes of no activity. Currently: <strong>{settings.inactivityTimeoutMinutes} min</strong></p>
              </div>
              <div className="space-y-2">
                <Label>Warning Before Logout (seconds)</Label>
                <Input
                  type="number" min="5" max="120"
                  value={settings.warningBeforeSeconds}
                  onChange={e => update("warningBeforeSeconds", Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">Show a warning this many seconds before auto-logout.</p>
              </div>
              <div className="space-y-2">
                <Label>Session Duration (days)</Label>
                <Input
                  type="number" min="1" max="365"
                  value={settings.sessionDurationDays}
                  onChange={e => update("sessionDurationDays", Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">How long a login session lasts if the user stays active.</p>
              </div>
              <div className="space-y-2">
                <Label>Max Login Attempts</Label>
                <Input
                  type="number" min="3" max="20"
                  value={settings.maxLoginAttempts}
                  onChange={e => update("maxLoginAttempts", Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">Lock account after this many failed login attempts.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hospital Branding */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />Hospital Branding</CardTitle>
            <CardDescription>Customize the name and identity shown across the app.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Hospital / Facility Name</Label>
              <Input
                value={settings.hospitalName}
                onChange={e => update("hospitalName", e.target.value)}
                placeholder="e.g. Mukurweini Hospital Stores"
              />
              <p className="text-xs text-muted-foreground">Shown in the sidebar and on all exported reports.</p>
            </div>
          </CardContent>
        </Card>

        {/* Stock & Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" />Stock & Alerts</CardTitle>
            <CardDescription>Default thresholds for low stock warnings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default Low Stock Threshold</Label>
              <Input
                type="number" min="0"
                value={settings.lowStockDefaultThreshold}
                onChange={e => update("lowStockDefaultThreshold", Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Alert when stock falls to or below this level. Items with their own threshold set in Catalog will use that instead.</p>
            </div>
          </CardContent>
        </Card>

        {/* Issue Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />Issue Schedule</CardTitle>
            <CardDescription>Set which days of the week items are scheduled to be issued.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Scheduled Issue Days</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {ALL_DAYS.map(day => {
                  const active = settings.issueDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                      }`}
                    >
                      {day.charAt(0) + day.slice(1).toLowerCase()}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">These days are highlighted in the department issue grid and Excel export.</p>
            </div>
            <div className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <p className="text-sm font-medium">Require Folio Number Per Item</p>
                <p className="text-xs text-muted-foreground">Each commodity in a voucher must have its own folio number.</p>
              </div>
              <Switch
                checked={settings.requireFolioPerItem}
                onCheckedChange={v => update("requireFolioPerItem", v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Reports & Exports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Reports & Exports</CardTitle>
            <CardDescription>Configure report defaults and export permissions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Monthly Report Charge Item Code</Label>
              <Input
                value={settings.reportChargeItem}
                onChange={e => update("reportChargeItem", e.target.value)}
                placeholder="2211002"
                className="font-mono max-w-xs"
              />
              <p className="text-xs text-muted-foreground">This code appears in the "Charge Item" column of every monthly report row.</p>
            </div>
            <div className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <p className="text-sm font-medium">Allow Data Exports</p>
                <p className="text-xs text-muted-foreground">Permit users with export permission to download CSV and Excel files.</p>
              </div>
              <Switch
                checked={settings.allowDataExports}
                onCheckedChange={v => update("allowDataExports", v)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pb-8">
          <Button variant="outline" onClick={handleReset} className="gap-2">
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
