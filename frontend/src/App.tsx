import { useState, useCallback, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { useInactivityLogout } from "@/lib/use-inactivity-logout";
import Dashboard from "@/pages/dashboard";
import HomePage from "@/pages/home";
import Departments from "@/pages/departments";
import Assets from "@/pages/assets";
import DepartmentDetail from "@/pages/department-detail";
import Items from "@/pages/items";
import Purchases from "@/pages/purchases";
import Issues from "@/pages/issues";
import Reports from "@/pages/reports";
import UserManagement from "@/pages/user-management";
import SettingsPage from "@/pages/settings";
import StockValuationPage from "@/pages/stock-valuation";
import Exports from "@/pages/exports";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";
import DigitalForms from "@/pages/digital-forms";
import GrnPage from "@/pages/accounts/grn";
import PurchaseOrdersPage from "@/pages/accounts/purchase-orders";
import SupplierInvoicesPage from "@/pages/accounts/supplier-invoices";
import StockMovementPage from "@/pages/accounts/stock-movement";
import SuppliersPage from "@/pages/accounts/suppliers";
import PaymentsPage from "@/pages/accounts/payments";
import FinancialReportsPage from "@/pages/accounts/financial-reports";
import ChartOfAccountsPage from "@/pages/accounts/chart-of-accounts";
import JournalEntriesPage from "@/pages/accounts/journal-entries";

import CatalogCategoriesPage from "@/pages/catalog-categories";
import { AlertTriangle } from "lucide-react";
import { API_BASE } from "@/lib/api";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false } },
});

function InactivityWarning({ secondsLeft }: { secondsLeft: number | null }) {
  if (secondsLeft === null) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-amber-500 text-white px-5 py-3 rounded-xl shadow-2xl animate-in slide-in-from-bottom-4">
      <AlertTriangle className="h-5 w-5 shrink-0" />
      <div>
        <p className="font-semibold text-sm">Session expiring soon</p>
        <p className="text-xs opacity-90">You will be logged out in {secondsLeft} second{secondsLeft !== 1 ? "s" : ""} due to inactivity.</p>
      </div>
    </div>
  );
}

function AppWithAuth() {
  const { isLoading, isAuthenticated, logout } = useAuth();
  const [warningSeconds, setWarningSeconds] = useState<number | null>(null);
  const [timeoutMs, setTimeoutMs] = useState(60_000);
  const [warnBeforeMs, setWarnBeforeMs] = useState(10_000);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/settings/public`)
      .then(r => r.json())
      .then(s => {
        if (s.inactivityTimeoutMinutes) setTimeoutMs(s.inactivityTimeoutMinutes * 60_000);
        if (s.warningBeforeSeconds) setWarnBeforeMs(s.warningBeforeSeconds * 1_000);
      })
      .catch(() => {});
  }, [isAuthenticated]);
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const checkVersion = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/version`, { cache: "no-store" });
        const data = await res.json();
        const version = String(data.version || "dev");
        const previous = localStorage.getItem("storemonitor-deployment-version");
        if (previous && previous !== version && !cancelled) setUpdateAvailable(true);
        localStorage.setItem("storemonitor-deployment-version", version);
      } catch {}
    };
    checkVersion();
    const timer = window.setInterval(checkVersion, 5 * 60 * 1000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [isAuthenticated]);

  const handleLogout = useCallback(() => {
    setWarningSeconds(null);
    logout();
  }, [logout]);

  const handleWarn = useCallback((secondsLeft: number) => {
    setWarningSeconds(secondsLeft);
  }, []);

  useInactivityLogout({
    onLogout: handleLogout,
    onWarn: handleWarn,
    enabled: isAuthenticated,
    timeoutMs,
    warnBeforeMs,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <>
      {updateAvailable && <div className="fixed top-0 inset-x-0 z-[100] flex items-center justify-center gap-3 bg-blue-600 px-4 py-2 text-sm text-white shadow-lg"><span>A newer StoreMonitor version is available.</span><button className="rounded bg-white px-3 py-1 font-semibold text-blue-700" onClick={() => window.location.reload()}>Reload now</button><button className="text-white/80" onClick={() => setUpdateAvailable(false)}>Later</button></div>}
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/departments" component={Departments} />
        <Route path="/departments/:id" component={DepartmentDetail} />
        <Route path="/items" component={Items} />
        <Route path="/items/categories" component={CatalogCategoriesPage} />
        <Route path="/purchases" component={Purchases} />
        <Route path="/issues" component={Issues} />
        <Route path="/reports" component={Reports} />
        <Route path="/exports" component={Exports} />
        <Route path="/assets" component={Assets} />
        <Route path="/admin/users" component={UserManagement} />
        <Route path="/admin/settings" component={SettingsPage} />
        <Route path="/stock-valuation" component={StockValuationPage} />
          <Route path="/digital-forms" component={DigitalForms} />
        <Route path="/accounts/purchase-orders" component={PurchaseOrdersPage} />
        <Route path="/accounts/grn" component={GrnPage} />
        <Route path="/accounts/supplier-invoices" component={SupplierInvoicesPage} />
        <Route path="/accounts/stock-movement" component={StockMovementPage} />
        <Route path="/accounts/suppliers" component={SuppliersPage} />
        <Route path="/accounts/payments" component={PaymentsPage} />
        <Route path="/accounts/financial-reports" component={FinancialReportsPage} />
        <Route path="/accounts/chart-of-accounts" component={ChartOfAccountsPage} />
        <Route path="/accounts/journal-entries" component={JournalEntriesPage} />
        <Route component={NotFound} />
      </Switch>
      <InactivityWarning secondsLeft={warningSeconds} />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter>
              <AppWithAuth />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
