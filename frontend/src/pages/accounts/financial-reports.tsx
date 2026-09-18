import { useState } from "react";
import { Layout } from "@/components/layout";
import { DateRangePicker, firstOfMonth, todayStr } from "@/components/date-range-picker";
import { useGetFinancialSummary, useListJournalEntries } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, TrendingUp, Wallet, ReceiptText, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { AccountRefreshButton } from "@/components/account-refresh-button";

export default function FinancialReportsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  if (!user?.permissions?.viewAccounts) { setLocation("/"); return null; }

  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayStr());

  const params = { from, to };
  const { data: summary, isLoading } = useGetFinancialSummary(params);
  const { data: journal, isLoading: journalLoading } = useListJournalEntries(params);

  const cards = [
    { label: "Goods Received (Period)", value: summary?.totalGoodsReceivedValue, icon: ReceiptText, color: "text-blue-600" },
    { label: "Paid to Suppliers (Period)", value: summary?.totalPaidThisPeriod, icon: Wallet, color: "text-green-600" },
    { label: "Total Accounts Payable", value: summary?.totalAccountsPayable, icon: TrendingUp, color: "text-red-600" },
    { label: "Inventory Value", value: summary?.inventoryValue, icon: BarChart3, color: "text-purple-600" },
  ];

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6"/>Financial Reports</h1>
          <p className="text-sm text-muted-foreground">Summary of goods received, payments, payables and inventory value.</p>
        </div>
        <div className="flex items-center gap-2"><DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo}/><AccountRefreshButton /></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{c.label}</span>
                <c.icon className={`h-4 w-4 ${c.color}`}/>
              </div>
              {isLoading ? <Skeleton className="h-7 w-24"/> : <p className="text-xl font-bold">KES {(c.value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {!isLoading && summary && (summary.pendingGrnCount > 0) && (
        <div className="flex items-center gap-2 text-sm bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 rounded-lg px-4 py-2.5 mb-6">
          <Clock className="h-4 w-4 shrink-0"/> {summary.pendingGrnCount} GRN{summary.pendingGrnCount !== 1 ? "s" : ""} awaiting approval — not yet reflected in stock or payables.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Top Suppliers by Balance Owed</CardTitle><CardDescription>Suppliers with the highest outstanding accounts payable</CardDescription></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Supplier</TableHead><TableHead className="text-right">Balance (KES)</TableHead></TableRow></TableHeader>
              <TableBody>
                {(summary?.topSuppliersByBalance ?? []).filter(s => s.balance > 0).length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">No outstanding balances.</TableCell></TableRow>}
                {(summary?.topSuppliersByBalance ?? []).filter(s => s.balance > 0).map(s => (
                  <TableRow key={s.id}><TableCell>{s.name}</TableCell><TableCell className="text-right">{s.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Chart of Accounts Balances</CardTitle><CardDescription>Current balance per account</CardDescription></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Account</TableHead><TableHead className="text-right">Balance (KES)</TableHead></TableRow></TableHeader>
              <TableBody>
                {(summary?.accounts ?? []).map(a => (
                  <TableRow key={a.id}><TableCell>{a.code}</TableCell><TableCell>{a.name} <Badge variant="outline" className="ml-1 text-[10px]">{a.type}</Badge></TableCell><TableCell className="text-right">{a.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 overflow-x-auto">
        <CardHeader><CardTitle className="text-base">Recent Journal Entries</CardTitle><CardDescription>Double-entry postings from GRNs and payments in this period</CardDescription></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Reference</TableHead><TableHead>Description</TableHead><TableHead>Debit</TableHead><TableHead>Credit</TableHead><TableHead className="text-right">Amount (KES)</TableHead></TableRow></TableHeader>
            <TableBody>
              {journalLoading && <TableRow><TableCell colSpan={6}><Skeleton className="h-6 w-full"/></TableCell></TableRow>}
              {!journalLoading && (journal ?? []).length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No transactions in this period.</TableCell></TableRow>}
              {(journal ?? []).map(j => (
                <TableRow key={j.id}>
                  <TableCell>{j.date}</TableCell><TableCell>{j.reference}</TableCell><TableCell>{j.description}</TableCell>
                  <TableCell>{j.debitAccount}</TableCell><TableCell>{j.creditAccount}</TableCell>
                  <TableCell className="text-right">{j.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Layout>
  );
}
