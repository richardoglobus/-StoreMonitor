import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Layout } from "@/components/layout";
import { DateRangePicker, todayStr, firstOfMonth } from "@/components/date-range-picker";
import { useGetMonthlyReport, getGetMonthlyReportQueryKey } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, BarChart3, Loader2 } from "lucide-react";
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
  const [to, setTo] = useState(todayStr());
  const [queryDates, setQueryDates] = useState({ from: firstOfMonth(), to: todayStr() });
  const [loadingCsv, setLoadingCsv] = useState(false);

  // Convert full dates to month strings for the API
  const startMonth = queryDates.from.slice(0, 7);
  const endMonth = queryDates.to.slice(0, 7);

  const { data: report, isLoading } = useGetMonthlyReport(
    { startMonth, endMonth },
    { query: { queryKey: getGetMonthlyReportQueryKey({ startMonth, endMonth }) } }
  );

  const handleGenerate = () => setQueryDates({ from, to });

  const downloadUrl = `/api/export/monthly-report.csv?startMonth=${startMonth}&endMonth=${endMonth}`;

  return (
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
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <BarChart3 className="h-4 w-4"/>}
              Generate Report
            </Button>
            {report && (
              <Button variant="outline" className="gap-2" disabled={loadingCsv}
                onClick={()=>downloadCsv(downloadUrl,`monthly_report_${startMonth}_${endMonth}.csv`,setLoadingCsv)}>
                {loadingCsv ? <Loader2 className="h-4 w-4 animate-spin"/> : <Download className="h-4 w-4"/>}
                {loadingCsv ? "Downloading…" : "Download CSV"}
              </Button>
            )}
          </CardContent>
        </Card>

        {report && report.months.length > 0 ? (
          <div className="space-y-8">
            {report.months.map((monthData) => (
              <Card key={monthData.month} className="overflow-hidden">
                <CardHeader className="bg-muted/30">
                  <CardTitle>{format(parseISO(`${monthData.month}-01`),"MMMM yyyy")}</CardTitle>
                </CardHeader>
                <div className="space-y-5 p-4">
                  {monthData.commodities.map((commodity) => (
                    <Card key={`${monthData.month}-${commodity.itemId}`} className="overflow-hidden border">
                      <CardHeader className="py-3 bg-muted/20">
                        <CardTitle className="text-base">{commodity.itemDescription}</CardTitle>
                        <CardDescription>Unit: {commodity.unit}</CardDescription>
                      </CardHeader>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead className="text-right">Units</TableHead>
                              <TableHead className="text-right">Unit Price</TableHead>
                              <TableHead className="text-right">Total Cost (Opening)</TableHead>
                              <TableHead className="text-right">Additions</TableHead>
                              <TableHead className="text-right">Cost of Additions</TableHead>
                              <TableHead className="text-right">Items Issued</TableHead>
                              <TableHead className="text-right">Balance</TableHead>
                              <TableHead>Charge Item</TableHead>
                              <TableHead>Remarks</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {commodity.rows.map((row, idx) => (
                              <TableRow key={idx} className={row.rowType==="opening"?"bg-muted/10 font-medium":""}>
                                <TableCell>{format(new Date(row.date),"d MMM yyyy")}</TableCell>
                                <TableCell className="text-right font-mono">{row.units}</TableCell>
                                <TableCell className="text-right font-mono">{row.unitPrice||"-"}</TableCell>
                                <TableCell className="text-right font-mono">{row.openingTotalCost||"-"}</TableCell>
                                <TableCell className="text-right font-mono">{row.additionsUnits||"-"}</TableCell>
                                <TableCell className="text-right font-mono">{row.additionsUnitCost||"-"}</TableCell>
                                <TableCell className="text-right font-mono">{row.itemsIssued||"-"}</TableCell>
                                <TableCell className="text-right font-mono font-semibold">{row.balance}</TableCell>
                                {/* Charge item is always 2211002 for monthly report */}
                                <TableCell className="font-mono text-xs font-semibold text-primary">{CHARGE_ITEM}</TableCell>
                                <TableCell>{row.remarks||"-"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </Card>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        ) : isLoading ? (
          <div className="space-y-4">{[1,2,3,4,5].map(i=><Skeleton key={i} className="h-12 w-full"/>)}</div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
            <BarChart3 className="h-12 w-12 mb-4 opacity-20"/>
            <p>Select a date range and click "Generate Report"</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
