import { useState } from "react";
import { format } from "date-fns";
import { Layout } from "@/components/layout";
import { DateRangePicker, todayStr, firstOfMonth } from "@/components/date-range-picker";
import { useGetMonthlyReport, getGetMonthlyReportQueryKey, API_BASE } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, BarChart3, Loader2, FileSpreadsheet, Printer } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";

const CHARGE_ITEM = "2211002";

async function downloadCsv(url: string, filename: string, setLoading: (v: boolean) => void) {
  setLoading(true);
  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) { alert("Export failed. Check you are logged in."); return; }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch { alert("Download error. Please try again."); }
  finally { setLoading(false); }
}

export default function MonthlyReportPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  if (!user?.permissions?.viewReports) { setLocation("/"); return null; }

  const [from, setFrom] = useState(firstOfMonth());
  const [search, setSearch] = useState("");
  const [to, setTo] = useState(todayStr());
  const [queryDates, setQueryDates] = useState({ from: firstOfMonth(), to: todayStr() });
  const [loadingCsv, setLoadingCsv] = useState(false);
  const [loadingXlsx, setLoadingXlsx] = useState(false);
  const handlePrint = () => window.print();

  const startMonth = queryDates.from.slice(0, 7);
  const endMonth = queryDates.to.slice(0, 7);

  const { data: report, isLoading, error } = useGetMonthlyReport(
    { startMonth, endMonth },
    { query: { queryKey: [...getGetMonthlyReportQueryKey({ startMonth, endMonth }), "_v2"], refetchOnMount: true, staleTime: 0 } }
  );

  // Handle both new {commodities:[]} and old {months:[]} formats
  const allCommodities: any[] = (() => {
    if (!report) return [];
    const r = report as any;
    // New format
    if (Array.isArray(r.commodities)) return r.commodities;
    // Old format — flatten months into commodities
    if (Array.isArray(r.months)) {
      const map = new Map<number, any>();
      for (const m of r.months) {
        for (const c of (m.commodities ?? [])) {
          if (!map.has(c.itemId)) map.set(c.itemId, { ...c, rows: [] });
          for (const row of c.rows) map.get(c.itemId).rows.push({ ...row, month: m.month });
        }
      }
      return Array.from(map.values());
    }
    return [];
  })();

  const commodities = allCommodities.filter((c: any) =>
    !search.trim() || c.itemDescription.toLowerCase().includes(search.trim().toLowerCase())
  );

  const handleGenerate = () => setQueryDates({ from, to });
  const downloadUrl = `${API_BASE}/api/export/monthly-report.csv?startMonth=${startMonth}&endMonth=${endMonth}`;
  const xlsxUrl = `${API_BASE}/api/export/monthly-report.xlsx?startMonth=${startMonth}&endMonth=${endMonth}`;

  return (
    <>
      <style>{`@media print { nav,aside,header,[data-no-print]{display:none!important;} main{padding:0!important;} }`}</style>
      <Layout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monthly Report</h1>
          <p className="text-muted-foreground">Comprehensive summary of stock movements over a date range.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Report Parameters</CardTitle>
            <CardDescription>Choose a date range to generate the report.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-end gap-4 flex-wrap">
            <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
            <Button onClick={handleGenerate} className="gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
              Generate Report
            </Button>
            {allCommodities.length > 0 && (
              <div className="flex items-center gap-2 border rounded-md px-3 h-9 bg-background w-full sm:w-64">
                <svg className="h-4 w-4 text-muted-foreground shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                <input placeholder="Search commodity…" value={search} onChange={e => setSearch(e.target.value)}
                  className="bg-transparent text-sm outline-none flex-1 text-foreground placeholder:text-muted-foreground"/>
                {search && <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground text-xs">✕</button>}
              </div>
            )}
            <Button variant="outline" className="gap-2" disabled={loadingCsv}
              onClick={() => downloadCsv(downloadUrl, `monthly_report_${startMonth}_${endMonth}.csv`, setLoadingCsv)}>
              {loadingCsv ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {loadingCsv ? "Downloading…" : "Download CSV"}
            </Button>
            <Button variant="outline" className="gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" />Print
            </Button>
            <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white" disabled={loadingXlsx}
              onClick={() => downloadCsv(xlsxUrl, `monthly_report_${startMonth}_${endMonth}.xlsx`, setLoadingXlsx)}>
              {loadingXlsx ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              {loadingXlsx ? "Downloading…" : "Download Excel"}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive rounded-lg text-destructive text-sm">
            Failed to load report. Try generating again or check your connection.
          </div>
        )}
        {isLoading ? (
          <div className="space-y-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : commodities.length > 0 ? (
          <>
          {search && <p className="text-sm text-muted-foreground">Showing {commodities.length} of {allCommodities.length} commodities matching "<strong>{search}</strong>"</p>}
          <div className="space-y-6">
            {commodities.map((commodity: any) => {
              return (
                <Card key={commodity.itemId} className="overflow-hidden border shadow-sm">
                  {/* Commodity header */}
                  <CardHeader className="py-3 px-5 bg-muted/30 border-b">
                    <CardTitle className="text-base">{commodity.itemDescription}</CardTitle>
                    <CardDescription>Unit: {commodity.unit}</CardDescription>
                  </CardHeader>

                  {/* Single table for ALL months */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="w-32">Date</TableHead>
                          <TableHead className="text-right">Opening Units</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Opening Cost</TableHead>
                          <TableHead className="text-right">Additions</TableHead>
                          <TableHead className="text-right">Cost of Additions</TableHead>
                          <TableHead className="text-right">Items Issued</TableHead>
                          <TableHead className="text-right font-semibold">Balance</TableHead>
                          <TableHead className="text-center">Charge Item</TableHead>
                          <TableHead>Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {commodity.rows.map((row: any, idx: number) => {
                          const isOpening = row.rowType === "opening";
                          const isClosing = row.rowType === "closing";
                          const isAdditions = row.rowType === "additions";
                          return (
                            <TableRow key={idx} className={
                              isOpening
                                ? "bg-blue-50/40 dark:bg-blue-950/20 font-medium"
                                : isAdditions
                                ? "bg-green-50/30 dark:bg-green-950/20"
                                : isClosing
                                ? "bg-muted/40 font-semibold border-t-2 border-border"
                                : ""
                            }>
                              <TableCell className="text-sm font-medium whitespace-nowrap">
                                {format(new Date(row.date), "d MMM yyyy")}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                {row.units != null ? row.units : "-"}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                {row.unitPrice != null ? row.unitPrice : "-"}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                {row.openingTotalCost != null ? row.openingTotalCost : "-"}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm text-green-700 dark:text-green-400 font-semibold">
                                {row.additionsUnits != null ? `+${row.additionsUnits}` : "-"}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                {row.additionsUnitCost != null ? row.additionsUnitCost : "-"}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm text-orange-600 dark:text-orange-400">
                                {row.itemsIssued != null ? row.itemsIssued : "-"}
                              </TableCell>
                              <TableCell className={`text-right font-mono font-bold text-sm ${
                                row.balance <= 0 ? "text-destructive" :
                                row.balance <= 10 ? "text-orange-500" : ""
                              }`}>
                                {row.balance}
                              </TableCell>
                              <TableCell className="text-center font-mono text-xs font-semibold text-primary">
                                {CHARGE_ITEM}
                              </TableCell>
                              <TableCell className="text-sm italic text-muted-foreground">
                                {row.remarks || "-"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              );
            })}
          </div>
          </>
        ) : report !== undefined ? (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
            <BarChart3 className="h-12 w-12 mb-4 opacity-20" />
            <p>No activity found for this date range</p>
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
            <BarChart3 className="h-12 w-12 mb-4 opacity-20" />
            <p>Select a date range and click "Generate Report"</p>
          </div>
        )}
      </div>
    </Layout>
    </>
  );
}
