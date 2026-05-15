import { useState } from "react";
import { format } from "date-fns";
import { Layout } from "@/components/layout";
import { DateRangePicker, firstOfMonth, todayStr } from "@/components/date-range-picker";
import {
  useListIssues, getListIssuesQueryKey,
  useListDepartments, getListDepartmentsQueryKey,
  useListItemStock, getListItemStockQueryKey,
  useCreateIssueVoucher, useDeleteIssue,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Plus, Trash2, X, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";

// Map weekday number to full day name
const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function getWeekdayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return DAY_NAMES[d.getUTCDay()];
}

function getWeekdayColor(label: string): string {
  switch (label) {
    case "Tuesday": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "Friday": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
    case "Monday": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "Wednesday": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    case "Thursday": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
    default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  }
}

// Per-row item selector with its own search
function VoucherItemRow({
  vItem, index, itemStock, onRemove, onChange, canRemove,
}: {
  vItem: { itemId: string; quantity: string; note: string; search: string; folioNo: string };
  index: number;
  itemStock: any[];
  onRemove: () => void;
  onChange: (field: string, value: string) => void;
  canRemove: boolean;
}) {
  const filtered = vItem.search
    ? itemStock.filter(i => i.description.toLowerCase().includes(vItem.search.toLowerCase()))
    : itemStock;

  const selectedItem = vItem.itemId ? itemStock.find(i => i.id === Number(vItem.itemId)) : null;

  return (
    <div className="border rounded-md p-3 bg-muted/20 space-y-3">
      {/* Search box - per row, independent */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search item by name…"
          className="pl-8 h-9"
          value={vItem.search}
          onChange={e => onChange("search", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-12 md:col-span-4 space-y-1">
          <Label className="text-xs">Item</Label>
          <Select
            value={vItem.itemId}
            onValueChange={v => { onChange("itemId", v); onChange("search", ""); }}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select item">
                {selectedItem ? `${selectedItem.description} (${selectedItem.stockBalance} in stock)` : "Select item"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">No items match</div>
              ) : filtered.map(item => (
                <SelectItem key={item.id} value={item.id.toString()} disabled={item.stockBalance <= 0}>
                  {item.description} ({item.stockBalance} {item.unit})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-6 md:col-span-2 space-y-1">
          <Label className="text-xs">Quantity</Label>
          <Input
            type="number" min="1" className="h-9"
            value={vItem.quantity}
            onChange={e => onChange("quantity", e.target.value)}
            required
          />
        </div>

        <div className="col-span-6 md:col-span-2 space-y-1">
          <Label className="text-xs">Folio No <span className="text-destructive">*</span></Label>
          <Input
            placeholder="Folio No" className="h-9"
            value={vItem.folioNo}
            onChange={e => onChange("folioNo", e.target.value)}
            required
          />
        </div>
        <div className="col-span-5 md:col-span-2 space-y-1">
          <Label className="text-xs">Note (Optional)</Label>
          <Input
            placeholder="Note" className="h-9"
            value={vItem.note}
            onChange={e => onChange("note", e.target.value)}
          />
        </div>

        <div className="col-span-1 flex justify-end">
          <Button
            type="button" variant="ghost" size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-destructive"
            onClick={onRemove} disabled={!canRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {selectedItem && (
        <p className="text-xs text-muted-foreground pl-1">
          Selected: <strong>{selectedItem.description}</strong> — {selectedItem.stockBalance} {selectedItem.unit} in stock
        </p>
      )}
    </div>
  );
}

const emptyRow = () => ({ itemId: "", quantity: "", note: "", search: "", folioNo: "" });

export default function Issues() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  if (!user?.permissions?.issueItems) { setLocation("/"); return null; }

  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayStr());
  const canDeleteTransactions = !!user?.permissions?.deleteTransactions;
  const [departmentIdFilter, setDepartmentIdFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [voucherData, setVoucherData] = useState({
    departmentId: "", issuedAt: format(new Date(), "yyyy-MM-dd"),
    s11No: "", note: ""
  });
  const [voucherItems, setVoucherItems] = useState([emptyRow()]);

  const { data: departments } = useListDepartments({ query: { queryKey: getListDepartmentsQueryKey() } });
  const { data: itemStock } = useListItemStock({ query: { queryKey: getListItemStockQueryKey() } });

  const month = from.slice(0, 7);
  const queryParams = { month, ...(departmentIdFilter !== "all" ? { departmentId: Number(departmentIdFilter) } : {}) };
  const { data: issues, isLoading } = useListIssues(queryParams, { query: { queryKey: getListIssuesQueryKey(queryParams) } });

  const createVoucher = useCreateIssueVoucher({
    mutation: {
      onSuccess: () => {
        toast.success("Issue voucher recorded successfully");
        queryClient.invalidateQueries({ queryKey: getListIssuesQueryKey(queryParams) });
        queryClient.invalidateQueries({ queryKey: getListItemStockQueryKey() });
        setIsDialogOpen(false);
        setVoucherData({ departmentId: "", issuedAt: format(new Date(), "yyyy-MM-dd"), s11No: "", note: "" });
        setVoucherItems([emptyRow()]);
      },
      onError: () => toast.error("Failed to record issue voucher"),
    }
  });

  const deleteIssue = useDeleteIssue({
    mutation: {
      onSuccess: () => { toast.success("Issue deleted"); queryClient.invalidateQueries({ queryKey: getListIssuesQueryKey(queryParams) }); },
      onError: () => toast.error("Failed to delete issue"),
    }
  });

  const handleVoucherItemChange = (index: number, field: string, value: string) => {
    const next = [...voucherItems];
    (next[index] as any)[field] = value;
    setVoucherItems(next);
  };

  const handleRecordVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherData.departmentId || !voucherData.s11No.trim() || voucherItems.some(i => !i.itemId || !i.quantity || !i.folioNo.trim())) {
      toast.error("Please fill in all required fields"); return;
    }
    for (const vItem of voucherItems) {
      const stock = itemStock?.find(s => s.id === Number(vItem.itemId));
      if (!stock || stock.stockBalance <= 0) { toast.error("Cannot issue an item with zero stock"); return; }
      if (Number(vItem.quantity) > stock.stockBalance) { toast.error(`Issue quantity exceeds stock for ${stock.description}`); return; }
    }
    createVoucher.mutate({
      data: {
        departmentId: Number(voucherData.departmentId),
        issuedAt: voucherData.issuedAt,
        s11No: voucherData.s11No.trim(),
        note: voucherData.note || undefined,
        items: voucherItems.map(i => ({ itemId: Number(i.itemId), quantity: Number(i.quantity), folioNo: i.folioNo.trim(), note: i.note || undefined }))
      }
    });
  };

  const downloadUrl = `/api/export/issues.csv?month=${month}${departmentIdFilter !== "all" ? `&departmentId=${departmentIdFilter}` : ""}`;

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Issues Log</h1>
            <p className="text-muted-foreground">Track all items issued to departments.</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
            <Select value={departmentIdFilter} onValueChange={setDepartmentIdFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments?.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />New Issue Voucher</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create Issue Voucher</DialogTitle></DialogHeader>
              <form onSubmit={handleRecordVoucher} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select value={voucherData.departmentId} onValueChange={v => setVoucherData({...voucherData, departmentId: v})}>
                      <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>
                        {departments?.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <input type="date" value={voucherData.issuedAt} onChange={e => setVoucherData({...voucherData, issuedAt: e.target.value})} required className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground [color-scheme:light] dark:[color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>

                  <div className="space-y-2">
                    <Label>S11 No</Label>
                    <Input placeholder="S11 No" value={voucherData.s11No} onChange={e => setVoucherData({...voucherData, s11No: e.target.value})} required />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-semibold">Items to Issue</Label>
                  {voucherItems.map((vItem, index) => (
                    <VoucherItemRow
                      key={index}
                      vItem={vItem}
                      index={index}
                      itemStock={itemStock ?? []}
                      onRemove={() => setVoucherItems(v => v.filter((_, i) => i !== index))}
                      onChange={(field, value) => handleVoucherItemChange(index, field, value)}
                      canRemove={voucherItems.length > 1}
                    />
                  ))}
                </div>

                  <Button type="button" variant="outline" size="sm" className="w-full border-dashed gap-2 mt-1" onClick={() => setVoucherItems(v => [...v, emptyRow()])}>
                    <Plus className="h-4 w-4" />Add Another Item
                  </Button>

                <div className="space-y-2">
                  <Label>General Note (Optional)</Label>
                  <Input value={voucherData.note} onChange={e => setVoucherData({...voucherData, note: e.target.value})} placeholder="General note for the voucher" />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createVoucher.isPending || !voucherData.departmentId || !voucherData.s11No.trim()}>
                    {createVoucher.isPending ? "Creating..." : "Create Issue Voucher"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={async () => {
            const res = await fetch(downloadUrl, { credentials: "include" });
            if (!res.ok) { toast.error("Export failed. Check you are logged in."); return; }
            const blob = await res.blob();
            const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
            a.download = `issues_${month}.csv`; document.body.appendChild(a); a.click();
            document.body.removeChild(a);
          }}>
            <Download className="h-4 w-4 mr-2" />Download CSV
          </Button>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-36">Date</TableHead>
                  <TableHead className="w-24 text-center">Voucher</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-center">Folio/S11</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array(5).fill(0).map((_,i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 mx-auto" /></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                )) : issues && issues.length > 0 ? issues.map(issue => {
                  const dayLabel = getWeekdayLabel(issue.issuedAt);
                  return (
                    <TableRow key={issue.id}>
                      <TableCell className="font-medium text-sm whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span>{format(new Date(issue.issuedAt + "T00:00:00"), "MMM d, yyyy")}</span>
                          <span className={`w-fit px-1.5 py-0.5 rounded text-[10px] font-bold ${getWeekdayColor(dayLabel)}`}>
                            {dayLabel}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {issue.voucherId ? (
                          <Badge variant="outline" className="font-mono text-[10px] px-1">{issue.voucherId.substring(0,8)}</Badge>
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
                          {issue.folioNo && <span>F: {issue.folioNo}</span>}
                          {issue.s11No && <span>S: {issue.s11No}</span>}
                          {!issue.folioNo && !issue.s11No && "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {canDeleteTransactions && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => { if (confirm("Delete this issue?")) deleteIssue.mutate({ issueId: issue.id }); }}
                            disabled={deleteIssue.isPending}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                }) : (
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
