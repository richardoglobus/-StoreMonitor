import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { format, eachDayOfInterval, parseISO, startOfMonth, endOfMonth, getDay } from "date-fns";
import { Layout } from "@/components/layout";
import { DateRangePicker, firstOfMonth, todayStr } from "@/components/date-range-picker";
import {
  useGetDepartment, getGetDepartmentQueryKey,
  useListInventory, getListInventoryQueryKey,
  useListItems, getListItemsQueryKey,
  useListIssues, getListIssuesQueryKey,
  useCreateIssue, useCreateReceipt, useUpsertInventory,
  useListDepartments, getListDepartmentsQueryKey,
  ReceiptSource,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Download, Plus, ArrowUpRight, ArrowDownRight, Edit2, FileSpreadsheet, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Get all Tuesdays and Fridays in a date range
function getTueFriDates(from: string, to: string) {
  const days = eachDayOfInterval({ start: parseISO(from), end: parseISO(to) });
  return days.filter(d => getDay(d) === 2 || getDay(d) === 5);
}

async function downloadFile(url: string, filename: string, setLoading: (v: boolean) => void) {
  setLoading(true);
  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) { toast.error("Export failed. Check you are logged in."); return; }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch { toast.error("Download error."); }
  finally { setLoading(false); }
}

