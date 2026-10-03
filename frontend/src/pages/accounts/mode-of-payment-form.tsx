import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Layout } from "@/components/layout";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateModeOfPayment, getListModesOfPaymentQueryKey } from "@/lib/api";

const TYPES = ["Cash", "Bank", "Mobile Money", "Cheque", "Other"];
const selCls = "w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring";

export default function ModeOfPaymentFormPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const [name, setName] = useState(""); const [type, setType] = useState("Cash"); const [enabled, setEnabled] = useState(true);
  const create = useCreateModeOfPayment({
    mutation: {
      onSuccess: () => { toast.success("Mode of payment added"); qc.invalidateQueries({ queryKey: getListModesOfPaymentQueryKey() }); setLocation("/accounts/modes-of-payment"); },
      onError: (e: any) => toast.error(e?.error || "Could not save mode of payment"),
    },
  });

  if (!user?.permissions?.manageAccounts) { setLocation("/accounts/modes-of-payment"); return null; }
  const save = () => { if (!name.trim()) { toast.error("Name is required"); return; } create.mutate({ data: { name: name.trim(), type, enabled } }); };

  return (
    <Layout>
      <div className="max-w-md">
        <div className="mb-3 text-sm text-muted-foreground">
          <Link href="/accounts/modes-of-payment" className="hover:underline">Modes of Payment</Link> <span className="mx-1">/</span> <span className="text-foreground">New Mode of Payment</span>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h1 className="mb-5 text-xl font-bold">New Mode of Payment</h1>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm">Name <span className="text-red-500">*</span></label>
              <Input placeholder="e.g. Mobile Money" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && save()} />
              <p className="mt-1 text-xs text-muted-foreground">This becomes the document ID and cannot be changed later.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm">Type <span className="text-red-500">*</span></label>
              <select className={selCls} value={type} onChange={e => setType(e.target.value)}>{TYPES.map(t => <option key={t}>{t}</option>)}</select>
              <p className="mt-1 text-xs text-muted-foreground">Cash posts to the Cash account; all other types post to Bank. You can change the account later from the list.</p>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-blue-600" checked={enabled} onChange={e => setEnabled(e.target.checked)} />Enabled</label>
          </div>
          <div className="mt-6 flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setLocation("/accounts/modes-of-payment")}>Cancel</Button>
            <Button className="bg-blue-600 text-white hover:bg-blue-700" disabled={create.isPending} onClick={save}>{create.isPending ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
