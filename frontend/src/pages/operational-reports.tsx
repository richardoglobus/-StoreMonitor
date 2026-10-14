import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, RefreshCw } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";

const reports = [["expiry", "Expiry Report"], ["stock-movement", "Stock Movement Report"], ["supplier-performance", "Supplier Performance"], ["purchase-orders-outstanding", "Purchase-Order Outstanding"]] as const;
const PAGE_SIZE = 50;

export default function OperationalReportsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [kind, setKind] = useState<(typeof reports)[number][0]>("expiry");
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState<"csv" | "xlsx" | null>(null);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const paginated = kind !== "purchase-orders-outstanding";

  const load = async (append = false) => {
    if (!user?.permissions?.viewReports) { setLocation("/"); return; }
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(append ? rows.length : 0) });
      if (search.trim()) params.set("search", search.trim());
      if (from && (kind === "expiry" || kind === "stock-movement")) params.set("from", from);
      if (to && (kind === "expiry" || kind === "stock-movement")) params.set("to", to);
      const response = await fetch(`${API_BASE}/api/reports/${kind}?${params}`, { credentials: "include" });
      if (!response.ok) throw new Error("Report request failed");
      const data = await response.json();
      const nextRows = Array.isArray(data) ? data : (data.rows || []);
      setRows(prev => append ? [...prev, ...nextRows] : nextRows);
      setTotal(Array.isArray(data) ? nextRows.length : Number(data.total || nextRows.length));
      setHasMore(Boolean(data.hasMore));
    } catch {
      if (!append) { setRows([]); setTotal(0); setHasMore(false); }
    } finally { setLoading(false); setLoadingMore(false); }
  };

  useEffect(() => {
    if (!user?.permissions?.viewReports) { setLocation("/"); return; }
    setRows([]); setTotal(0); setHasMore(false);
    const timer = window.setTimeout(() => load(false), 250);
    return () => window.clearTimeout(timer);
  }, [kind, search, from, to, user]);

  const downloadReport = async (format: "csv" | "xlsx") => {
    setDownloadLoading(format);
    try {
      const params = new URLSearchParams({ kind });
      if (search.trim()) params.set("search", search.trim());
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const response = await fetch(`${API_BASE}/api/export/operational-report.${format}?${params}`, { credentials: "include" });
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = `operational_${kind}.${format}.zip`;
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(href);
    } catch { window.alert("Download failed. Check that you have export permission and try again."); }
    finally { setDownloadLoading(null); }
  };

  const columns = rows.length ? Object.keys(rows[0]).filter(k => !["itemId", "supplierId", "id"].includes(k)) : [];
  const title = reports.find(r => r[0] === kind)?.[1];

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div><h1 className="text-3xl font-bold tracking-tight">Operational Reports</h1><p className="text-muted-foreground">Expiry, movement, supplier, and purchase-order monitoring.</p></div>
        <div className="flex flex-wrap gap-2">{reports.map(([key, label]) => <Button key={key} variant={kind === key ? "default" : "outline"} onClick={() => setKind(key)}>{label}</Button>)}</div>
        <Card>
          <CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>{title}</CardTitle><div className="flex gap-2"><Button variant="ghost" size="icon" onClick={() => load(false)} disabled={loading || !!downloadLoading} title="Refresh"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button><Button variant="outline" onClick={() => downloadReport("csv")} disabled={!!downloadLoading}><Download className="h-4 w-4 mr-1" />{downloadLoading === "csv" ? "Preparing…" : "CSV"}</Button><Button variant="outline" onClick={() => downloadReport("xlsx")} disabled={!!downloadLoading}><Download className="h-4 w-4 mr-1" />{downloadLoading === "xlsx" ? "Preparing…" : "Excel"}</Button></div></div></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1"><Label>Search {kind === "supplier-performance" ? "supplier" : "item"}</Label><Input value={search} onChange={e => setSearch(e.target.value)} placeholder={kind === "supplier-performance" ? "Search supplier…" : "Search item…"} /></div>
              {(kind === "expiry" || kind === "stock-movement") && <><div className="space-y-1"><Label>From date</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div><div className="space-y-1"><Label>To date</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div></>}
            </div>
            {loading ? <p>Loading report…</p> : rows.length ? <>
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b">{columns.map(c => <th key={c} className="text-left p-2 capitalize whitespace-nowrap">{c.replace(/[A-Z]/g, m => ` ${m}`)}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={row.id || row.supplierId || i} className="border-b">{columns.map(c => <td key={c} className="p-2 whitespace-nowrap">{typeof row[c] === "boolean" ? (row[c] ? "Yes" : "No") : row[c] ?? "—"}</td>)}</tr>)}</tbody></table></div>
              <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Showing {rows.length} of {total}</span>{paginated && hasMore && <Button variant="outline" onClick={() => load(true)} disabled={loadingMore}>{loadingMore ? "Loading…" : "Load More"}</Button>}</div>
            </> : <p className="text-muted-foreground">No records found for this report.</p>}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
