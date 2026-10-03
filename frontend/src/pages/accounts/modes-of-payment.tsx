import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Layout } from "@/components/layout";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, Plus, Trash2 } from "lucide-react";
import {
  useListModesOfPayment, getListModesOfPaymentQueryKey, useUpdateModeOfPayment, useDeleteModeOfPayment,
  useListChartOfAccounts, getListChartOfAccountsQueryKey,
} from "@/lib/api";

const selCls = "w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground";

export default function ModesOfPaymentPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { data: modes } = useListModesOfPayment();
  const { data: accounts } = useListChartOfAccounts({ query: { queryKey: getListChartOfAccountsQueryKey() } });
  const reload = () => qc.invalidateQueries({ queryKey: getListModesOfPaymentQueryKey() });
  const err = (e: any) => toast.error(e?.error || "Action failed");
  const update = useUpdateModeOfPayment({ mutation: { onSuccess: reload, onError: err } });
  const del = useDeleteModeOfPayment({ mutation: { onSuccess: () => { toast.success("Mode removed"); reload(); }, onError: err } });

  if (!user?.permissions?.viewAccounts) { setLocation("/"); return null; }
  const canManage = !!user.permissions.manageAccounts;
  const canDelete = !!user.permissions.deleteTransactions;
  const assetAccounts = (accounts ?? []).filter(a => a.type === "Asset");
  const accName = (code: string) => { const a = (accounts ?? []).find(x => x.code === code); return a ? `${a.code} — ${a.name}` : code; };

  return (
    <Layout>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CreditCard className="h-6 w-6" />Modes of Payment</h1>
          <p className="text-sm text-muted-foreground">How suppliers are paid. Each mode posts to a default Bank / Cash account in the Chart of Accounts.</p>
        </div>
        {canManage && <Button className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setLocation("/accounts/modes-of-payment/new")}><Plus className="h-4 w-4" />New Mode</Button>}
      </div>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Mode</TableHead><TableHead>Type</TableHead><TableHead>Default Account</TableHead><TableHead>Enabled</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {(modes ?? []).map(m => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.name}{m.isDefault && <span className="ml-2 text-[10px] uppercase text-muted-foreground">default</span>}</TableCell>
                <TableCell>{m.type}</TableCell>
                <TableCell>
                  {canManage ? (
                    <select className={selCls} value={m.accountCode} onChange={e => update.mutate({ id: m.id, data: { accountCode: e.target.value } })}>
                      {assetAccounts.map(a => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
                    </select>
                  ) : accName(m.accountCode)}
                </TableCell>
                <TableCell><Switch checked={m.enabled} disabled={!canManage} onCheckedChange={v => update.mutate({ id: m.id, data: { enabled: v } })} /></TableCell>
                <TableCell className="text-right">
                  {canDelete && !m.isDefault && <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { if (confirm(`Delete "${m.name}"?`)) del.mutate({ id: m.id }); }}><Trash2 className="h-4 w-4" /></Button>}
                </TableCell>
              </TableRow>
            ))}
            {(modes ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No modes of payment yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
      <p className="mt-3 text-xs text-muted-foreground">Disabled modes are hidden from the Payment Entry form. Add a dedicated Bank or M-Pesa account in the Chart of Accounts (type Asset) to track each one separately.</p>

    </Layout>
  );
}
