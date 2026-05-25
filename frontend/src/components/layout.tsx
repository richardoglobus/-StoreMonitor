import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Wifi, WifiOff, Package2 } from "lucide-react";
import {
  LayoutDashboard, Building2, PackageSearch, FileText,
  Download, Menu, ShoppingCart, BarChart3, Users,
  LogOut, User as UserIcon, Sun, Moon, Settings2, TrendingUp,
  Heart, Shield, Star, Cross, Stethoscope, Pill, Activity, Leaf,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth-context";
import { useTheme, THEMES, LOGOS, AppTheme, AppLogo } from "@/lib/theme-context";
import { Badge } from "@/components/ui/badge";

const LOGO_ICONS: Record<AppLogo, React.FC<any>> = {
  Building2, Heart, Shield, Star,
  Cross: ({ className }: any) => <span className={className} style={{fontSize:"1.1em",lineHeight:1}}>✚</span>,
  Stethoscope: Activity,
  Hospital: Building2,
  Pill: Pill,
  Activity, Leaf,
};

const NAV_ITEMS = [
  { href: "/",                label: "Dashboard",      icon: LayoutDashboard, permission: "viewDashboard" },
  { href: "/departments",     label: "Departments",    icon: Building2,       permission: "manageDepartments" },
  { href: "/assets",          label: "Asset Register", icon: Package2,        permission: null },
  { href: "/items",           label: "Catalog",        icon: PackageSearch,   permission: "manageCatalog" },
  { href: "/purchases",       label: "Purchases",      icon: ShoppingCart,    permission: "managePurchases" },
  { href: "/issues",          label: "Issues Log",     icon: FileText,        permission: "issueItems" },
  { href: "/reports",         label: "Monthly Report", icon: BarChart3,       permission: "viewReports" },
  { href: "/stock-valuation", label: "Stock Valuation",icon: TrendingUp,      permission: "viewReports" },
  { href: "/exports",         label: "Exports",        icon: Download,        permission: "exportData" },
  { href: "/admin/users",     label: "Users",          icon: Users,           permission: "manageUsers" },
  { href: "/admin/settings",  label: "Settings",       icon: Settings2,       permission: "manageUsers" },
];

function ThemeToggle() {
  const { darkMode, toggleDarkMode } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggleDarkMode}
      title={darkMode === "dark" ? "Light mode" : "Dark mode"}
      className="h-9 w-9 rounded-full">
      {darkMode === "dark" ? <Sun className="h-4 w-4 text-yellow-400" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

function AppLogoIcon({ className }: { className?: string }) {
  const { appLogo } = useTheme();
  const Icon = LOGO_ICONS[appLogo] || Building2;
  return <Icon className={className} />;
}


// ── Online / Offline Banner ──────────────────────────────────────────────
function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBack, setShowBack] = useState(false);
  const [backTimer, setBackTimer] = useState<ReturnType<typeof setTimeout>|null>(null);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      setShowBack(true);
      const t = setTimeout(() => setShowBack(false), 4000);
      setBackTimer(t);
    };
    const goOffline = () => {
      setIsOnline(false);
      setShowBack(false);
      if (backTimer) clearTimeout(backTimer);
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (isOnline && !showBack) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: isOnline
        ? 'linear-gradient(90deg,#15803d,#16a34a)'
        : 'linear-gradient(90deg,#991b1b,#b91c1c)',
      padding: '10px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 10, boxShadow: '0 -4px 20px rgba(0,0,0,0.4)',
      animation: 'slideUp 0.3s ease',
      transition: 'background 0.4s ease',
    }}>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
      {isOnline
        ? <Wifi size={16} color="#fff" />
        : <WifiOff size={16} color="#fff" />}
      <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>
        {isOnline
          ? '✓ Back online — your changes are being saved'
          : 'You are offline — check your internet connection'}
      </span>
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "true"; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem("sidebar-collapsed", String(collapsed)); } catch {}
  }, [collapsed]);

  // Close mobile sheet on navigation
  useEffect(() => { setMobileOpen(false); }, [location]);

  const filteredNavItems = NAV_ITEMS.filter(
    item => user?.permissions?.[item.permission as keyof typeof user.permissions]
  );

  const NavLinks = ({ onNavigate, showLabels = true }: { onNavigate?: () => void; showLabels?: boolean }) => (
    <>
      {filteredNavItems.map((item) => {
        const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href}
            onClick={onNavigate}
            title={!showLabels ? item.label : undefined}
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${
              showLabels ? "" : "justify-center px-2"
            } ${
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}>
            <Icon className="h-4 w-4 shrink-0" />
            {showLabels && item.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">

      {/* ── Mobile / Tablet header ── */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-card sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded bg-primary flex items-center justify-center">
            <AppLogoIcon className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-base">Hospital Stores</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col">
              <div className="p-5 border-b flex items-center gap-2">
                <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
                  <AppLogoIcon className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-base">Mukurweini Hospital Stores</span>
              </div>
              <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
                <NavLinks onNavigate={() => setMobileOpen(false)} />
              </nav>
              {user && (
                <div className="border-t p-4 space-y-3">
                  <div className="flex items-center gap-3 px-1">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{user.fullName || user.username}</p>
                      <Badge variant="secondary" className="h-4 text-[10px] px-1 uppercase">{user.role}</Badge>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full justify-start gap-2" onClick={() => logout()}>
                    <LogOut className="h-4 w-4" />Logout
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* ── Desktop sidebar ── */}
      <aside className={`hidden md:flex flex-col border-r bg-card h-screen sticky top-0 shrink-0 transition-all duration-300 ${collapsed ? "w-[60px]" : "w-60"}`}>

        {/* Logo + toggle button */}
        <div className={`flex items-center border-b h-14 shrink-0 ${collapsed ? "justify-center px-2" : "px-4 gap-2"}`}>
          {!collapsed && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <AppLogoIcon className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xs leading-tight text-foreground truncate">Mukurweini Hospital Stores</span>
            </div>
          )}
          {collapsed && (
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <AppLogoIcon className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          <Button
            variant="ghost" size="icon"
            onClick={() => setCollapsed(c => !c)}
            className={`h-7 w-7 shrink-0 rounded-full border ${collapsed ? "ml-0 mt-0" : ""}`}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden">
          <NavLinks showLabels={!collapsed} />
        </nav>

        {/* User section */}
        {user && (
          <div className={`border-t flex flex-col gap-1 ${collapsed ? "p-2 items-center" : "p-3"}`}>
            {!collapsed && (
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-xs text-muted-foreground">Appearance</span>
                <ThemeToggle />
              </div>
            )}
            {collapsed && <ThemeToggle />}

            <div className={`flex items-center gap-2.5 ${collapsed ? "justify-center" : "px-2"}`}>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <UserIcon className="h-4 w-4 text-primary" />
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{user.fullName || user.username}</p>
                  <Badge variant="secondary" className="h-4 text-[10px] px-1 uppercase">{user.role}</Badge>
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              title={collapsed ? "Logout" : undefined}
              className={`gap-2 text-muted-foreground text-sm ${collapsed ? "w-9 h-9 p-0 justify-center" : "w-full justify-start"}`}
              onClick={() => logout()}>
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && "Logout"}
            </Button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-8 min-w-0 overflow-auto">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
      <OfflineBanner />
    </div>
  );
}
