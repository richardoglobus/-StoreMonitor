import { useState } from "react";
import { Layout } from "@/components/layout";
import { MonthPicker, getCurrentMonth } from "@/components/month-picker";
import {
  useListDepartments,
  getListDepartmentsQueryKey,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, FileSpreadsheet, Activity, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";

// Fetch-based download so session cookie is always sent
async function downloadCsv(url: string, filename: string, setLoading: (v: boolean) => void) {
  setLoading(true);
  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) {
      alert("Export failed. Make sure you are logged in and have export permission.");
      return;
    }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch (e) {
    alert("Download error. Please try again.");
  } finally {
    setLoading(false);
  }
}

export default function Exports() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  if (!user?.permissions?.exportData) {
    setLocation("/");
    return null;
  }
  const [month, setMonth] = useState(getCurrentMonth());
  const [departmentId, setDepartmentId] = useState<string>("all");
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  const { data: departments } = useListDepartments({ query: { queryKey: getListDepartmentsQueryKey() } });

  const issuesUrl = departmentId !== "all"
    ? `/api/export/issues.csv?month=${month}&departmentId=${departmentId}`
    : `/api/export/issues.csv?month=${month}`;

  const inventoryUrl = departmentId !== "all"
    ? `/api/export/inventory.csv?departmentId=${departmentId}&month=${month}`
    : "";

  const monthlyUrl = `/api/export/monthly-report.csv?startMonth=${month}&endMonth=${month}`;

  return (
    <Layout>
      <div className="flex flex-col gap-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Exports</h1>
          <p className="text-muted-foreground">Download hospital inventory data as CSV files.</p>
        </div>

        <Card className="border-primary/20 shadow-sm">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle>Export Parameters</CardTitle>
            <CardDescription>Select the month and department to filter the exported data.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Month</Label>
                <div className="block w-fit">
                  <MonthPicker month={month} onChange={setMonth} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments?.map(d => (
                      <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Issues CSV */}
          <Card>
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>Issues Log CSV</CardTitle>
              <CardDescription>Line-by-line log of all items issued, including dates, quantities, and notes.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                disabled={loadingIssues}
                onClick={() => downloadCsv(issuesUrl, `issues_${month}.csv`, setLoadingIssues)}
              >
                {loadingIssues ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                {loadingIssues ? "Downloading…" : "Download Issues"}
              </Button>
            </CardContent>
          </Card>

          {/* Inventory CSV */}
          <Card className={departmentId === "all" ? "opacity-60" : ""}>
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>Inventory Balance CSV</CardTitle>
              <CardDescription>Full inventory breakdown for a specific department: opening balance, receipts, issues, and closing balance.</CardDescription>
            </CardHeader>
            <CardContent>
              {departmentId === "all" ? (
                <Button className="w-full" variant="outline" disabled>
                  Select a specific department first
                </Button>
              ) : (
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={loadingInventory}
                  onClick={() => downloadCsv(inventoryUrl, `inventory_${departmentId}_${month}.csv`, setLoadingInventory)}
                >
                  {loadingInventory ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  {loadingInventory ? "Downloading…" : "Download Inventory"}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Monthly Report CSV */}
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>Monthly Report CSV</CardTitle>
              <CardDescription>Full monthly commodity report with opening balances, additions, issues, and closing balances for all items.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                variant="outline"
                disabled={loadingMonthly}
                onClick={() => downloadCsv(monthlyUrl, `monthly_report_${month}.csv`, setLoadingMonthly)}
              >
                {loadingMonthly ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                {loadingMonthly ? "Downloading…" : "Download Monthly Report"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
