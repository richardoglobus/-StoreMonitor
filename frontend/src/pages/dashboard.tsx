import { useState } from "react";
import { format } from "date-fns";
import { Layout } from "@/components/layout";
import { MonthPicker, getCurrentMonth } from "@/components/month-picker";
import {
  useGetDashboardSummary,
  useGetRecentIssues,
  useGetLowStock,
  useGetDepartmentUsage,
  useGetTopUsedItems,
  useGetIssueSchedule,
  useListActivity,
  getGetDashboardSummaryQueryKey,
  getGetRecentIssuesQueryKey,
  getGetLowStockQueryKey,
  getGetDepartmentUsageQueryKey,
  getGetTopUsedItemsQueryKey,
  getGetIssueScheduleQueryKey,
  getListActivityQueryKey,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, AlertTriangle, ArrowUpRight, ArrowDownRight, Calendar, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  if (!user?.permissions?.viewDashboard) {
    setLocation("/");
    return null;
  }
  const [month, setMonth] = useState(getCurrentMonth());

  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary(
    { month },
    { query: { queryKey: getGetDashboardSummaryQueryKey({ month }) } }
  );

  const { data: recentIssues, isLoading: isLoadingRecent } = useGetRecentIssues(
    { limit: 5 },
    { query: { queryKey: getGetRecentIssuesQueryKey({ limit: 5 }) } }
  );

  const { data: lowStock, isLoading: isLoadingLowStock } = useGetLowStock(
    { month },
    { query: { queryKey: getGetLowStockQueryKey({ month }) } }
  );

  const { data: deptUsage, isLoading: isLoadingUsage } = useGetDepartmentUsage(
    { month },
    { query: { queryKey: getGetDepartmentUsageQueryKey({ month }) } }
  );

  const { data: topItems, isLoading: isLoadingTopItems } = useGetTopUsedItems(
    { month, limit: 5 },
    { query: { queryKey: getGetTopUsedItemsQueryKey({ month, limit: 5 }) } }
  );

  const { data: schedule, isLoading: isLoadingSchedule } = useGetIssueSchedule(
    { month },
    { query: { queryKey: getGetIssueScheduleQueryKey({ month }) } }
  );
  const canViewActivity = user?.role === "admin";
  const { data: activityLog, isLoading: isLoadingActivity } = useListActivity(
    { limit: 8 },
    { query: { enabled: canViewActivity, queryKey: getListActivityQueryKey({ limit: 8 }) } }
  );

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Overview of hospital stores inventory.</p>
          </div>
          <MonthPicker month={month} onChange={setMonth} />
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Items Issued"
            value={summary?.totalIssuedThisMonth ?? 0}
            icon={ArrowUpRight}
            loading={isLoadingSummary}
            description="Units issued this month"
          />
          <StatCard
            title="Items Received"
            value={summary?.totalReceivedThisMonth ?? 0}
            icon={ArrowDownRight}
            loading={isLoadingSummary}
            description="Units received this month"
          />
          <StatCard
            title="Low Stock Items"
            value={summary?.lowStockCount ?? 0}
            icon={AlertTriangle}
            loading={isLoadingSummary}
            description="Items below threshold"
            critical={summary?.lowStockCount ? summary.lowStockCount > 0 : false}
          />
          <StatCard
            title="Next Issue Day"
            value={summary?.nextIssueWeekday ?? "-"}
            icon={Calendar}
            loading={isLoadingSummary}
            description={summary?.nextIssueDate ? format(new Date(summary.nextIssueDate), "MMM d, yyyy") : "No scheduled issues"}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart - Department Usage */}
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle>Department Usage</CardTitle>
              <CardDescription>Total units issued per department in {format(new Date(`${month}-01`), "MMMM yyyy")}</CardDescription>
            </CardHeader>
            <CardContent className="pl-0">
              {isLoadingUsage ? (
                <Skeleton className="h-[300px] w-full ml-4" />
              ) : deptUsage && deptUsage.length > 0 ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptUsage} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="departmentName" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <RechartsTooltip 
                        cursor={{ fill: 'hsl(var(--muted))' }}
                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="totalIssued" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Units Issued" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground border border-dashed rounded-md mx-6">
                  No issue data for this month
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Alerts */}
          <Card className="col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Low Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingLowStock ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : lowStock && lowStock.length > 0 ? (
                <div className="space-y-4">
                  {lowStock.slice(0, 6).map((item, i) => (
                    <div key={i} className="flex justify-between items-center pb-3 border-b last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium text-sm">{item.itemDescription}</p>
                        <p className="text-xs text-muted-foreground">{item.departmentName}</p>
                      </div>
                      <Badge variant={item.balance <= 0 ? "destructive" : "secondary"} className="font-mono">
                        {item.balance} {item.unit}
                      </Badge>
                    </div>
                  ))}
                  {lowStock.length > 6 && (
                    <p className="text-xs text-center text-muted-foreground pt-2">+ {lowStock.length - 6} more items low on stock</p>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                  <Activity className="h-8 w-8 text-muted" />
                  <p>All stock levels look good</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Issues */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Issues</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingRecent ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : recentIssues && recentIssues.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Dept</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentIssues.map((issue) => (
                      <TableRow key={issue.id}>
                        <TableCell className="text-xs">{format(new Date(issue.issuedAt), "MMM d")}</TableCell>
                        <TableCell className="text-sm">{issue.department?.name}</TableCell>
                        <TableCell className="text-sm truncate max-w-[150px]" title={issue.item?.description}>{issue.item?.description}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{issue.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-muted-foreground border border-dashed rounded-md">
                  No recent issues
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Items */}
          <Card>
            <CardHeader>
              <CardTitle>Top Used Items</CardTitle>
              <CardDescription>Highest volume items this month</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTopItems ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : topItems && topItems.length > 0 ? (
                <div className="space-y-4">
                  {topItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          #{i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.itemDescription}</p>
                        </div>
                      </div>
                      <div className="font-mono font-medium text-sm">
                        {item.totalIssued} <span className="text-xs text-muted-foreground">{item.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground border border-dashed rounded-md">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        {canViewActivity && (
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>Tracks who changed what in the system.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingActivity ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : activityLog && activityLog.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityLog.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-xs">{format(new Date(entry.createdAt), "MMM d, HH:mm")}</TableCell>
                        <TableCell>{entry.username || `User #${entry.userId}`}</TableCell>
                        <TableCell className="font-mono text-xs">{entry.action}</TableCell>
                        <TableCell className="text-xs">{entry.entityType} {entry.entityId ? `#${entry.entityId}` : ""}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-sm text-muted-foreground">No activity yet.</div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

function StatCard({ title, value, icon: Icon, loading, description, critical }: any) {
  return (
    <Card className={critical ? "border-destructive shadow-sm" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${critical ? "text-destructive" : "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20 mb-1" />
        ) : (
          <div className={`text-2xl font-bold ${critical ? "text-destructive" : ""}`}>{value}</div>
        )}
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}
