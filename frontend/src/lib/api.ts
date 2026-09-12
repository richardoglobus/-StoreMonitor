import { useQuery, useMutation } from "@tanstack/react-query";
import type { UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";

// ─── Base fetch ────────────────────────────────────────────────────────────────

export const API_BASE = (import.meta as any).env?.VITE_API_URL ?? "";

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, { credentials: "include", cache: "no-store", ...options });
  if (res.status === 204) return undefined as T;
  const data = await res.json();
  if (!res.ok) throw data;
  return data as T;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export type Permissions = {
  viewDashboard: boolean;
  viewCatalog: boolean;
  viewDepartments: boolean;
  viewPurchases: boolean;
  viewIssues: boolean;
  issueItems: boolean;
  manageCatalog: boolean;
  manageDepartments: boolean;
  manageInventory: boolean;
  managePurchases: boolean;
  viewReports: boolean;
  viewAccounts: boolean;
  manageAccounts: boolean;
  exportData: boolean;
  deleteTransactions: boolean;
  deletePurchases: boolean;
  deleteIssues: boolean;
  editCatalog: boolean;
  editPurchases: boolean;
  editIssues: boolean;
  viewActivityLogs: boolean;
  manageUsers: boolean;
  viewAssets: boolean;
  manageAssets: boolean;
  manageDigitalForms: boolean;
};
export type AuthUser = { id: number; username: string; fullName: string | null; role: "admin" | "manager" | "accountant" | "staff"; permissions: Permissions };
export type Department = { id: number; name: string; slug: string };
export type Item = { id: number; description: string; unit: string; quantity: number; categoryId?: number | null; categoryName?: string | null };
export type ItemStock = Item & { purchasedTotal: number; issuedTotal: number; adjustmentTotal: number; stockBalance: number };
export type CatalogCategory = { id: number; name: string; chargeItemCode: string | null; itemCount?: number; createdAt?: string };
export type InventoryRow = { id: number; departmentId: number; itemId: number; month: string; physicalCount: number; receivedKemsa: number; receivedMeds: number; totalUsed: number; balance: number; item: Item };
export type Issue = { id: number; voucherId: string | null; folioNo: string | null; s11No: string | null; departmentId: number; itemId: number; quantity: number; issuedAt: string; weekday: string; note: string | null; item: Item; department: Department };
export type Receipt = { id: number; departmentId: number; itemId: number; source: string; quantity: number; receivedAt: string; item: Item; department: Department };
export type Purchase = { id: number; supplierId: number; supplier: string; supplierRecord?: Supplier | null; itemId: number; quantity: number; unitPrice: number; invoiceNo: string | null; folioNo?: string | null; purchasedAt: string; note: string | null; batchNo?: string | null; expiryDate?: string | null; item: Item };
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
export const getListCategoriesQueryKey = () => ["/api/catalog/categories"] as const;
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
export function useChangePassword(options?: MutOpts<{ success: boolean; message: string }, { data: { currentPassword: string; newPassword: string } }>) {
  return useMutation({ mutationFn: ({ data }) => apiFetch<{ success: boolean; message: string }>("/api/auth/change-password", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), ...options?.mutation });
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
export function useListCategories(options?: QueryOpts<CatalogCategory[]>) {
  return useQuery({ queryKey: getListCategoriesQueryKey(), queryFn: () => apiFetch<CatalogCategory[]>("/api/catalog/categories"), ...options?.query });
}
export function useCreateCategory(options?: MutOpts<CatalogCategory, { data: { name: string; chargeItemCode?: string } }>) {
  return useMutation({ mutationFn: ({ data }) => apiFetch<CatalogCategory>("/api/catalog/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), ...options?.mutation });
}
export function useUpdateCategory(options?: MutOpts<CatalogCategory, { categoryId: number; data: { name?: string; chargeItemCode?: string } }>) {
  return useMutation({ mutationFn: ({ categoryId, data }) => apiFetch<CatalogCategory>(`/api/catalog/categories/${categoryId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), ...options?.mutation });
}
export function useDeleteCategory(options?: MutOpts<void, { categoryId: number }>) {
  return useMutation({ mutationFn: ({ categoryId }) => apiFetch<void>(`/api/catalog/categories/${categoryId}`, { method: "DELETE" }), ...options?.mutation });
}

export function useListItemStock(options?: QueryOpts<ItemStock[]>) {
  return useQuery({ queryKey: getListItemStockQueryKey(), queryFn: () => apiFetch<ItemStock[]>("/api/items/stock"), ...options?.query });
}

export function useCreateItem(options?: MutOpts<Item, { data: { description: string; unit: string; categoryId?: number | null } }>) {
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
export function useBulkDeleteIssues(options?: MutOpts<{ deleted: number; requested: number }, { issueIds: number[] }>) {
  return useMutation({ mutationFn: ({ issueIds }) => apiFetch<{ deleted: number; requested: number }>("/api/issues/bulk-delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ issueIds }) }), ...options?.mutation });
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

// ─── Accounts Section ───────────────────────────────────────────────────────

export type Supplier = { id: number; name: string; contactPerson: string | null; phone: string | null; email: string | null; address: string | null; balance: number; createdAt: string };
export type GrnItem = { itemCode: string | null; description: string; unit: string | null; qtyReceived: number; unitCost: number; totalCost: number; batchNo: string | null; expiryDate: string | null; chargeItemCode: string | null; folioNo: string | null };
export type Grn = { id: number; grnNo: string; date: string; lpoNo: string | null; supplierId: number; invoiceNo: string | null; items: GrnItem[]; totalAmount: number; status: "pending" | "approved" | "voided"; createdBy: number | null; createdAt: string; approvedBy: number | null; approvedAt: string | null; sourcePurchaseId?: number | null; voidedBy?: number | null; voidedAt?: string | null; voidReason?: string | null; supplier?: Supplier | null };
export type StockMovement = { id: number | string; date: string; itemCode: string; description: string; unit: string | null; reference: string; transactionType: "OPENING" | "GRN" | "GRN_REVERSAL" | "ADJUSTMENT" | "ISSUE"; qtyIn: number; qtyOut: number; balance: number; note: string | null };
export type PaymentEntry = { id: number; date: string; supplierId: number; amount: number; method: string; reference: string | null; note: string | null; createdBy: number; createdAt: string; supplier?: Supplier | null };
export type ChartAccount = { id: number; code: string; name: string; type: string; balance: number; isDefault: boolean };
export type JournalEntry = { id: number; date: string; reference: string; description: string; debitAccount: string; creditAccount: string; amount: number };
export type FinancialSummary = { period: { start: string; end: string }; totalGrnsApproved: number; totalGoodsReceivedValue: number; totalPaidThisPeriod: number; totalAccountsPayable: number; pendingGrnCount: number; inventoryValue: number; topSuppliersByBalance: Supplier[]; accounts: ChartAccount[] };

export const getListGrnsQueryKey = (params?: any) => ["/api/accounts/grns", params] as const;
export function useListGrns(params?: any, options?: QueryOpts<Grn[]>) {
  return useQuery({ queryKey: getListGrnsQueryKey(params), queryFn: () => apiFetch<Grn[]>(`/api/accounts/grns${qs(params ?? {})}`), ...options?.query });
}
export function useCreateGrn(options?: MutOpts<Grn, { data: any }>) {
  return useMutation({ mutationFn: ({ data }) => apiFetch<Grn>("/api/accounts/grns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), ...options?.mutation });
}
export function useApproveGrn(options?: MutOpts<Grn, { grnId: number }>) {
  return useMutation({ mutationFn: ({ grnId }) => apiFetch<Grn>(`/api/accounts/grns/${grnId}/approve`, { method: "PATCH" }), ...options?.mutation });
}
export function useUpdateGrn(options?: MutOpts<Grn, { grnId: number; data: any }>) {
  return useMutation({ mutationFn: ({ grnId, data }) => apiFetch<Grn>(`/api/accounts/grns/${grnId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), ...options?.mutation });
}
export function useVoidGrn(options?: MutOpts<Grn, { grnId: number; reason: string }>) {
  return useMutation({ mutationFn: ({ grnId, reason }) => apiFetch<Grn>(`/api/accounts/grns/${grnId}/void`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) }), ...options?.mutation });
}
export function useDeleteGrn(options?: MutOpts<void, { grnId: number }>) {
  return useMutation({ mutationFn: ({ grnId }) => apiFetch<void>(`/api/accounts/grns/${grnId}`, { method: "DELETE" }), ...options?.mutation });
}

export const getListStockMovementsQueryKey = (params?: any) => ["/api/accounts/stock-movements", params] as const;
export function useListStockMovements(params?: any, options?: QueryOpts<StockMovement[]>) {
  return useQuery({ queryKey: getListStockMovementsQueryKey(params), queryFn: () => apiFetch<StockMovement[]>(`/api/accounts/stock-movements${qs(params ?? {})}`), ...options?.query });
}
export const getListStockBalancesQueryKey = () => ["/api/accounts/stock-movements/balances"] as const;
export function useListStockBalances(options?: QueryOpts<{ itemCode: string; description: string; unit: string | null; balance: number }[]>) {
  return useQuery({ queryKey: getListStockBalancesQueryKey(), queryFn: () => apiFetch<{ itemCode: string; description: string; unit: string | null; balance: number }[]>(`/api/accounts/stock-movements/balances`), ...options?.query });
}
export function useCreateStockAdjustment(options?: MutOpts<StockMovement, { data: any }>) {
  return useMutation({ mutationFn: ({ data }) => apiFetch<StockMovement>("/api/accounts/stock-movements/adjustment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), ...options?.mutation });
}

export const getListSuppliersQueryKey = () => ["/api/accounts/suppliers"] as const;
export function useListSuppliers(options?: QueryOpts<Supplier[]>) {
  return useQuery({ queryKey: getListSuppliersQueryKey(), queryFn: () => apiFetch<Supplier[]>("/api/accounts/suppliers"), ...options?.query });
}
export function useCreateSupplier(options?: MutOpts<Supplier, { data: any }>) {
  return useMutation({ mutationFn: ({ data }) => apiFetch<Supplier>("/api/accounts/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), ...options?.mutation });
}
export function useUpdateSupplier(options?: MutOpts<Supplier, { supplierId: number; data: any }>) {
  return useMutation({ mutationFn: ({ supplierId, data }) => apiFetch<Supplier>(`/api/accounts/suppliers/${supplierId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), ...options?.mutation });
}
export function useDeleteSupplier(options?: MutOpts<void, { supplierId: number }>) {
  return useMutation({ mutationFn: ({ supplierId }) => apiFetch<void>(`/api/accounts/suppliers/${supplierId}`, { method: "DELETE" }), ...options?.mutation });
}
export function useGetSupplierLedger(supplierId: number, options?: QueryOpts<{ supplier: Supplier; entries: any[] }>) {
  return useQuery({ queryKey: ["/api/accounts/suppliers", supplierId, "ledger"], queryFn: () => apiFetch<{ supplier: Supplier; entries: any[] }>(`/api/accounts/suppliers/${supplierId}/ledger`), enabled: !!supplierId, ...options?.query });
}

export const getListPaymentsQueryKey = (params?: any) => ["/api/accounts/payments", params] as const;
export function useListPayments(params?: any, options?: QueryOpts<PaymentEntry[]>) {
  return useQuery({ queryKey: getListPaymentsQueryKey(params), queryFn: () => apiFetch<PaymentEntry[]>(`/api/accounts/payments${qs(params ?? {})}`), ...options?.query });
}
export function useCreatePayment(options?: MutOpts<PaymentEntry, { data: any }>) {
  return useMutation({ mutationFn: ({ data }) => apiFetch<PaymentEntry>("/api/accounts/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), ...options?.mutation });
}
export function useDeletePayment(options?: MutOpts<void, { paymentId: number }>) {
  return useMutation({ mutationFn: ({ paymentId }) => apiFetch<void>(`/api/accounts/payments/${paymentId}`, { method: "DELETE" }), ...options?.mutation });
}

export const getListChartOfAccountsQueryKey = () => ["/api/accounts/chart-of-accounts"] as const;
export function useListChartOfAccounts(options?: QueryOpts<ChartAccount[]>) {
  return useQuery({ queryKey: getListChartOfAccountsQueryKey(), queryFn: () => apiFetch<ChartAccount[]>("/api/accounts/chart-of-accounts"), ...options?.query });
}
export function useCreateChartAccount(options?: MutOpts<ChartAccount, { data: any }>) {
  return useMutation({ mutationFn: ({ data }) => apiFetch<ChartAccount>("/api/accounts/chart-of-accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), ...options?.mutation });
}
export function useDeleteChartAccount(options?: MutOpts<void, { accountId: number }>) {
  return useMutation({ mutationFn: ({ accountId }) => apiFetch<void>(`/api/accounts/chart-of-accounts/${accountId}`, { method: "DELETE" }), ...options?.mutation });
}
export function useListJournalEntries(params?: any, options?: QueryOpts<JournalEntry[]>) {
  return useQuery({ queryKey: ["/api/accounts/journal-entries", params], queryFn: () => apiFetch<JournalEntry[]>(`/api/accounts/journal-entries${qs(params ?? {})}`), ...options?.query });
}
export function useGetFinancialSummary(params?: any, options?: QueryOpts<FinancialSummary>) {
  return useQuery({ queryKey: ["/api/accounts/reports/summary", params], queryFn: () => apiFetch<FinancialSummary>(`/api/accounts/reports/summary${qs(params ?? {})}`), ...options?.query });
}
