import { useQuery, useMutation } from "@tanstack/react-query";
import type { UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";

// ─── Base fetch ────────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...options });
  if (res.status === 204) return undefined as T;
  const data = await res.json();
  if (!res.ok) throw data;
  return data as T;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export type Permissions = {
  viewDashboard: boolean;
  issueItems: boolean;
  manageCatalog: boolean;
  manageDepartments: boolean;
  manageInventory: boolean;
  managePurchases: boolean;
  viewReports: boolean;
  exportData: boolean;
  deleteTransactions: boolean;
  viewActivityLogs: boolean;
  manageUsers: boolean;
};
export type AuthUser = { id: number; username: string; fullName: string | null; role: "admin" | "manager" | "staff"; permissions: Permissions };
export type Department = { id: number; name: string; slug: string };
export type Item = { id: number; description: string; unit: string; quantity: number };
export type ItemStock = Item & { purchasedTotal: number; issuedTotal: number; stockBalance: number };
export type InventoryRow = { id: number; departmentId: number; itemId: number; month: string; physicalCount: number; receivedKemsa: number; receivedMeds: number; totalUsed: number; balance: number; item: Item };
export type Issue = { id: number; voucherId: string | null; folioNo: string | null; s11No: string | null; departmentId: number; itemId: number; quantity: number; issuedAt: string; weekday: string; note: string | null; item: Item; department: Department };
export type Receipt = { id: number; departmentId: number; itemId: number; source: string; quantity: number; receivedAt: string; item: Item; department: Department };
export type Purchase = { id: number; supplier: string; itemId: number; quantity: number; unitPrice: number; invoiceNo: string | null; purchasedAt: string; note: string | null; item: Item };
export type DashboardSummary = { month: string; totalDepartments: number; totalItems: number; totalIssuedThisMonth: number; totalReceivedThisMonth: number; lowStockCount: number; outOfStockCount: number; nextIssueDate: string | null; nextIssueWeekday: string | null };
export type LowStockRow = { departmentId: number; departmentName: string; itemId: number; itemDescription: string; unit: string; balance: number };
export type DepartmentUsage = { departmentId: number; departmentName: string; totalIssued: number; issueCount: number };
export type TopUsedItem = { itemId: number; itemDescription: string; unit: string; totalIssued: number };
export type IssueScheduleDay = { date: string; weekday: string; issueCount: number; totalQuantity: number };
export type MonthlyReport = {
  startMonth: string;
  endMonth: string;
  months: {
    month: string;
    commodities: {
      itemId: number;
      itemDescription: string;
      unit: string;
      rows: {
        rowType: "opening" | "transaction";
        date: string;
        units: number;
        unitPrice: number;
        openingTotalCost: number;
        additionsUnits: number;
        additionsUnitCost: number;
        itemsIssued: number;
        balance: number;
        chargeItem: string;
        responsibleOfficer: string;
        remarks: string;
      }[];
    }[];
  }[];
};
export type ActivityLog = { id: number; userId: number; username: string | null; action: string; entityType: string; entityId: number | null; details: any; createdAt: string };

export const ReceiptSource = { KEMSA: "KEMSA", MEDS: "MEDS" } as const;

// ─── Query keys ────────────────────────────────────────────────────────────────

export const getGetCurrentUserQueryKey = () => ["/api/auth/me"] as const;
export const getListDepartmentsQueryKey = () => ["/api/departments"] as const;
export const getGetDepartmentQueryKey = (id: number) => [`/api/departments/${id}`] as const;
export const getListItemsQueryKey = () => ["/api/items"] as const;
export const getListItemStockQueryKey = () => ["/api/items/stock"] as const;
export const getListInventoryQueryKey = (params: any) => ["/api/inventory", params] as const;
export const getListReceiptsQueryKey = (params?: any) => ["/api/receipts", params] as const;
export const getListIssuesQueryKey = (params?: any) => ["/api/issues", params] as const;
export const getListPurchasesQueryKey = (params?: any) => ["/api/purchases", params] as const;
export const getGetDashboardSummaryQueryKey = (params?: any) => ["/api/dashboard/summary", params] as const;
export const getGetRecentIssuesQueryKey = (params?: any) => ["/api/dashboard/recent-issues", params] as const;
export const getGetLowStockQueryKey = (params?: any) => ["/api/dashboard/low-stock", params] as const;
export const getGetDepartmentUsageQueryKey = (params?: any) => ["/api/dashboard/department-usage", params] as const;
export const getGetTopUsedItemsQueryKey = (params?: any) => ["/api/dashboard/top-used-items", params] as const;
export const getGetIssueScheduleQueryKey = (params?: any) => ["/api/dashboard/issue-schedule", params] as const;
export const getGetMonthlyReportQueryKey = (params?: any) => ["/api/reports/monthly", params] as const;
export const getListUsersQueryKey = () => ["/api/auth/users"] as const;
export const getListActivityQueryKey = (params?: any) => ["/api/activity", params] as const;

// ─── Helper to build query string ─────────────────────────────────────────────

function qs(params: Record<string, any>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return parts.length ? "?" + parts.join("&") : "";
}

type QueryOpts<T> = { query?: UseQueryOptions<T, any, T, any> };
type MutOpts<T, V> = { mutation?: UseMutationOptions<T, any, V> };

// ─── Auth hooks ────────────────────────────────────────────────────────────────

export function useGetCurrentUser(options?: QueryOpts<AuthUser>) {
  return useQuery({ queryKey: getGetCurrentUserQueryKey(), queryFn: () => apiFetch<AuthUser>("/api/auth/me"), ...options?.query });
}

export function useLogin(options?: MutOpts<AuthUser, { data: { username: string; password: string } }>) {
  return useMutation({ mutationFn: ({ data }) => apiFetch<AuthUser>("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), ...options?.mutation });
}

export function useLogout(options?: MutOpts<void, void>) {
  return useMutation({ mutationFn: () => apiFetch<void>("/api/auth/logout", { method: "POST" }), ...options?.mutation });
}

export function useListUsers(options?: QueryOpts<AuthUser[]>) {
  return useQuery({ queryKey: getListUsersQueryKey(), queryFn: () => apiFetch<AuthUser[]>("/api/auth/users"), ...options?.query });
}

export function useCreateUser(options?: MutOpts<AuthUser, { data: any }>) {
  return useMutation({ mutationFn: ({ data }) => apiFetch<AuthUser>("/api/auth/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), ...options?.mutation });
}

export function useUpdateUser(options?: MutOpts<AuthUser, { userId: number; data: any }>) {
  return useMutation({ mutationFn: ({ userId, data }) => apiFetch<AuthUser>(`/api/auth/users/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), ...options?.mutation });
}

export function useDeleteUser(options?: MutOpts<void, { userId: number }>) {
  return useMutation({ mutationFn: ({ userId }) => apiFetch<void>(`/api/auth/users/${userId}`, { method: "DELETE" }), ...options?.mutation });
}

// ─── Departments ────────────────────────────────────────────────────────────────

export function useListDepartments(options?: QueryOpts<Department[]>) {
  return useQuery({ queryKey: getListDepartmentsQueryKey(), queryFn: () => apiFetch<Department[]>("/api/departments"), ...options?.query });
}

export function useGetDepartment(id: number, options?: QueryOpts<Department>) {
  return useQuery({ queryKey: getGetDepartmentQueryKey(id), queryFn: () => apiFetch<Department>(`/api/departments/${id}`), enabled: !!id, ...options?.query });
}

export function useCreateDepartment(options?: MutOpts<Department, { data: { name: string } }>) {
  return useMutation({ mutationFn: ({ data }) => apiFetch<Department>("/api/departments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), ...options?.mutation });
}

// ─── Items ─────────────────────────────────────────────────────────────────────

export function useListItems(options?: QueryOpts<Item[]>) {
  return useQuery({ queryKey: getListItemsQueryKey(), queryFn: () => apiFetch<Item[]>("/api/items"), ...options?.query });
}

export function useListItemStock(options?: QueryOpts<ItemStock[]>) {
  return useQuery({ queryKey: getListItemStockQueryKey(), queryFn: () => apiFetch<ItemStock[]>("/api/items/stock"), ...options?.query });
}

export function useCreateItem(options?: MutOpts<Item, { data: { description: string; unit: string } }>) {
  return useMutation({ mutationFn: ({ data }) => apiFetch<Item>("/api/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), ...options?.mutation });
}
export function useUpdateItem(options?: MutOpts<Item, { itemId: number; data: { description?: string; unit?: string; quantity?: number } }>) {
  return useMutation({ mutationFn: ({ itemId, data }) => apiFetch<Item>(`/api/items/${itemId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), ...options?.mutation });
}
export function useDeleteItem(options?: MutOpts<void, { itemId: number }>) {
  return useMutation({ mutationFn: ({ itemId }) => apiFetch<void>(`/api/items/${itemId}`, { method: "DELETE" }), ...options?.mutation });
}

// ─── Inventory ─────────────────────────────────────────────────────────────────

export function useListInventory(params: { departmentId: number; month?: string }, options?: QueryOpts<InventoryRow[]>) {
  return useQuery({ queryKey: getListInventoryQueryKey(params), queryFn: () => apiFetch<InventoryRow[]>(`/api/inventory${qs(params)}`), enabled: !!params.departmentId, ...options?.query });
}

export function useUpsertInventory(options?: MutOpts<InventoryRow, { data: any }>) {
  return useMutation({ mutationFn: ({ data }) => apiFetch<InventoryRow>("/api/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), ...options?.mutation });
}

// ─── Receipts ──────────────────────────────────────────────────────────────────

export function useListReceipts(params?: any, options?: QueryOpts<Receipt[]>) {
  return useQuery({ queryKey: getListReceiptsQueryKey(params), queryFn: () => apiFetch<Receipt[]>(`/api/receipts${qs(params ?? {})}`), ...options?.query });
}

export function useCreateReceipt(options?: MutOpts<Receipt, { data: any }>) {
  return useMutation({ mutationFn: ({ data }) => apiFetch<Receipt>("/api/receipts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), ...options?.mutation });
}

// ─── Issues ────────────────────────────────────────────────────────────────────

export function useListIssues(params?: any, options?: QueryOpts<Issue[]>) {
  return useQuery({ queryKey: getListIssuesQueryKey(params), queryFn: () => apiFetch<Issue[]>(`/api/issues${qs(params ?? {})}`), ...options?.query });
}

export function useCreateIssue(options?: MutOpts<Issue, { data: any }>) {
  return useMutation({ mutationFn: ({ data }) => apiFetch<Issue>("/api/issues", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), ...options?.mutation });
}

export function useCreateIssueVoucher(options?: MutOpts<Issue[], { data: any }>) {
  return useMutation({ mutationFn: ({ data }) => apiFetch<Issue[]>("/api/issues/voucher", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), ...options?.mutation });
}

export function useDeleteIssue(options?: MutOpts<void, { issueId: number }>) {
  return useMutation({ mutationFn: ({ issueId }) => apiFetch<void>(`/api/issues/${issueId}`, { method: "DELETE" }), ...options?.mutation });
}

// ─── Purchases ─────────────────────────────────────────────────────────────────

export function useListPurchases(params?: any, options?: QueryOpts<Purchase[]>) {
  return useQuery({ queryKey: getListPurchasesQueryKey(params), queryFn: () => apiFetch<Purchase[]>(`/api/purchases${qs(params ?? {})}`), ...options?.query });
}

export function useCreatePurchase(options?: MutOpts<Purchase, { data: any }>) {
  return useMutation({ mutationFn: ({ data }) => apiFetch<Purchase>("/api/purchases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), ...options?.mutation });
}

export function useDeletePurchase(options?: MutOpts<void, { purchaseId: number }>) {
  return useMutation({ mutationFn: ({ purchaseId }) => apiFetch<void>(`/api/purchases/${purchaseId}`, { method: "DELETE" }), ...options?.mutation });
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function useGetDashboardSummary(params?: any, options?: QueryOpts<DashboardSummary>) {
  return useQuery({ queryKey: getGetDashboardSummaryQueryKey(params), queryFn: () => apiFetch<DashboardSummary>(`/api/dashboard/summary${qs(params ?? {})}`), ...options?.query });
}

export function useGetRecentIssues(params?: any, options?: QueryOpts<Issue[]>) {
  return useQuery({ queryKey: getGetRecentIssuesQueryKey(params), queryFn: () => apiFetch<Issue[]>(`/api/dashboard/recent-issues${qs(params ?? {})}`), ...options?.query });
}

export function useGetLowStock(params?: any, options?: QueryOpts<LowStockRow[]>) {
  return useQuery({ queryKey: getGetLowStockQueryKey(params), queryFn: () => apiFetch<LowStockRow[]>(`/api/dashboard/low-stock${qs(params ?? {})}`), ...options?.query });
}

export function useGetDepartmentUsage(params?: any, options?: QueryOpts<DepartmentUsage[]>) {
  return useQuery({ queryKey: getGetDepartmentUsageQueryKey(params), queryFn: () => apiFetch<DepartmentUsage[]>(`/api/dashboard/department-usage${qs(params ?? {})}`), ...options?.query });
}

export function useGetTopUsedItems(params?: any, options?: QueryOpts<TopUsedItem[]>) {
  return useQuery({ queryKey: getGetTopUsedItemsQueryKey(params), queryFn: () => apiFetch<TopUsedItem[]>(`/api/dashboard/top-used-items${qs(params ?? {})}`), ...options?.query });
}

export function useGetIssueSchedule(params?: any, options?: QueryOpts<IssueScheduleDay[]>) {
  return useQuery({ queryKey: getGetIssueScheduleQueryKey(params), queryFn: () => apiFetch<IssueScheduleDay[]>(`/api/dashboard/issue-schedule${qs(params ?? {})}`), ...options?.query });
}

// ─── Reports ───────────────────────────────────────────────────────────────────

export function useGetMonthlyReport(params: { startMonth: string; endMonth: string; itemId?: number }, options?: QueryOpts<MonthlyReport>) {
  return useQuery({ queryKey: getGetMonthlyReportQueryKey(params), queryFn: () => apiFetch<MonthlyReport>(`/api/reports/monthly${qs(params)}`), ...options?.query });
}

export function useListActivity(params?: any, options?: QueryOpts<ActivityLog[]>) {
  return useQuery({ queryKey: getListActivityQueryKey(params), queryFn: () => apiFetch<ActivityLog[]>(`/api/activity${qs(params ?? {})}`), ...options?.query });
}
