import { useState } from "react";
import { format } from "date-fns";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TrendingUp, Download, FileSpreadsheet, Search, Loader2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";

async function dl(url: string, filename: string, setLoading: (v: boolean) => void) {
  setLoading(true);
  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) { toast.error("Export failed"); return; }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch { toast.error("Download error"); }
  finally { setLoading(false); }
}

function StatusBadge({ status }: { status: string }) {
  if (status === "OUT") return (
    <Badge variant="destructive" className="gap-1 text-xs">
      <XCircle className="h-3 w-3" />OUT OF STOCK
    </Badge>
  );
  if (status === "LOW") return (
    <Badge className="gap-1 text-xs bg-amber-500 hover:bg-amber-600">
      <AlertTriangle className="h-3 w-3" />LOW STOCK
    </Badge>
  );
  return (
    <Badge variant="outline" className="gap-1 text-xs text-green-600 border-green-400">
      <CheckCircle2 className="h-3 w-3" />OK
    </Badge>
  );
}

export default function StockValuationPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  if (!user?.permissions?.viewReports) { setLocation("/"); return null; }

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "OK" | "LOW" | "OUT">("ALL");
  const [loadingXlsx, setLoadingXlsx] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["stock-valuation"],
    queryFn: async () => {
      const res = await fetch("/api/reports/stock-valuation", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    staleTime: 60_000,
  });

  const rows = (data?.rows || []).filter((r: any) => {
    const matchSearch = !search || r.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "ALL" || r.stockStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  const fmt = (v: number) => new Intl.NumberFormat("en-KE", { style: "currency", currency: data?.currency || "KES" }).format(v);
  const filteredTotal = rows.reduce((s: number, r: any) => s + r.totalValue, 0);
  const today = format(new Date(), "d MMM yyyy");

  const STATUS_COUNTS = {
    ALL: data?.rows?.length || 0,
    OK: data?.rows?.filter((r: any) => r.stockStatus === "OK").length || 0,
    LOW: data?.rows?.filter((r: any) => r.stockStatus === "LOW").length || 0,
    OUT: data?.rows?.filter((r: any) => r.stockStatus === "OUT").length || 0,
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <TrendingUp className="h-7 w-7 text-primary" />Stock Valuation
            </h1>
            <p className="text-muted-foreground">Total monetary value of current inventory as at {today}.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>Refresh</Button>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1" disabled={loadingXlsx}
              onClick={() => dl("/api/export/stock-valuation.xlsx", `stock_valuation_${today}.xlsx`, setLoadingXlsx)}>
              {loadingXlsx ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              Download Excel
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Total Stock Value</p>
              <p className="text-xl font-bold text-primary">{isLoading ? "…" : fmt(data?.grandTotal || 0)}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">OK Items</p>
              <p className="text-xl font-bold text-green-600">{isLoading ? "…" : STATUS_COUNTS.OK}</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Low Stock</p>
              <p className="text-xl font-bold text-amber-600">{isLoading ? "…" : STATUS_COUNTS.LOW}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 dark:bg-red-950/20 border-red-200">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Out of Stock</p>
              <p className="text-xl font-bold text-destructive">{isLoading ? "…" : STATUS_COUNTS.OUT}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 border rounded-md px-3 h-9 bg-background">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input placeholder="Search item…" value={search} onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-sm outline-none w-48" />
          </div>
          {(["ALL","OK","LOW","OUT"] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${filterStatus === s ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {s} ({STATUS_COUNTS[s]})
            </button>
          ))}
          {(search || filterStatus !== "ALL") && (
            <p className="text-xs text-muted-foreground">
              Showing {rows.length} items — filtered total: <strong>{fmt(filteredTotal)}</strong>
            </p>
          )}
        </div>

        {/* Table */}
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Item Description</TableHead>
                  <TableHead className="text-center w-16">Unit</TableHead>
                  <TableHead className="text-right w-24">In Stock</TableHead>
                  <TableHead className="text-right w-28">Unit Price</TableHead>
                  <TableHead className="text-right w-28 font-bold">Total Value</TableHead>
                  <TableHead className="w-24">Last Purchase</TableHead>
                  <TableHead className="w-28">Supplier</TableHead>
                  <TableHead className="w-28 text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array(8).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    {Array(9).fill(0).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                  </TableRow>
                )) : rows.length > 0 ? rows.map((row: any, i: number) => (
                  <TableRow key={row.itemId} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium text-sm">{row.description}</TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">{row.unit}</TableCell>
                    <TableCell className={`text-right font-mono text-sm font-semibold ${row.currentStock <= 0 ? "text-destructive" : row.stockStatus === "LOW" ? "text-amber-600" : ""}`}>
                      {row.currentStock <= 0 ? "0" : row.currentStock}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {row.unitPrice > 0 ? fmt(row.unitPrice) : "—"}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-sm font-bold ${row.totalValue > 0 ? "text-primary" : "text-muted-foreground"}`}>
                      {row.totalValue > 0 ? fmt(row.totalValue) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {row.lastPurchaseDate && row.lastPurchaseDate !== "-" ? format(new Date(row.lastPurchaseDate), "d MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.lastSupplier !== "-" ? row.lastSupplier : "—"}</TableCell>
                    <TableCell className="text-center"><StatusBadge status={row.stockStatus} /></TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">No items found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {rows.length > 0 && (
            <div className="flex justify-end px-4 py-3 border-t bg-muted/20">
              <div className="text-sm">
                Grand Total: <span className="font-bold text-lg text-primary">{fmt(data?.grandTotal || 0)}</span>
              </div>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