export default function DepartmentDetail() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  if (!user?.permissions?.manageInventory) { setLocation("/"); return null; }

  const [, params] = useRoute("/departments/:id");
  const departmentId = Number(params?.id ?? "0");
  const queryClient = useQueryClient();

  // Date range for the issue grid
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayStr());
  const month = from.slice(0, 7);

  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [physicalCountDialogOpen, setPhysicalCountDialogOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [issueData, setIssueData] = useState({ quantity: "", note: "", issuedAt: format(new Date(), "yyyy-MM-dd") });
  const [receiptData, setReceiptData] = useState({ quantity: "", source: ReceiptSource.KEMSA, receivedAt: format(new Date(), "yyyy-MM-dd") });
  const [physicalCountData, setPhysicalCountData] = useState({ count: "" });
  const [loadingXlsx, setLoadingXlsx] = useState(false);
  const [loadingAllXlsx, setLoadingAllXlsx] = useState(false);

  const { data: department, isLoading: isLoadingDept } = useGetDepartment(departmentId, {
    query: { enabled: !!departmentId, queryKey: getGetDepartmentQueryKey(departmentId) }
  });
  const { data: inventory, isLoading: isLoadingInv } = useListInventory(
    { departmentId, month },
    { query: { enabled: !!departmentId, queryKey: getListInventoryQueryKey({ departmentId, month }) } }
  );
  const { data: items } = useListItems({ query: { queryKey: getListItemsQueryKey() } });

  // Issues for the grid
  const issueParams = { month, departmentId };
  const { data: issues } = useListIssues(issueParams, {
    query: { queryKey: getListIssuesQueryKey(issueParams) }
  });

  const createIssue = useCreateIssue({
    mutation: {
      onSuccess: () => {
        toast.success("Issue recorded");
        queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey({ departmentId, month }) });
        queryClient.invalidateQueries({ queryKey: getListIssuesQueryKey(issueParams) });
        setIssueDialogOpen(false);
        setIssueData({ quantity: "", note: "", issuedAt: format(new Date(), "yyyy-MM-dd") });
        setSelectedItemId("");
      },
      onError: () => toast.error("Failed to record issue")
    }
  });

  const createReceipt = useCreateReceipt({
    mutation: {
      onSuccess: () => {
        toast.success("Receipt recorded");
        queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey({ departmentId, month }) });
        setReceiptDialogOpen(false);
        setReceiptData({ quantity: "", source: ReceiptSource.KEMSA, receivedAt: format(new Date(), "yyyy-MM-dd") });
        setSelectedItemId("");
      },
      onError: () => toast.error("Failed to record receipt")
    }
  });

  const upsertInventory = useUpsertInventory({
    mutation: {
      onSuccess: () => {
        toast.success("Physical count updated");
        queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey({ departmentId, month }) });
        setPhysicalCountDialogOpen(false);
        setPhysicalCountData({ count: "" });
        setSelectedItemId("");
      },
      onError: () => toast.error("Failed to update physical count")
    }
  });

  // Tue/Fri dates for the grid
  const tueFriDates = getTueFriDates(from, to);

  // Build issue lookup: itemId -> dateStr -> qty
  const issueLookup = new Map<number, Map<string, number>>();
  for (const iss of issues ?? []) {
    if (!issueLookup.has(iss.itemId)) issueLookup.set(iss.itemId, new Map());
    const dm = issueLookup.get(iss.itemId)!;
    dm.set(iss.issuedAt, (dm.get(iss.issuedAt) || 0) + iss.quantity);
  }

  // Items that had at least one issue in the period
  const issuedItemIds = new Set((issues ?? []).map(i => i.itemId));
  const gridItems = (items ?? []).filter(i => issuedItemIds.has(i.id));

  const startMonth = from.slice(0, 7);
  const endMonth = to.slice(0, 7);
  const xlsxUrl = `/api/export/all-departments.xlsx?startMonth=${startMonth}&endMonth=${endMonth}`;
  const csvUrl = `/api/export/inventory.csv?departmentId=${departmentId}&month=${month}`;

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              {isLoadingDept ? <Skeleton className="h-8 w-48 mb-1" /> : (
                <h1 className="text-3xl font-bold tracking-tight">{department?.name}</h1>
              )}
              <p className="text-muted-foreground">Department Inventory</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadFile(csvUrl, `inventory_${departmentId}_${month}.csv`, setLoadingXlsx)} disabled={loadingXlsx}>
              {loadingXlsx ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
              CSV
            </Button>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1" onClick={() => downloadFile(xlsxUrl, `all_departments_${startMonth}_${endMonth}.xlsx`, setLoadingAllXlsx)} disabled={loadingAllXlsx}>
              {loadingAllXlsx ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              All Depts Excel
            </Button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                <ArrowUpRight className="h-4 w-4" />Record Issue
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record Item Issue</DialogTitle></DialogHeader>
              <form onSubmit={e => { e.preventDefault(); if (!selectedItemId || !issueData.quantity) return; createIssue.mutate({ data: { departmentId, itemId: Number(selectedItemId), quantity: Number(issueData.quantity), issuedAt: issueData.issuedAt, note: issueData.note || undefined } }); }}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2"><Label>Item</Label>
                    <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                      <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                      <SelectContent>{items?.map(i => <SelectItem key={i.id} value={i.id.toString()}>{i.description}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Quantity</Label><Input type="number" min="1" value={issueData.quantity} onChange={e => setIssueData({...issueData,quantity:e.target.value})} required /></div>
                    <div className="space-y-2"><Label>Date</Label><Input type="date" value={issueData.issuedAt} onChange={e => setIssueData({...issueData,issuedAt:e.target.value})} required /></div>
                  </div>
                  <div className="space-y-2"><Label>Note (Optional)</Label><Input value={issueData.note} onChange={e => setIssueData({...issueData,note:e.target.value})} /></div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIssueDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={!selectedItemId || !issueData.quantity || createIssue.isPending}>{createIssue.isPending ? "Recording..." : "Record Issue"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2"><ArrowDownRight className="h-4 w-4" />Record Receipt</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record Item Receipt</DialogTitle></DialogHeader>
              <form onSubmit={e => { e.preventDefault(); if (!selectedItemId || !receiptData.quantity) return; createReceipt.mutate({ data: { departmentId, itemId: Number(selectedItemId), quantity: Number(receiptData.quantity), source: receiptData.source as any, receivedAt: receiptData.receivedAt } }); }}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2"><Label>Item</Label>
                    <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                      <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                      <SelectContent>{items?.map(i => <SelectItem key={i.id} value={i.id.toString()}>{i.description}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Source</Label>
                    <Select value={receiptData.source} onValueChange={(v:any) => setReceiptData({...receiptData,source:v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value={ReceiptSource.KEMSA}>KEMSA</SelectItem><SelectItem value={ReceiptSource.MEDS}>MEDS</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Quantity</Label><Input type="number" min="1" value={receiptData.quantity} onChange={e => setReceiptData({...receiptData,quantity:e.target.value})} required /></div>
                    <div className="space-y-2"><Label>Date</Label><Input type="date" value={receiptData.receivedAt} onChange={e => setReceiptData({...receiptData,receivedAt:e.target.value})} required /></div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setReceiptDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={!selectedItemId || !receiptData.quantity || createReceipt.isPending}>{createReceipt.isPending ? "Recording..." : "Record Receipt"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={physicalCountDialogOpen} onOpenChange={setPhysicalCountDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="gap-2"><Edit2 className="h-4 w-4" />Update Opening Balance</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Physical Count (Opening Balance)</DialogTitle>
                <DialogDescription>Sets the starting balance for {format(new Date(`${month}-01`), "MMMM yyyy")}</DialogDescription>
              </DialogHeader>
              <form onSubmit={e => { e.preventDefault(); if (!selectedItemId || physicalCountData.count === "") return; upsertInventory.mutate({ data: { departmentId, itemId: Number(selectedItemId), month, physicalCount: Number(physicalCountData.count) } }); }}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2"><Label>Item</Label>
                    <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                      <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                      <SelectContent>{items?.map(i => <SelectItem key={i.id} value={i.id.toString()}>{i.description}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Physical Count</Label><Input type="number" min="0" value={physicalCountData.count} onChange={e => setPhysicalCountData({count:e.target.value})} required /></div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setPhysicalCountDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={!selectedItemId || physicalCountData.count === "" || upsertInventory.isPending}>{upsertInventory.isPending ? "Updating..." : "Update Balance"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="grid">
          <TabsList>
            <TabsTrigger value="grid">Issue Grid (Tue/Fri)</TabsTrigger>
            <TabsTrigger value="inventory">Inventory Summary</TabsTrigger>
          </TabsList>

          {/* TAB 1: Tue/Fri Issue Grid */}
          <TabsContent value="grid">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Issues by Date — Tuesdays & Fridays</CardTitle>
                <CardDescription>Shows all items issued on each Tuesday and Friday in the selected range.</CardDescription>
                <div className="pt-2">
                  <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
                </div>
              </CardHeader>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="sticky left-0 bg-muted/50 z-10 min-w-[180px]">Item</TableHead>
                      <TableHead className="text-center w-16">Unit</TableHead>
                      {tueFriDates.map(d => (
                        <TableHead key={d.toISOString()} className="text-center min-w-[80px]">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`text-[10px] font-bold px-1 rounded ${getDay(d) === 2 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"}`}>
                              {getDay(d) === 2 ? "TUE" : "FRI"}
                            </span>
                            <span className="text-xs">{format(d, "d MMM")}</span>
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="text-right font-bold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gridItems.length > 0 ? gridItems.map((item, ii) => {
                      const dm = issueLookup.get(item.id);
                      const total = dm ? Array.from(dm.values()).reduce((a,b) => a+b, 0) : 0;
                      return (
                        <TableRow key={item.id} className={ii % 2 === 0 ? "" : "bg-muted/20"}>
                          <TableCell className="sticky left-0 bg-background z-10 font-medium text-sm">{item.description}</TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">{item.unit}</TableCell>
                          {tueFriDates.map(d => {
                            const dateStr = format(d, "yyyy-MM-dd");
                            const qty = dm?.get(dateStr);
                            return (
                              <TableCell key={d.toISOString()} className="text-center font-mono text-sm">
                                {qty ? (
                                  <span className={`font-bold ${getDay(d) === 2 ? "text-blue-600 dark:text-blue-400" : "text-purple-600 dark:text-purple-400"}`}>
                                    {qty}
                                  </span>
                                ) : <span className="text-muted-foreground/30">—</span>}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-right font-mono font-bold">{total}</TableCell>
                        </TableRow>
                      );
                    }) : (
                      <TableRow>
                        <TableCell colSpan={tueFriDates.length + 3} className="h-32 text-center text-muted-foreground">
                          No issues on Tuesdays/Fridays in this date range
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 2: Inventory Summary */}
          <TabsContent value="inventory">
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Opening</TableHead>
                      <TableHead className="text-right text-primary">KEMSA</TableHead>
                      <TableHead className="text-right text-primary">MEDS</TableHead>
                      <TableHead className="text-right text-destructive">Issued</TableHead>
                      <TableHead className="text-right font-bold">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingInv ? Array(5).fill(0).map((_,i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      </TableRow>
                    )) : inventory && inventory.length > 0 ? inventory.map(row => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{row.item.description}</div>
                          <div className="text-xs text-muted-foreground">{row.item.unit}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{row.physicalCount}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-primary/80">{row.receivedKemsa || "-"}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-primary/80">{row.receivedMeds || "-"}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-destructive/80">{row.totalUsed || "-"}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={row.balance <= 0 ? "destructive" : "outline"} className="font-mono text-sm">{row.balance}</Badge>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No inventory records for this month</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
