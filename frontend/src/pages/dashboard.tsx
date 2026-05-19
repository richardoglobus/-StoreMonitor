import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Layout } from "@/components/layout";
import { DateRangePicker, dateToMonth, todayStr, firstOfMonth } from "@/components/date-range-picker";
import {
  useGetDashboardSummary, useGetRecentIssues, useGetLowStock,
  useGetDepartmentUsage, useGetTopUsedItems, useListActivity,
  getGetDashboardSummaryQueryKey, getGetRecentIssuesQueryKey,
  getGetLowStockQueryKey, getGetDepartmentUsageQueryKey,
  getGetTopUsedItemsQueryKey, getListActivityQueryKey,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ArrowUpRight, ArrowDownRight, Calendar, Activity, Clock, ChevronDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Cell } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";

const CHART_COLORS = [
  "#6366f1","#ec4899","#f59e0b","#10b981","#3b82f6",
  "#ef4444","#8b5cf6","#14b8a6","#f97316","#06b6d4",
  "#84cc16","#e11d48","#7c3aed","#0ea5e9","#d97706",
  "#22c55e","#a855f7","#fb923c","#2dd4bf","#f43f5e",
];

function abbrevDept(name: string): string {
  const map: Record<string,string> = {
    "MALE WARD":"MALE","FEMALE WARD":"FEMALE","OPD CASUALTY":"OPD",
    "MATERNITY":"MATNY","PHYSIOTHERAPY":"PHYSIO","RADIOLOGY":"RADIO",
    "AMBULANCE":"AMBUL","MAINTAINANCE":"MAINT","LAUNDRY":"LAUNDR",
  };
  return map[name] ?? (name.length > 8 ? name.slice(0,7)+"…" : name);
}

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(()=>setNow(new Date()),1000); return ()=>clearInterval(t); },[]);
  return (
    <div className="flex items-center gap-4 bg-card border rounded-xl px-5 py-3 shadow-sm">
      <div className="flex flex-col items-center">
        <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3"/>Time</span>
        <span className="text-2xl font-mono font-bold tabular-nums">{format(now,"HH:mm:ss")}</span>
      </div>
      <div className="w-px h-10 bg-border"/>
      <div className="flex flex-col items-center">
        <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3"/>Date</span>
        <span className="text-base font-semibold">{format(now,"EEEE, d MMMM yyyy")}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  if (!user?.permissions?.viewDashboard) { setLocation("/"); return null; }
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayStr());
  const month = dateToMonth(from);

  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary(
    { month }, { query: { queryKey: getGetDashboardSummaryQueryKey({ month }), refetchInterval: 60_000 } }
  );
  const { data: recentIssues, isLoading: isLoadingRecent } = useGetRecentIssues(
    { limit: 5 }, { query: { queryKey: getGetRecentIssuesQueryKey({ limit: 5 }) } }
  );
  const { data: lowStockRaw, isLoading: isLoadingLowStock, error: lowStockError } = useGetLowStock(
    { threshold: 10 }, { query: { queryKey: getGetLowStockQueryKey("global"), refetchInterval: 30_000 } }
  );
  const { data: deptUsage, isLoading: isLoadingUsage } = useGetDepartmentUsage(
    { month }, { query: { queryKey: getGetDepartmentUsageQueryKey({ month }) } }
  );
  const { data: topItems, isLoading: isLoadingTopItems } = useGetTopUsedItems(
    { month, limit: 5 }, { query: { queryKey: getGetTopUsedItemsQueryKey({ month, limit: 5 }) } }
  );
  const canViewActivity = user?.role === "admin";
  const [activityLimit, setActivityLimit] = useState(20);
  const { data: activityLog, isLoading: isLoadingActivity } = useListActivity(
    { limit: activityLimit }, { query: { enabled: canViewActivity, queryKey: getListActivityQueryKey({ limit: activityLimit }) } }
  );

  // Deduplicate low stock — one entry per item, worst balance wins
  const lowStock = (() => {
    if (!lowStockRaw) return [];
    const map = new Map<number, typeof lowStockRaw[0]>();
    for (const row of lowStockRaw) {
      const ex = map.get(row.itemId);
      if (!ex || row.balance < ex.balance) map.set(row.itemId, row);
    }
    return Array.from(map.values()).sort((a,b)=>a.balance-b.balance);
  })();

  const chartData = (deptUsage??[]).filter(d=>d.totalIssued>0)
    .map(d=>({...d, shortName: abbrevDept(d.departmentName)}));

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Overview of hospital stores inventory.</p>
          </div>
          <LiveClock />
        </div>

        <Card>
          <CardContent className="pt-4 pb-4 flex flex-wrap items-end gap-4">
            <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Items Issued" value={summary?.totalIssuedThisMonth??0} icon={ArrowUpRight} loading={isLoadingSummary} description="Units issued this month"/>
          <StatCard title="Items Received" value={summary?.totalReceivedThisMonth??0} icon={ArrowDownRight} loading={isLoadingSummary} description="Units received this month"/>
          <StatCard title="Low Stock Items" value={isLoadingLowStock ? "…" : lowStock.length} icon={AlertTriangle} loading={false} description={`${lowStock.filter(i=>i.balance<=0).length} out of stock, ${lowStock.filter(i=>i.balance>0).length} low`} critical={lowStock.length>0}/>
          <StatCard title="Next Issue Day" value={summary?.nextIssueWeekday??"-"} icon={Calendar} loading={isLoadingSummary} description={summary?.nextIssueDate?format(new Date(summary.nextIssueDate),"EEE, MMM d yyyy"):"No scheduled issues"}/>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle>Department Usage</CardTitle>
              <CardDescription>Total units issued per department{chartData.length===0&&!isLoadingUsage?" — no issues recorded yet":""}</CardDescription>
            </CardHeader>
            <CardContent className="pl-0">
              {isLoadingUsage ? <Skeleton className="h-[340px] w-full ml-4"/> : chartData.length>0 ? (
                <div className="h-[340px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{top:10,right:20,left:0,bottom:90}}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))"/>
                      <XAxis dataKey="shortName" axisLine={false} tickLine={false}
                        tick={{fontSize:11,fill:"hsl(var(--muted-foreground))"}}
                        angle={-45} textAnchor="end" height={90} interval={0}/>
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize:12,fill:"hsl(var(--muted-foreground))"}}/>
                      <RechartsTooltip cursor={{fill:"hsl(var(--muted))"}}
                        formatter={(value:any,_:any,props:any)=>[`${value} units`,props.payload?.departmentName??"Units Issued"]}
                        contentStyle={{borderRadius:"8px",border:"1px solid hsl(var(--border))"}}/>
                      <Bar dataKey="totalIssued" radius={[4,4,0,0]} name="Units Issued">
                        {chartData.map((_entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[320px] flex items-center justify-center text-muted-foreground border border-dashed rounded-md mx-6">No issue data for this period</div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock — deduplicated, no department, scrollable full list */}
          <Card className="col-span-1 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5"/>Low Stock Alerts
              </CardTitle>
              <CardDescription className="text-xs">
                {lowStock.length} item{lowStock.length!==1?"s":""} below threshold — each shown once
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto max-h-[380px]">
              {isLoadingLowStock ? (
                <div className="space-y-3">{[1,2,3].map(i=><Skeleton key={i} className="h-10 w-full"/>)}</div>
              ) : lowStock.length>0 ? (
                <div className="space-y-1">
                  {lowStock.map((item)=>{
                    const isOut = item.balance<=0;
                    return (
                      <div key={item.itemId} className="flex justify-between items-center py-2 border-b last:border-0">
                        <p className="font-medium text-sm flex-1 pr-2 truncate" title={item.itemDescription}>{item.itemDescription}</p>
                        {isOut ? (
                          <Badge variant="destructive" className="text-xs shrink-0">OUT OF STOCK</Badge>
                        ) : (
                          <Badge variant="outline" className="font-mono text-amber-600 border-amber-400 bg-amber-50 shrink-0 text-xs">⚠ {item.balance} {item.unit}</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <Activity className="h-8 w-8 text-muted"/><p>All stock levels look good</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Recent Issues</CardTitle></CardHeader>
            <CardContent>
              {isLoadingRecent ? <div className="space-y-4">{[1,2,3].map(i=><Skeleton key={i} className="h-10 w-full"/>)}</div>
              : recentIssues&&recentIssues.length>0 ? (
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Dept</TableHead><TableHead>Item</TableHead><TableHead className="text-right">Qty</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {recentIssues.map(issue=>(
                      <TableRow key={issue.id}>
                        <TableCell className="text-xs">{format(new Date(issue.issuedAt),"MMM d")}</TableCell>
                        <TableCell className="text-sm">{issue.department?.name}</TableCell>
                        <TableCell className="text-sm truncate max-w-[140px]" title={issue.item?.description}>{issue.item?.description}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{issue.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : <div className="py-8 text-center text-muted-foreground border border-dashed rounded-md">No recent issues</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Top Used Items</CardTitle><CardDescription>Highest volume items this month</CardDescription></CardHeader>
            <CardContent>
              {isLoadingTopItems ? <div className="space-y-4">{[1,2,3].map(i=><Skeleton key={i} className="h-10 w-full"/>)}</div>
              : topItems&&topItems.length>0 ? (
                <div className="space-y-4">
                  {topItems.map((item,i)=>(
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">#{i+1}</div>
                        <p className="text-sm font-medium">{item.itemDescription}</p>
                      </div>
                      <div className="font-mono font-medium text-sm">{item.totalIssued} <span className="text-xs text-muted-foreground">{item.unit}</span></div>
                    </div>
                  ))}
                </div>
              ) : <div className="py-8 text-center text-muted-foreground border border-dashed rounded-md">No data available</div>}
            </CardContent>
          </Card>
        </div>

        {canViewActivity && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary"/>Activity Log
                </CardTitle>
                <CardDescription>Tracks who changed what in the system.</CardDescription>
              </div>
              {activityLog && activityLog.length > 0 && (
                <Badge variant="secondary" className="font-mono">{activityLog.length} entries</Badge>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingActivity
                ? <div className="space-y-2 p-4">{[1,2,3,4].map(i=><Skeleton key={i} className="h-8 w-full"/>)}</div>
                : activityLog && activityLog.length > 0 ? (
                  <>
                    <div className="overflow-y-auto" style={{ maxHeight: "400px" }}>
                      <Table>
                        <TableHeader className="sticky top-0 bg-card z-10">
                          <TableRow>
                            <TableHead className="w-32">Time</TableHead>
                            <TableHead className="w-28">User</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead className="w-36">Entity</TableHead>
                            <TableHead>Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activityLog.map(entry => {
                            const actionColor = entry.action.startsWith("DELETE") ? "text-destructive"
                              : entry.action.startsWith("CREATE") ? "text-green-600 dark:text-green-400"
                              : entry.action.startsWith("UPDATE") || entry.action.startsWith("EDIT") ? "text-blue-600 dark:text-blue-400"
                              : entry.action === "LOGIN" ? "text-primary"
                              : "text-muted-foreground";
                            const detailStr = entry.details
                              ? Object.entries(entry.details).map(([k,v])=>`${k}: ${v}`).join(", ")
                              : "";
                            return (
                              <TableRow key={entry.id} className="hover:bg-muted/40">
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                  {format(new Date(entry.createdAt),"d MMM, HH:mm")}
                                </TableCell>
                                <TableCell className="text-sm font-medium">{entry.username || `#${entry.userId}`}</TableCell>
                                <TableCell>
                                  <span className={`font-mono text-xs font-semibold ${actionColor}`}>{entry.action}</span>
                                </TableCell>
                                <TableCell className="text-xs">
                                  {entry.entityType}{entry.entityId ? ` #${entry.entityId}` : ""}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground max-w-xs truncate" title={detailStr}>
                                  {detailStr}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/20">
                      <span className="text-xs text-muted-foreground">
                        Showing {activityLog.length} most recent entries
                      </span>
                      <Button
                        size="sm" variant="outline" className="h-7 text-xs gap-1"
                        onClick={() => setActivityLimit(l => l + 50)}
                      >
                        <ChevronDown className="h-3 w-3"/>Load 50 more
                      </Button>
                    </div>
                  </>
                ) : <div className="px-4 pb-4 text-sm text-muted-foreground">No activity yet.</div>}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

function StatCard({title,value,icon:Icon,loading,description,critical}:any){
  return (
    <Card className={critical?"border-destructive shadow-sm":""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${critical?"text-destructive":"text-muted-foreground"}`}/>
      </CardHeader>
      <CardContent>
        {loading?<Skeleton className="h-8 w-20 mb-1"/>:<div className={`text-2xl font-bold ${critical?"text-destructive":""}`}>{value}</div>}
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}
