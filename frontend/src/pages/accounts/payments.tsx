import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Layout } from "@/components/layout";
import { useAuth } from "@/lib/auth-context";
import { AccountRefreshButton } from "@/components/account-refresh-button";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet, Plus, Trash2, Send } from "lucide-react";
import {
  useListPayments, getListPaymentsQueryKey, useDeletePayment, useSubmitPayment,
  getListSuppliersQueryKey, getListSupplierInvoicesQueryKey, getListChartOfAccountsQueryKey,
} from "@/lib/api";

const dateCls = "h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground [color-scheme:light] dark:[color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-ring";
const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2 });

export default function PaymentsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [q, setQ] = useState(""); const [status, setStatus] = useState("all");
  const [applied, setApplied] = useState({ from: "", to: "", q: "", status: "all" });

  const { data: payments, isLoading } = useListPayments({}, { query: { queryKey: getListPaymentsQueryKey({}) } });
  const refresh = () => [getListPaymentsQueryKey({}), getListSuppliersQueryKey(), getListSupplierInvoicesQueryKey(), getListChartOfAccountsQueryKey()].forEach(k => qc.invalidateQueries({ queryKey: k as any }));
  const del = useDeletePayment({ mutation: { onSuccess: () => { toast.success("Payment removed"); refresh(); }, onError: (e: any) => toast.error(e?.error || "Failed to delete payment") } });
  const submit = useSubmitPayment({ mutation: { onSuccess: () => { toast.success("Payment submitted"); refresh(); }, onError: (e: any) => toast.error(e?.error || "Could not submit payment") } });

  const rows = useMemo(() => (payments ?? []).filter(p => {
    const st = p.status ?? "submitted";
    if (applied.from && p.date < applied.from) return false;
    if (applied.to && p.date > applied.to) return false;
    if (applied.status !== "all" && st !== applied.status) return false;
    if (applied.q && !(p.supplier?.name ?? "").toLowerCase().includes(applied.q.toLowerCase())) return false;
    return true;
  }), [payments, applied]);

  if (!user?.permissions?.viewAccounts) { setLocation("/"); return null; }
  const canManage = !!user.permissions.manageAccounts;
  const canDelete = !!user.permissions.deleteTransactions;

  return (
    <Layout>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wallet className="h-6 w-6" />Payment Entries</h1>
          <p className="text-sm text-muted-foreground">Payments made to (or refunds received from) suppliers.</p>
        </div>
        <div className="flex items-center gap-2"><AccountRefreshButton />
          {canManage && <Button className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setLocation("/accounts/payments/new")}><Plus className="h-4 w-4" />New Payment</Button>}
        </div>
      </div>

      <Card className="mb-3 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div><div className="mb-1 text-xs text-muted-foreground">From Date</div><input type="date" className={dateCls} value={from} onChange={e => setFrom(e.target.value)} /></div>
          <div><div className="mb-1 text-xs text-muted-foreground">To Date</div><input type="date" className={dateCls} value={to} onChange={e => setTo(e.target.value)} /></div>
          <div className="min-w-[180px] flex-1"><div className="mb-1 text-xs text-muted-foreground">Supplier</div><Input placeholder="Search supplier..." value={q} onChange={e => setQ(e.target.value)} /></div>
          <div><div className="mb-1 text-xs text-muted-foreground">Status</div>
            <select className={dateCls} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="all">All Statuses</option><option value="submitted">Submitted</option><option value="draft">Draft</option>
            </select></div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setApplied({ from, to, q, status })}>Apply</Button>
          <Button variant="outline" onClick={() => { setFrom(""); setTo(""); setQ(""); setStatus("all"); setApplied({ from: "", to: "", q: "", status: "all" }); }}>Reset</Button>
        </div>
      </Card>
      <div className="mb-3 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-green-500" />Submitted</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-gray-400" />Draft</span>
      </div>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Supplier</TableHead>
            <TableHead className="text-right">Amount (KES)</TableHead><TableHead>Mode of Payment</TableHead><TableHead>Reference</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-6 w-full" /></TableCell></TableRow>)}
            {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={8} className="py-12 text-center text-muted-foreground">No payment entries found<div className="text-xs">Try adjusting your date range, supplier, or status filter.</div></TableCell></TableRow>}
            {rows.map(p => {
              const st = p.status ?? "submitted";
              return (
                <TableRow key={p.id}>
                  <TableCell>{p.date}</TableCell>
                  <TableCell>{p.paymentType === "receive" ? "Receive" : "Pay"}</TableCell>
                  <TableCell className="font-medium">{p.supplier?.name ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono">{money(p.amount)}</TableCell>
                  <TableCell>{p.modeOfPayment ?? p.method}</TableCell>
                  <TableCell>{p.reference ?? "—"}</TableCell>
                  <TableCell><span className="flex items-center gap-1.5 text-sm"><i className={`h-2 w-2 rounded-full ${st === "draft" ? "bg-gray-400" : "bg-green-500"}`} />{st === "draft" ? "Draft" : "Submitted"}</span></TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {canManage && st === "draft" && <Button size="sm" variant="outline" className="mr-1 h-8 gap-1" onClick={() => submit.mutate({ paymentId: p.id })}><Send className="h-3.5 w-3.5" />Submit</Button>}
                    {canDelete && <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { if (confirm(st === "draft" ? "Delete this draft?" : "Delete this payment entry? This reverses the supplier balance, invoice payment and the ledger posting.")) del.mutate({ paymentId: p.id }); }}><Trash2 className="h-4 w-4" /></Button>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </Layout>
  );
}
