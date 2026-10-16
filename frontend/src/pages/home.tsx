import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { Plus, ShoppingCart, ClipboardList, ReceiptText, PackageSearch, FileText, Wallet, BarChart3, ArrowRight, UserCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Visit = { href: string; label: string };

export default function HomePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  if (!user?.permissions?.viewDashboard) { setLocation("/"); return null; }
  const recentKey = `storemonitor.recentVisits.${user.id}`;
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  useEffect(() => { try { setRecentVisits(JSON.parse(localStorage.getItem(recentKey) || "[]")); } catch { setRecentVisits([]); } }, [recentKey]);

  const loadPendingApprovals = async () => {
    if (!user.permissions.manageUsers) return;
    setLoadingPending(true);
    try {
      const response = await fetch("/api/auth/users", { credentials: "include", cache: "no-store" });
      const list = response.ok ? await response.json() : [];
      setPendingUsers(Array.isArray(list) ? list.filter((u: any) => u.accountStatus === "pending_approval") : []);
    } catch { setPendingUsers([]); }
    finally { setLoadingPending(false); }
  };

  useEffect(() => { loadPendingApprovals(); }, [user.permissions.manageUsers]);

  const approvePendingUser = async (pendingUser: any) => {
    if (!confirm(`Approve ${pendingUser.fullName || pendingUser.username}? You can assign permissions later in User Management.`)) return;
    try {
      const response = await fetch(`/api/auth/users/${pendingUser.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountStatus: "active", permissions: {} }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Approval failed");
      toast.success(`${pendingUser.fullName || pendingUser.username} approved`);
      await loadPendingApprovals();
    } catch (error: any) { toast.error(error?.message || "Approval failed"); }
  };

  const quickActions = [
    user.permissions.issueItems ? { label: "New Issue Voucher", href: "/issues?new=1", icon: FileText, tone: "bg-indigo-600" } : null,
    user.permissions.managePurchases ? { label: "New Purchase", href: "/purchases?new=1", icon: ShoppingCart, tone: "bg-emerald-600" } : null,
    user.permissions.manageAccounts ? { label: "New Purchase Order", href: "/accounts/purchase-orders?new=1", icon: ClipboardList, tone: "bg-violet-600" } : null,
    user.permissions.manageAccounts ? { label: "New GRN", href: "/accounts/grn?new=1", icon: ReceiptText, tone: "bg-amber-600" } : null,
  ].filter(Boolean) as { label: string; href: string; icon: any; tone: string }[];
  const recentOrder = new Map(recentVisits.map((visit, index) => [visit.href, index]));
  quickActions.sort((a, b) => (recentOrder.get(a.href.split("?")[0]) ?? 99) - (recentOrder.get(b.href.split("?")[0]) ?? 99));
  const modules = [
    user.permissions.viewCatalog ? { label: "Catalog", href: "/items", icon: PackageSearch } : null,
    user.permissions.viewPurchases ? { label: "Purchases", href: "/purchases", icon: ShoppingCart } : null,
    user.permissions.viewIssues ? { label: "Issues", href: "/issues", icon: FileText } : null,
    user.permissions.viewAccounts ? { label: "Accounts", href: "/accounts/purchase-orders", icon: Wallet } : null,
    user.permissions.viewReports ? { label: "Reports", href: "/reports", icon: BarChart3 } : null,
    { label: "Dashboard", href: "/dashboard", icon: BarChart3 },
  ].filter(Boolean) as { label: string; href: string; icon: any }[];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";

  return <Layout><div className="flex flex-col gap-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-3xl font-bold tracking-tight">Home</h1><p className="text-muted-foreground">Your StoreMonitor command center.</p></div><Button variant="outline" size="sm" onClick={loadPendingApprovals} disabled={loadingPending} title="Refresh home data"><RefreshCw className={`mr-2 h-4 w-4 ${loadingPending ? "animate-spin" : ""}`} />Refresh</Button></div>
    {user.permissions.manageUsers && pendingUsers.length > 0 && <Card className="border-amber-500/40 bg-amber-500/10"><CardContent className="space-y-3 p-4"><div className="flex items-center gap-3"><UserCheck className="h-5 w-5 text-amber-600"/><div><p className="font-semibold">Pending account approvals</p><p className="text-sm text-muted-foreground">{pendingUsers.length} new account{pendingUsers.length === 1 ? "" : "s"} require administrator review.</p></div></div><div className="flex flex-wrap gap-2">{pendingUsers.slice(0, 5).map(pendingUser => <Button key={pendingUser.id} size="sm" onClick={() => approvePendingUser(pendingUser)}>Approve {pendingUser.fullName || pendingUser.username}</Button>)}{pendingUsers.length > 5 && <Button variant="outline" size="sm" onClick={() => setLocation("/admin/users")}>View all</Button>}</div></CardContent></Card>}
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm"><CardContent className="space-y-6 p-5"><div><h2 className="text-xl font-bold">Good {greeting}, {user.fullName || user.username}</h2><p className="text-sm text-muted-foreground">What would you like to do?</p></div>{quickActions.length > 0 && <div><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick actions</p><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{quickActions.map(action => { const Icon = action.icon; return <Button key={action.href} className={`h-auto min-h-16 justify-start gap-3 text-left text-white hover:opacity-90 ${action.tone}`} onClick={() => setLocation(action.href)}><Plus className="h-4 w-4"/><Icon className="h-5 w-5"/><span>{action.label}</span></Button>; })}</div></div>}<div><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Open modules</p><div className="flex flex-wrap gap-2">{modules.map(module => { const Icon = module.icon; return <Button key={module.href} variant="outline" size="sm" className="gap-2" onClick={() => setLocation(module.href)}><Icon className="h-4 w-4"/>{module.label}<ArrowRight className="h-3 w-3"/></Button>; })}</div></div>{recentVisits.length > 0 && <div><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recently used</p><div className="flex flex-wrap gap-2">{recentVisits.slice(0, 5).map((visit, idx) => <Button key={`${visit.href}-${idx}`} variant="ghost" size="sm" onClick={() => setLocation(visit.href)}>{visit.label}</Button>)}</div></div>}</CardContent></Card>
  </div></Layout>;
}
