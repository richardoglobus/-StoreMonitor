import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Layout } from "@/components/layout";
import { DateRangePicker, firstOfMonth, todayStr } from "@/components/date-range-picker";
import { API_BASE } from "@/lib/api";
import {
  useListIssues, getListIssuesQueryKey,
  useListDepartments, getListDepartmentsQueryKey,
  useListItemStock, getListItemStockQueryKey,
  getListInventoryQueryKey, getGetDashboardSummaryQueryKey,
  getGetRecentIssuesQueryKey, getGetLowStockQueryKey,
  getGetDepartmentUsageQueryKey, getGetTopUsedItemsQueryKey,
  getGetIssueScheduleQueryKey, getGetMonthlyReportQueryKey,
  getListActivityQueryKey, getListStockMovementsQueryKey,
  getListStockBalancesQueryKey,
  useCreateIssueVoucher, useDeleteIssue, useBulkDeleteIssues,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Plus, Trash2, X, Search, Pencil, RefreshCw, SlidersHorizontal } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
                <SelectItem key={item.id} value={item.id.toString()} disabled={item.stockBalance <= 0 || item.expired}>
                  {item.description} ({item.expired ? "EXPIRED" : `${item.stockBalance} ${item.unit}`})
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
  const ISSUE_DELETION_PROGRESS_KEY = "storemonitor.issueDeletionProgress";
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  if (!user?.permissions?.viewIssues && !user?.permissions?.issueItems) { setLocation("/"); return null; }
  const canCreateIssues = !!user?.permissions?.issueItems;

  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayStr());
  const canDeleteIssues = !!user?.permissions?.deleteIssues || !!user?.permissions?.deleteTransactions;
  const [selectedIssueIds, setSelectedIssueIds] = useState<number[]>([]);
  const [deletionProgress, setDeletionProgress] = useState<{ done: number; total: number } | null>(() => {
    try {
      const saved = localStorage.getItem(ISSUE_DELETION_PROGRESS_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  useEffect(() => {
    try {
      if (deletionProgress) localStorage.setItem(ISSUE_DELETION_PROGRESS_KEY, JSON.stringify(deletionProgress));
      else localStorage.removeItem(ISSUE_DELETION_PROGRESS_KEY);
    } catch { /* Storage may be unavailable in private browsing. */ }
  }, [deletionProgress]);
  const [departmentIdFilter, setDepartmentIdFilter] = useState("all");
  const [itemIdFilter, setItemIdFilter] = useState(() => new URLSearchParams(window.location.search).get("itemId") || "all");
  const [s11Filter, setS11Filter] = useState("");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = (itemIdFilter !== "all" ? 1 : 0) + (s11Filter.trim() ? 1 : 0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editIssueOpen, setEditIssueOpen] = useState(false);
  const [editIssue, setEditIssue] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);

  const [voucherData, setVoucherData] = useState({
    departmentId: "", issuedAt: format(new Date(), "yyyy-MM-dd"),
    s11No: "", note: ""
  });
  const [voucherItems, setVoucherItems] = useState([emptyRow()]);

  const { data: departments } = useListDepartments({ query: { queryKey: getListDepartmentsQueryKey() } });
  const { data: itemStock } = useListItemStock({ query: { queryKey: getListItemStockQueryKey() } });

  const queryParams = { from, to, ...(departmentIdFilter !== "all" ? { departmentId: Number(departmentIdFilter) } : {}) };
  const { data: issues, isLoading, refetch: refetchIssues, isFetching } = useListIssues(queryParams, { query: { queryKey: getListIssuesQueryKey(queryParams) } });

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
      onSuccess: () => { invalidateIssueRelatedData(); },
      onError: () => toast.error("Failed to delete issue"),
    }
  });

  const bulkDeleteIssues = useBulkDeleteIssues();

  const invalidateIssueRelatedData = () => {
    const queryKeys = [
      ["/api/issues"], ["/api/inventory"], ["/api/dashboard"], ["/api/reports"],
      ["/api/activity"], ["/api/accounts/stock-movements"],
      getListItemStockQueryKey(), getListDepartmentsQueryKey(),
      getListIssuesQueryKey(queryParams), getGetDashboardSummaryQueryKey(),
      getGetRecentIssuesQueryKey(), getGetLowStockQueryKey(),
      getGetDepartmentUsageQueryKey(), getGetTopUsedItemsQueryKey(),
      getGetIssueScheduleQueryKey(), getGetMonthlyReportQueryKey(),
      getListActivityQueryKey(), getListStockMovementsQueryKey(),
      getListStockBalancesQueryKey(), getListInventoryQueryKey({}),
    ];
    queryKeys.forEach(queryKey => queryClient.invalidateQueries({ queryKey }));
  };

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
    if (voucherData.issuedAt > todayStr()) { toast.error("Issue date cannot be in the future"); return; }
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

  const handleEditIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editIssue) return;
    if (editIssue.issuedAt > todayStr()) { toast.error("Issue date cannot be in the future"); return; }
    setEditLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/issues/${editIssue.id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: Number(editIssue.quantity),
          folioNo: editIssue.folioNo,
          s11No: editIssue.s11No,
          issuedAt: editIssue.issuedAt,
          note: editIssue.note,
        }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || "Update failed"); return; }
      toast.success("Issue updated");
      queryClient.invalidateQueries({ queryKey: getListIssuesQueryKey(queryParams) });
      setEditIssueOpen(false); setEditIssue(null);
    } catch { toast.error("Update failed"); }
    finally { setEditLoading(false); }
  };

  const openEditIssue = (issue: any) => {
    setEditIssue({
      id: issue.id,
      quantity: issue.quantity,
      folioNo: issue.folioNo || "",
      s11No: issue.s11No || "",
      issuedAt: issue.issuedAt,
      note: issue.note || "",
      itemDescription: issue.item?.description || "",
      departmentName: issue.department?.name || "",
    });
    setEditIssueOpen(true);
  };

  const downloadUrl = `${API_BASE}/api/export/issues.csv?from=${from}&to=${to}${departmentIdFilter !== "all" ? `&departmentId=${departmentIdFilter}` : ""}${itemIdFilter !== "all" ? `&itemId=${itemIdFilter}` : ""}${s11Filter.trim() ? `&s11No=${encodeURIComponent(s11Filter.trim())}` : ""}`;

  const filteredIssues = (issues ?? []).filter(i => {
    if (itemIdFilter !== "all" && i.itemId !== Number(itemIdFilter)) return false;
    if (s11Filter.trim() && !i.s11No?.toLowerCase().includes(s11Filter.trim().toLowerCase())) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matches =
        i.item?.description?.toLowerCase().includes(q) ||
        i.department?.name?.toLowerCase().includes(q) ||
        i.folioNo?.toLowerCase().includes(q) ||
        i.s11No?.toLowerCase().includes(q) ||
        i.voucherId?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });
  const filteredIssueIds = filteredIssues.map(i => i.id);
  const allFilteredIssuesSelected = filteredIssueIds.length > 0 && filteredIssueIds.every(id => selectedIssueIds.includes(id));
  const deleteSelectedIssues = async () => {
    if (!selectedIssueIds.length || !confirm(`Delete ${selectedIssueIds.length} selected issue${selectedIssueIds.length === 1 ? "" : "s"}?`)) return;
    const idsToDelete = [...selectedIssueIds];
    setDeletionProgress({ done: 0, total: idsToDelete.length });
    try { localStorage.setItem(ISSUE_DELETION_PROGRESS_KEY, JSON.stringify({ done: 0, total: idsToDelete.length })); } catch {}
    try {
      // Delete in bounded batches so each request performs one database write
      // while the progress bar still advances for large month selections.
      for (let start = 0; start < idsToDelete.length; start += 100) {
        const batch = idsToDelete.slice(start, start + 100);
        const result = await bulkDeleteIssues.mutateAsync({ issueIds: batch });
        setDeletionProgress(progress => {
          const next = progress ? { ...progress, done: progress.done + result.deleted } : progress;
          try { if (next) localStorage.setItem(ISSUE_DELETION_PROGRESS_KEY, JSON.stringify(next)); } catch {}
          return next;
        });
      }
      setSelectedIssueIds([]);
      invalidateIssueRelatedData();
      toast.success("Selected issues deleted");
    } catch { toast.error("Some selected issues could not be deleted"); }
    finally {
      setDeletionProgress(null);
      try { localStorage.removeItem(ISSUE_DELETION_PROGRESS_KEY); } catch {}
    }
  };

  const deleteSingleIssue = (issueId: number) => {
    if (!confirm("Delete this issue?")) return;
    deleteIssue.mutate({ issueId }, { onSuccess: () => toast.success("Issue deleted") });
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Issues Log</h1>
            <p className="text-muted-foreground">Track all items issued to departments.</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Button variant="ghost" size="icon" onClick={() => refetchIssues()} disabled={isFetching} title="Refresh">
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}/>
            </Button>
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
          {canCreateIssues && (
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
                    <input type="date" value={voucherData.issuedAt} max={todayStr()} onChange={e => setVoucherData({...voucherData, issuedAt: e.target.value})} required className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground [color-scheme:light] dark:[color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-ring" />
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
          )}

          <Button variant="outline" onClick={async () => {
            const res = await fetch(downloadUrl, { credentials: "include" });
            if (!res.ok) { toast.error("Export failed. Check you are logged in."); return; }
            const blob = await res.blob();
            const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
            a.download = `issues_${from}_to_${to}.csv`; document.body.appendChild(a); a.click();
            document.body.removeChild(a);
          }}>
            <Download className="h-4 w-4 mr-2" />Download CSV
          </Button>
        </div>

        <Card>
          <div className="p-3 border-b flex items-center gap-2 bg-muted/20">
            <Search className="h-4 w-4 text-muted-foreground shrink-0"/>
            <Input
              placeholder="Search by item, department, folio, S11 or voucher…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 bg-background max-w-sm"
            />
            {search && (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSearch("")}>
                <X className="h-4 w-4"/>
              </Button>
            )}
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2 shrink-0">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">{activeFilterCount}</Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Date range</Label>
                  <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Department</Label>
                  <Select value={departmentIdFilter} onValueChange={setDepartmentIdFilter}>
                    <SelectTrigger><SelectValue placeholder="All Departments" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments?.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Item</Label>
                  <Select value={itemIdFilter} onValueChange={setItemIdFilter}>
                    <SelectTrigger><SelectValue placeholder="All Items" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      {itemStock?.map(it => <SelectItem key={it.id} value={it.id.toString()}>{it.description}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">S11 No</Label>
                  <Input
                    placeholder="e.g. 7438"
                    value={s11Filter}
                    onChange={e => setS11Filter(e.target.value)}
                    className="h-9"
                  />
                </div>
                {(itemIdFilter !== "all" || s11Filter.trim() || departmentIdFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => { setItemIdFilter("all"); setS11Filter(""); setDepartmentIdFilter("all"); }}
                  >
                    <X className="h-3.5 w-3.5" /> Clear filters
                  </Button>
                )}
              </PopoverContent>
            </Popover>
            {(search || activeFilterCount > 0) && (
              <span className="text-xs text-muted-foreground ml-1">
                {filteredIssues.length} result{filteredIssues.length !== 1 ? "s" : ""}
              </span>
            )}
            {canDeleteIssues && selectedIssueIds.length > 0 && (
              <Button variant="destructive" size="sm" className="ml-auto gap-1" onClick={deleteSelectedIssues} disabled={deleteIssue.isPending}>
                <Trash2 className="h-3.5 w-3.5"/>Delete selected ({selectedIssueIds.length})
              </Button>
            )}
          </div>
          {deletionProgress && (
            <div className="px-3 pb-3 border-t bg-background/80">
              <div className="flex items-center justify-between gap-3 pt-3 text-xs text-muted-foreground">
                <span>Deleting issues and refreshing connected records…</span>
                <span className="font-medium text-foreground">{deletionProgress.done} of {deletionProgress.total}</span>
              </div>
              <Progress className="mt-2" value={(deletionProgress.done / deletionProgress.total) * 100} aria-label="Issue deletion progress" />
            </div>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {canDeleteIssues && <TableHead className="w-10"><Checkbox checked={allFilteredIssuesSelected} onCheckedChange={(checked) => setSelectedIssueIds(checked ? Array.from(new Set([...selectedIssueIds, ...filteredIssueIds])) : selectedIssueIds.filter(id => !filteredIssueIds.includes(id)))} aria-label="Select filtered issues" /></TableHead>}
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
                )) : filteredIssues.length > 0 ? filteredIssues.map(issue => {
                  const dayLabel = getWeekdayLabel(issue.issuedAt);
                  return (
                    <TableRow key={issue.id}>
                      {canDeleteIssues && <TableCell><Checkbox checked={selectedIssueIds.includes(issue.id)} onCheckedChange={(checked) => setSelectedIssueIds(ids => checked ? [...new Set([...ids, issue.id])] : ids.filter(id => id !== issue.id))} aria-label={`Select issue ${issue.id}`} /></TableCell>}
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
                        {user?.permissions?.editIssues && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => openEditIssue(issue)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {canDeleteIssues && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteSingleIssue(issue.id)}
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
                      {search ? `No issues match "${search}"` : "No issues found for the selected criteria"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
      {/* Edit Issue Dialog — admin only */}
      {editIssue && (
        <Dialog open={editIssueOpen} onOpenChange={v => { setEditIssueOpen(v); if (!v) setEditIssue(null); }}>
          <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
              <DialogTitle>Edit Issue</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {editIssue.itemDescription} → {editIssue.departmentName}
              </p>
            </DialogHeader>
            <form onSubmit={handleEditIssue}>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Issue Date</Label>
                    <input type="date" value={editIssue.issuedAt}
                      max={todayStr()}
                      onChange={e => setEditIssue({...editIssue, issuedAt: e.target.value})}
                      required className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground [color-scheme:light] dark:[color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input type="number" min="1" value={editIssue.quantity}
                      onChange={e => setEditIssue({...editIssue, quantity: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Folio No</Label>
                    <Input value={editIssue.folioNo}
                      onChange={e => setEditIssue({...editIssue, folioNo: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>S11 No</Label>
                    <Input value={editIssue.s11No}
                      onChange={e => setEditIssue({...editIssue, s11No: e.target.value})} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Note</Label>
                    <Input value={editIssue.note}
                      onChange={e => setEditIssue({...editIssue, note: e.target.value})}
                      placeholder="Optional note" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setEditIssueOpen(false); setEditIssue(null); }}>Cancel</Button>
                <Button type="submit" disabled={editLoading}>
                  {editLoading ? "Saving…" : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  );
}
