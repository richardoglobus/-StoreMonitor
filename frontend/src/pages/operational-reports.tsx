import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";

const reports = [
  ["expiry", "Expiry Report"],
  ["stock-movement", "Stock Movement Report"],
  ["supplier-performance", "Supplier Performance"],
  ["purchase-orders-outstanding", "Purchase-Order Outstanding"],
] as const;

export default function OperationalReportsPage() {
  const { user } = useAuth(); const [, setLocation] = useLocation();
  const [kind, setKind] = useState<(typeof reports)[number][0]>("expiry");
  const [rows, setRows] = useState<any[]>([]); const [loading, setLoading] = useState(false);
  useEffect(() => { if (!user?.permissions?.viewReports) { setLocation("/"); return; } setLoading(true); fetch(`${API_BASE}/api/reports/${kind}`, { credentials: "include" }).then(r => r.json()).then(setRows).catch(() => setRows([])).finally(() => setLoading(false)); }, [kind, user, setLocation]);
  const columns = rows.length ? Object.keys(rows[0]).filter(k => k !== "itemId" && k !== "supplierId" && k !== "id") : [];
  return <Layout><div className="flex flex-col gap-6"><div><h1 className="text-3xl font-bold tracking-tight">Operational Reports</h1><p className="text-muted-foreground">Expiry, movement, supplier, and purchase-order monitoring.</p></div><div className="flex flex-wrap gap-2">{reports.map(([key, label]) => <Button key={key} variant={kind === key ? "default" : "outline"} onClick={() => setKind(key)}>{label}</Button>)}</div><Card><CardHeader><CardTitle>{reports.find(r => r[0] === kind)?.[1]}</CardTitle></CardHeader><CardContent>{loading ? <p>Loading report…</p> : rows.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b">{columns.map(c => <th key={c} className="text-left p-2 capitalize">{c.replace(/[A-Z]/g, m => ` ${m}`)}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={row.id || i} className="border-b">{columns.map(c => <td key={c} className="p-2">{typeof row[c] === "boolean" ? (row[c] ? "Yes" : "No") : row[c] ?? "—"}</td>)}</tr>)}</tbody></table></div> : <p className="text-muted-foreground">No records found for this report.</p>}</CardContent></Card></div></Layout>;
}
