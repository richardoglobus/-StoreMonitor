import { useState } from "react";
import { format } from "date-fns";
import { Layout } from "@/components/layout";
import { useListJournalEntries, useCreateJournalEntry, useListChartOfAccounts, getListChartOfAccountsQueryKey } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { AccountRefreshButton } from "@/components/account-refresh-button";
const empty = { date: format(new Date(), "yyyy-MM-dd"), reference: "", description: "", debitAccount: "", creditAccount: "", amount: "", note: "" };
export default function JournalEntriesPage() {
  const { user } = useAuth(); const [, setLocation] = useLocation(); const qc = useQueryClient();
  if (!user?.permissions?.viewAccounts) { setLocation("/"); return null; }
  const [open, setOpen] = useState(false); const [form, setForm] = useState(empty);
  const { data: entries } = useListJournalEntries(); const { data: accounts } = useListChartOfAccounts({ query: { queryKey: getListChartOfAccountsQueryKey() } });
  const create = useCreateJournalEntry({ mutation: { onSuccess: () => { toast.success("Journal entry posted"); qc.invalidateQueries({ queryKey: ["/api/accounts/journal-entries"] }); setOpen(false); setForm(empty); }, onError: (e: any) => toast.error(e?.error || "Could not post journal entry") } });
  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));
  return <Layout><div className="flex items-center justify-between mb-6"><div><h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6"/>Journal Entries</h1><p className="text-sm text-muted-foreground">Standalone double-entry transactions. These do not affect stock or Purchases.</p></div><div className="flex items-center gap-2"><AccountRefreshButton />{user.permissions.manageAccounts && <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4"/>New Journal Entry</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Post Standalone Journal Entry</DialogTitle></DialogHeader><div className="grid grid-cols-2 gap-3 py-2"><div><Label>Date</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)}/></div><div><Label>Reference</Label><Input value={form.reference} onChange={e => set("reference", e.target.value)} placeholder="JE-001"/></div><div className="col-span-2"><Label>Description</Label><Input value={form.description} onChange={e => set("description", e.target.value)} placeholder="Office rent, correction, accrual..."/></div><div><Label>Debit account</Label><select className="h-10 w-full rounded-md border bg-background px-2" value={form.debitAccount} onChange={e => set("debitAccount", e.target.value)}><option value="">Select account</option>{(accounts || []).map(a => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}</select></div><div><Label>Credit account</Label><select className="h-10 w-full rounded-md border bg-background px-2" value={form.creditAccount} onChange={e => set("creditAccount", e.target.value)}><option value="">Select account</option>{(accounts || []).map(a => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}</select></div><div><Label>Amount (KES)</Label><Input type="number" value={form.amount} onChange={e => set("amount", e.target.value)}/></div><div><Label>Note</Label><Input value={form.note} onChange={e => set("note", e.target.value)}/></div></div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => create.mutate({ data: { ...form, amount: Number(form.amount) } })}>Post Entry</Button></DialogFooter></DialogContent></Dialog>}</div></div><Card className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Reference</TableHead><TableHead>Description</TableHead><TableHead>Debit</TableHead><TableHead>Credit</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader><TableBody>{(entries || []).map(e => <TableRow key={e.id}><TableCell>{e.date}</TableCell><TableCell>{e.reference}</TableCell><TableCell>{e.description}</TableCell><TableCell>{e.debitAccount}</TableCell><TableCell>{e.creditAccount}</TableCell><TableCell className="text-right">{Number(e.amount).toLocaleString(undefined,{minimumFractionDigits:2})}</TableCell></TableRow>)}</TableBody></Table></Card></Layout>;
}
