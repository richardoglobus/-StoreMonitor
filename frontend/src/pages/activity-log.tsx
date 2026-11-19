import { Layout } from "@/components/layout";
import { useListActivity, getListActivityQueryKey } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function ActivityLogPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const allowed = user?.role === "admin" || user?.permissions?.viewActivityLogs;
  const { data: entries, isLoading, isFetching, refetch } = useListActivity(
    { limit: 300 },
    { query: { enabled: !!allowed, queryKey: getListActivityQueryKey({ limit: 300 }) } },
  );

  if (!allowed) {
    setLocation("/");
    return null;
  }

  return (
    <Layout>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" />Activity Log</CardTitle>
            <CardDescription>Whole-system actions recorded with the affected area and client IP address.</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />Refresh
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? <div className="space-y-2 p-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-9 w-full" />)}</div> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>User</TableHead><TableHead>IP Address</TableHead><TableHead>Area</TableHead><TableHead>Action</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(entries || []).map(entry => {
                    const detail = entry.details ? Object.entries(entry.details).map(([key, value]) => `${key}: ${String(value)}`).join(", ") : "";
                    return <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap text-xs">{new Date(entry.createdAt).toLocaleString()}</TableCell>
                      <TableCell className="font-medium">{entry.username || "System"}</TableCell>
                      <TableCell className="font-mono text-xs">{entry.ipAddress || "—"}</TableCell>
                      <TableCell className="text-xs">{entry.entityType}{entry.entityId ? ` #${entry.entityId}` : ""}</TableCell>
                      <TableCell className="font-mono text-xs font-semibold">{entry.action}</TableCell>
                      <TableCell className="max-w-md truncate text-xs text-muted-foreground" title={detail}>{detail || "—"}</TableCell>
                    </TableRow>;
                  })}
                </TableBody>
              </Table>
              {!entries?.length && <p className="p-6 text-center text-sm text-muted-foreground">No activity recorded.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
