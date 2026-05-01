import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { format } from "date-fns";
import { Layout } from "@/components/layout";
import { MonthPicker, getCurrentMonth } from "@/components/month-picker";
import {
  useGetDepartment,
  getGetDepartmentQueryKey,
  useListInventory,
  getListInventoryQueryKey,
  useListItems,
  getListItemsQueryKey,
  useCreateIssue,
  useCreateReceipt,
  useUpsertInventory,
  ReceiptSource,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Download, Plus, ArrowUpRight, ArrowDownRight, Edit2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";

export default function DepartmentDetail() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  if (!user?.permissions?.manageInventory) {
    setLocation("/");
    return null;
  }
  const [, params] = useRoute("/departments/:id");
  const departmentId = Number(params?.id ?? "0");
  const [month, setMonth] = useState(getCurrentMonth());

  const queryClient = useQueryClient();

  const { data: department, isLoading: isLoadingDept } = useGetDepartment(departmentId, {
    query: { enabled: !!departmentId, queryKey: getGetDepartmentQueryKey(departmentId) }
  });

  const { data: inventory, isLoading: isLoadingInv } = useListInventory(
    { departmentId, month },
    { query: { enabled: !!departmentId, queryKey: getListInventoryQueryKey({ departmentId, month }) } }
  );

  const { data: items } = useListItems({ query: { queryKey: getListItemsQueryKey() } });

  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [physicalCountDialogOpen, setPhysicalCountDialogOpen] = useState(false);
  
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  
  // Forms
  const [issueData, setIssueData] = useState({ quantity: "", note: "", issuedAt: format(new Date(), "yyyy-MM-dd") });
  const [receiptData, setReceiptData] = useState({ quantity: "", source: ReceiptSource.KEMSA, receivedAt: format(new Date(), "yyyy-MM-dd") });
  const [physicalCountData, setPhysicalCountData] = useState({ count: "" });

  const createIssue = useCreateIssue({
    mutation: {
      onSuccess: () => {
        toast.success("Issue recorded successfully");
        queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey({ departmentId, month }) });
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
        toast.success("Receipt recorded successfully");
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

  const handleRecordIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || !issueData.quantity || !issueData.issuedAt) return;
    createIssue.mutate({
      data: {
        departmentId,
        itemId: Number(selectedItemId),
        quantity: Number(issueData.quantity),
        issuedAt: issueData.issuedAt,
        note: issueData.note || undefined
      }
    });
  };

  const handleRecordReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || !receiptData.quantity || !receiptData.receivedAt) return;
    createReceipt.mutate({
      data: {
        departmentId,
        itemId: Number(selectedItemId),
        quantity: Number(receiptData.quantity),
        source: receiptData.source as any,
        receivedAt: receiptData.receivedAt
      }
    });
  };

  const handleUpdatePhysicalCount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || physicalCountData.count === "") return;
    upsertInventory.mutate({
      data: {
        departmentId,
        itemId: Number(selectedItemId),
        month,
        physicalCount: Number(physicalCountData.count)
      }
    });
  };

  const downloadUrl = `/api/export/inventory.csv?departmentId=${departmentId}&month=${month}`;

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              {isLoadingDept ? (
                <Skeleton className="h-8 w-48 mb-1" />
              ) : (
                <h1 className="text-3xl font-bold tracking-tight">{department?.name}</h1>
              )}
              <p className="text-muted-foreground">Department Inventory</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <MonthPicker month={month} onChange={setMonth} />
            <Button variant="outline" asChild>
              <a href={downloadUrl} download target="_blank" rel="noreferrer">
                <Download className="h-4 w-4 mr-2" />
                CSV
              </a>
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                <ArrowUpRight className="h-4 w-4" />
                Record Issue
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Item Issue</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleRecordIssue}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Item</Label>
                    <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {items?.map(item => (
                          <SelectItem key={item.id} value={item.id.toString()}>{item.description}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input type="number" min="1" value={issueData.quantity} onChange={e => setIssueData({...issueData, quantity: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input type="date" value={issueData.issuedAt} onChange={e => setIssueData({...issueData, issuedAt: e.target.value})} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Note (Optional)</Label>
                    <Input value={issueData.note} onChange={e => setIssueData({...issueData, note: e.target.value})} placeholder="e.g. Emergency request" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIssueDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={!selectedItemId || !issueData.quantity || createIssue.isPending}>
                    {createIssue.isPending ? "Recording..." : "Record Issue"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <ArrowDownRight className="h-4 w-4" />
                Record Receipt
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Item Receipt</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleRecordReceipt}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Item</Label>
                    <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {items?.map(item => (
                          <SelectItem key={item.id} value={item.id.toString()}>{item.description}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Select value={receiptData.source} onValueChange={(val: any) => setReceiptData({...receiptData, source: val})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ReceiptSource.KEMSA}>KEMSA</SelectItem>
                        <SelectItem value={ReceiptSource.MEDS}>MEDS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input type="number" min="1" value={receiptData.quantity} onChange={e => setReceiptData({...receiptData, quantity: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input type="date" value={receiptData.receivedAt} onChange={e => setReceiptData({...receiptData, receivedAt: e.target.value})} required />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setReceiptDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={!selectedItemId || !receiptData.quantity || createReceipt.isPending}>
                    {createReceipt.isPending ? "Recording..." : "Record Receipt"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={physicalCountDialogOpen} onOpenChange={setPhysicalCountDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="gap-2">
                <Edit2 className="h-4 w-4" />
                Update Opening Balance
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Physical Count (Opening Balance)</DialogTitle>
                <DialogDescription>Sets the starting balance for {format(new Date(`${month}-01`), "MMMM yyyy")}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdatePhysicalCount}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Item</Label>
                    <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {items?.map(item => (
                          <SelectItem key={item.id} value={item.id.toString()}>{item.description}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Physical Count</Label>
                    <Input type="number" min="0" value={physicalCountData.count} onChange={e => setPhysicalCountData({count: e.target.value})} required />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setPhysicalCountDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={!selectedItemId || physicalCountData.count === "" || upsertInventory.isPending}>
                    {upsertInventory.isPending ? "Updating..." : "Update Balance"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

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
                {isLoadingInv ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : inventory && inventory.length > 0 ? (
                  inventory.map((row) => (
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
                        <Badge variant={row.balance <= 0 ? "destructive" : "outline"} className="font-mono text-sm">
                          {row.balance}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No inventory records for this month
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
