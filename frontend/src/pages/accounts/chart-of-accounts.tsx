import { useState } from "react";
import { Layout } from "@/components/layout";
import {
  useListChartOfAccounts, getListChartOfAccountsQueryKey,
  useCreateChartAccount, useDeleteChartAccount,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, BookMarked } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { AccountRefreshButton } from "@/components/account-refresh-button";

const emptyForm = { code: "", name: "", type: "Asset" };

export default function ChartOfAccountsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  if (!user?.permissions?.viewAccounts) { setLocation("/"); return null; }
  const canManage = !!user?.permissions?.manageAccounts;
  const canDelete = !!user?.permissions?.deleteTransactions;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const { data: accounts, isLoading } = useListChartOfAccounts({ query: { queryKey: getListChartOfAccountsQueryKey() } });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListChartOfAccountsQueryKey() });

  const createAccount = useCreateChartAccount({ mutation: { onSuccess: () => { toast.success("Account added"); invalidate(); setIsDialogOpen(false); setForm(emptyForm); }, onError: (e: any) => toast.error(e?.error || "Failed to add account"), onSettled: () => setSubmitting(false) } });
  const deleteAccount = useDeleteChartAccount({ mutation: { onSuccess: () => { toast.success("Account deleted"); invalidate(); }, onError: (e: any) => toast.error(e?.error || "Failed to delete account") } });

  const handleSubmit = () => {
    if (!form.code.trim() || !form.name.trim()) { toast.error("Code and name are required"); return; }
    setSubmitting(true);
    createAccount.mutate({ data: form });
  };

  const typeColor: Record<string, string> = {
    Asset: "bg-blue-100 text-blue-800 border-blue-200",
    Liability: "bg-red-100 text-red-800 border-red-200",
    Equity: "bg-purple-100 text-purple-800 border-purple-200",
    Income: "bg-green-100 text-green-800 border-green-200",
    Expense: "bg-amber-100 text-amber-800 border-amber-200",
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookMarked className="h-6 w-6"/>Chart of Accounts</h1>
          <p className="text-sm text-muted-foreground">The ledger accounts used for double-entry postings from GRNs and payments.</p>
        </div>
        <div className="flex items-center gap-2"><AccountRefreshButton />{canManage && (
          <Dialog open={isDialogOpen} onOpenChange={(v) => { setIsDialogOpen(v); if (!v) setForm(emptyForm); }}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4"/>Add Account</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Account</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1"><Label>Code</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. 6000"/></div>
                <div className="space-y-1"><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Freight Expense"/></div>
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asset">Asset</SelectItem>
                      <SelectItem value="Liability">Liability</SelectItem>
                      <SelectItem value="Equity">Equity</SelectItem>
                      <SelectItem value="Income">Income</SelectItem>
                      <SelectItem value="Expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Saving..." : "Save"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}</div>
      </div>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Account Name</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Balance (KES)</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-6 w-full"/></TableCell></TableRow>)}
            {(accounts ?? []).map(a => (
              <TableRow key={a.id}>
                <TableCell className="font-mono text-sm">{a.code}</TableCell>
                <TableCell className="font-medium">{a.name}{a.isDefault && <Badge variant="outline" className="ml-2 text-[10px]">Default</Badge>}</TableCell>
                <TableCell><Badge className={typeColor[a.type] ?? ""}>{a.type}</Badge></TableCell>
                <TableCell className="text-right">{a.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-right">
                  {canDelete && !a.isDefault && <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { if (confirm(`Delete account ${a.name}?`)) deleteAccount.mutate({ accountId: a.id }); }}><Trash2 className="h-4 w-4"/></Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Layout>
  );
}
