import { useState } from "react";
import { format } from "date-fns";
import { Layout } from "@/components/layout";
import { MonthPicker, getCurrentMonth } from "@/components/month-picker";
import {
  useListIssues,
  getListIssuesQueryKey,
  useListDepartments,
  getListDepartmentsQueryKey,
  useListItems,
  useListItemStock,
  getListItemsQueryKey,
  getListItemStockQueryKey,
  useCreateIssueVoucher,
  useDeleteIssue,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Plus, Trash2, ArrowUpRight, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";

export default function Issues() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  if (!user?.permissions?.issueItems) {
    setLocation("/");
    return null;
  }
  const [month, setMonth] = useState(getCurrentMonth());
  const canDeleteTransactions = !!user?.permissions?.deleteTransactions;
  const [departmentIdFilter, setDepartmentIdFilter] = useState<string>("all");
  const [issueItemSearch, setIssueItemSearch] = useState("");
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [voucherData, setVoucherData] = useState({ 
    departmentId: "", 
    issuedAt: format(new Date(), "yyyy-MM-dd"),
    folioNo: "",
    s11No: "",
    note: ""
  });

  const [voucherItems, setVoucherItems] = useState([{ itemId: "", quantity: "", note: "" }]);

  const { data: departments } = useListDepartments({ query: { queryKey: getListDepartmentsQueryKey() } });
  const { data: items } = useListItems({ query: { queryKey: getListItemsQueryKey() } });
  const { data: itemStock } = useListItemStock({ query: { queryKey: getListItemStockQueryKey() } });

  const queryParams = { 
    month, 
    ...(departmentIdFilter !== "all" ? { departmentId: Number(departmentIdFilter) } : {}) 
  };

  const { data: issues, isLoading } = useListIssues(
    queryParams,
    { query: { queryKey: getListIssuesQueryKey(queryParams) } }
  );

  const createVoucher = useCreateIssueVoucher({
    mutation: {
      onSuccess: () => {
        toast.success("Issue voucher recorded successfully");
        queryClient.invalidateQueries({ queryKey: getListIssuesQueryKey(queryParams) });
        setIsDialogOpen(false);
        setVoucherData({ 
          departmentId: "", 
          issuedAt: format(new Date(), "yyyy-MM-dd"),
          folioNo: "",
          s11No: "",
          note: ""
        });
        setVoucherItems([{ itemId: "", quantity: "", note: "" }]);
      },
      onError: () => toast.error("Failed to record issue voucher")
    }
  });

  const deleteIssue = useDeleteIssue({
    mutation: {
      onSuccess: () => {
        toast.success("Issue deleted");
        queryClient.invalidateQueries({ queryKey: getListIssuesQueryKey(queryParams) });
      },
      onError: () => toast.error("Failed to delete issue")
    }
  });

  const handleAddVoucherItem = () => {
    setVoucherItems([...voucherItems, { itemId: "", quantity: "", note: "" }]);
  };

  const handleRemoveVoucherItem = (index: number) => {
    setVoucherItems(voucherItems.filter((_, i) => i !== index));
  };

  const handleVoucherItemChange = (index: number, field: string, value: string) => {
    const newItems = [...voucherItems];
    (newItems[index] as any)[field] = value;
    setVoucherItems(newItems);
  };

  const handleRecordVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherData.departmentId || !voucherData.issuedAt || !voucherData.folioNo.trim() || !voucherData.s11No.trim() || voucherItems.some(i => !i.itemId || !i.quantity)) {
      toast.error("Please fill in all required fields");
      return;
    }
    for (const vItem of voucherItems) {
      const selectedStock = itemStock?.find(s => s.id === Number(vItem.itemId));
      if (!selectedStock || selectedStock.stockBalance <= 0) {
        toast.error("Cannot issue an item with zero stock");
        return;
      }
      if (Number(vItem.quantity) > selectedStock.stockBalance) {
        toast.error(`Issue quantity exceeds stock for ${selectedStock.description}`);
        return;
      }
    }

    createVoucher.mutate({
      data: {
        departmentId: Number(voucherData.departmentId),
        issuedAt: voucherData.issuedAt,
        folioNo: voucherData.folioNo.trim(),
        s11No: voucherData.s11No.trim(),
        note: voucherData.note || undefined,
        items: voucherItems.map(i => ({
          itemId: Number(i.itemId),
          quantity: Number(i.quantity),
          note: i.note || undefined
        }))
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this issue?")) {
      deleteIssue.mutate({ issueId: id });
    }
  };

  let downloadUrl = `/api/export/issues.csv?month=${month}`;
  if (departmentIdFilter !== "all") {
    downloadUrl += `&departmentId=${departmentIdFilter}`;
  }

  const getWeekdayColor = (weekday: string) => {
    switch (weekday) {
      case "TUE": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "FRI": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };
  const filteredIssueItems = itemStock?.filter(item => item.description.toLowerCase().includes(issueItemSearch.toLowerCase()));

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Issues Log</h1>
            <p className="text-muted-foreground">Track all items issued to departments.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <MonthPicker month={month} onChange={setMonth} />
            <Select value={departmentIdFilter} onValueChange={setDepartmentIdFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments?.map(d => (
                  <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Issue Voucher
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Issue Voucher</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleRecordVoucher} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select value={voucherData.departmentId} onValueChange={v => setVoucherData({...voucherData, departmentId: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments?.map(d => (
                          <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={voucherData.issuedAt} onChange={e => setVoucherData({...voucherData, issuedAt: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Folio No</Label>
                    <Input placeholder="Folio No" value={voucherData.folioNo} onChange={e => setVoucherData({...voucherData, folioNo: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>S11 No</Label>
                    <Input placeholder="S11 No" value={voucherData.s11No} onChange={e => setVoucherData({...voucherData, s11No: e.target.value})} required />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Items to Issue</Label>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddVoucherItem}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>
                  <Input placeholder="Type/search items to issue..." value={issueItemSearch} onChange={e => setIssueItemSearch(e.target.value)} />
                  
                  {voucherItems.map((vItem, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-end border p-3 rounded-md bg-muted/20">
                      <div className="col-span-12 md:col-span-5 space-y-1">
                        <Label className="text-xs">Item</Label>
                        <Select value={vItem.itemId} onValueChange={v => handleVoucherItemChange(index, "itemId", v)}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select item" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredIssueItems?.map(item => (
                              <SelectItem key={item.id} value={item.id.toString()} disabled={item.stockBalance <= 0}>
                                {item.description} ({item.stockBalance} in stock)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-6 md:col-span-2 space-y-1">
                        <Label className="text-xs">Quantity</Label>
                        <Input 
                          type="number" 
                          min="1" 
                          className="h-9"
                          value={vItem.quantity} 
                          onChange={e => handleVoucherItemChange(index, "quantity", e.target.value)} 
                          required 
                        />
                      </div>
                      <div className="col-span-6 md:col-span-4 space-y-1">
                        <Label className="text-xs">Note (Optional)</Label>
                        <Input 
                          placeholder="Note" 
                          className="h-9"
                          value={vItem.note} 
                          onChange={e => handleVoucherItemChange(index, "note", e.target.value)} 
                        />
                      </div>
                      <div className="col-span-12 md:col-span-1 text-right">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveVoucherItem(index)}
                          disabled={voucherItems.length === 1}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label>General Note (Optional)</Label>
                  <Input value={voucherData.note} onChange={e => setVoucherData({...voucherData, note: e.target.value})} placeholder="General note for the voucher" />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createVoucher.isPending || !voucherData.departmentId || !voucherData.folioNo.trim() || !voucherData.s11No.trim()}>
                    {createVoucher.isPending ? "Creating..." : "Create Issue Voucher"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Button variant="outline" asChild>
            <a href={downloadUrl} download target="_blank" rel="noreferrer">
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </a>
          </Button>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-32">Date</TableHead>
                  <TableHead className="w-24 text-center">Voucher</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-center">Folio/S11</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24 mx-auto" /></TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ))
                ) : issues && issues.length > 0 ? (
                  issues.map((issue) => (
                    <TableRow key={issue.id}>
                      <TableCell className="font-medium text-sm whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{format(new Date(issue.issuedAt), "MMM d, yyyy")}</span>
                          <span className={`w-fit px-1.5 py-0.5 rounded text-[10px] font-bold mt-1 ${getWeekdayColor(issue.weekday)}`}>
                            {issue.weekday}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {issue.voucherId ? (
                          <Badge variant="outline" className="font-mono text-[10px] px-1">
                            {issue.voucherId.substring(0, 8)}
                          </Badge>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-sm">{issue.department?.name}</TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{issue.item?.description}</div>
                        <div className="text-xs text-muted-foreground">{issue.item?.unit}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{issue.quantity}</TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        <div className="flex flex-col gap-0.5">
                          {issue.folioNo && <span title="Folio No">F: {issue.folioNo}</span>}
                          {issue.s11No && <span title="S11 No">S: {issue.s11No}</span>}
                          {!issue.folioNo && !issue.s11No && "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {canDeleteTransactions && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(issue.id)}
                            disabled={deleteIssue.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      No issues found for the selected criteria
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
