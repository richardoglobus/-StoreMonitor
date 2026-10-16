import { useState } from "react";
import { Layout } from "@/components/layout";
import { DateRangePicker, todayStr, firstOfMonth } from "@/components/date-range-picker";
import { useListDepartments, getListDepartmentsQueryKey, API_BASE, apiFetchResponse } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, FileSpreadsheet, Activity, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";

async function downloadCsv(url: string, filename: string, setLoading: (v: boolean) => void, setStatus?: (v: string) => void) {
  setLoading(true);
  setStatus?.("Preparing compressed export…");
  try {
    const res = await apiFetchResponse(url);
    if (!res.ok) { alert("Export failed. Make sure you are logged in and have export permission."); return; }
    setStatus?.("Downloading compressed file…");
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const suggested = res.headers.get("content-disposition")?.match(/filename="?([^"]+)"?/i)?.[1];
    a.download = suggested || filename.replace(/\.(csv|xlsx)$/i, ".zip");
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch { alert("Download error. Please try again."); }
  finally { setLoading(false); setStatus?.(""); }
}

export default function Exports() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  if (!user?.permissions?.exportData) { setLocation("/"); return null; }

  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayStr());
  const [departmentId, setDepartmentId] = useState("all");
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [loadingMonthlyExcel, setLoadingMonthlyExcel] = useState(false);
  const [exportStatus, setExportStatus] = useState("");

  const { data: departments } = useListDepartments({ query: { queryKey: getListDepartmentsQueryKey() } });

  const month = from.slice(0, 7);
  const endMonth = to.slice(0, 7);

  const issuesUrl = departmentId !== "all"
    ? `${API_BASE}/api/export/issues.csv?month=${month}&departmentId=${departmentId}`
    : `${API_BASE}/api/export/issues.csv?month=${month}`;
  const inventoryUrl = `${API_BASE}/api/export/inventory.csv?departmentId=${departmentId}&month=${month}`;
  const monthlyUrl = `${API_BASE}/api/export/monthly-report.csv?startMonth=${month}&endMonth=${endMonth}`;
  const monthlyExcelUrl = `${API_BASE}/api/export/monthly-report.xlsx?startMonth=${month}&endMonth=${endMonth}`;
  const rangeDays = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000;
  const invalidRange = !from || !to || from > to || !Number.isFinite(rangeDays) || rangeDays > 366 || (endMonth < month || (Number(endMonth.slice(0,4)) * 12 + Number(endMonth.slice(5)) - Number(month.slice(0,4)) * 12 - Number(month.slice(5))) > 11);

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
            <CardDescription>Select a date range and department to filter exported data.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
            {invalidRange && <p className="text-sm text-destructive">Choose a valid date range of no more than 366 days and 12 months.</p>}
            {exportStatus && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{exportStatus}</div>}
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="Select Department"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments?.map(d=>(
                    <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Activity className="h-5 w-5 text-primary"/>
              </div>
              <CardTitle>Issues Log CSV</CardTitle>
              <CardDescription>Line-by-line log of all items issued, dates, quantities, and notes.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled={loadingIssues || invalidRange}
                onClick={()=>downloadCsv(issuesUrl,`issues_${month}.csv`,setLoadingIssues,setExportStatus)}>
                {loadingIssues?<Loader2 className="h-4 w-4 mr-2 animate-spin"/>:<Download className="h-4 w-4 mr-2"/>}
                {loadingIssues?"Downloading…":"Download Issues"}
              </Button>
            </CardContent>
          </Card>

          <Card className={departmentId==="all"?"opacity-60":""}>
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <FileSpreadsheet className="h-5 w-5 text-primary"/>
              </div>
              <CardTitle>Inventory Balance CSV</CardTitle>
              <CardDescription>Full inventory for a department: opening, receipts, issues, closing balance.</CardDescription>
            </CardHeader>
            <CardContent>
              {departmentId==="all" ? (
                <Button className="w-full" variant="outline" disabled>Select a specific department first</Button>
              ) : (
                <Button className="w-full" variant="outline" disabled={loadingInventory || invalidRange}
                  onClick={()=>downloadCsv(inventoryUrl,`inventory_${departmentId}_${month}.csv`,setLoadingInventory,setExportStatus)}>
                  {loadingInventory?<Loader2 className="h-4 w-4 mr-2 animate-spin"/>:<Download className="h-4 w-4 mr-2"/>}
                  {loadingInventory?"Downloading…":"Download Inventory"}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <FileSpreadsheet className="h-5 w-5 text-primary"/>
              </div>
              <CardTitle>Monthly Report CSV</CardTitle>
              <CardDescription>Full commodity report with opening balances, additions, issues, and closing balances.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" disabled={loadingMonthly || invalidRange}
                onClick={()=>downloadCsv(monthlyUrl,`monthly_report_${month}_${endMonth}.csv`,setLoadingMonthly,setExportStatus)}>
                {loadingMonthly?<Loader2 className="h-4 w-4 mr-2 animate-spin"/>:<Download className="h-4 w-4 mr-2"/>}
                {loadingMonthly?"Downloading…":"Download Monthly Report"}
              </Button>
              <Button className="mt-2 w-full" variant="outline" disabled={loadingMonthlyExcel || invalidRange}
                onClick={()=>downloadCsv(monthlyExcelUrl,`monthly_report_${month}_${endMonth}.xlsx`,setLoadingMonthlyExcel,setExportStatus)}>
                {loadingMonthlyExcel?<Loader2 className="h-4 w-4 mr-2 animate-spin"/>:<FileSpreadsheet className="h-4 w-4 mr-2"/>}
                {loadingMonthlyExcel?"Downloading…":"Download Monthly Report Excel"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
