import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Building2, PackageSearch, FileText,
  Download, Menu, ShoppingCart, BarChart3, Users,
  LogOut, User as UserIcon, Sun, Moon, Settings2, TrendingUp,
  Heart, Shield, Star, Cross, Stethoscope, Pill, Activity, Leaf,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth-context";
import { useTheme, THEMES, LOGOS, AppTheme, AppLogo } from "@/lib/theme-context";
import { Badge } from "@/components/ui/badge";

// Map logo name to Lucide component
const LOGO_ICONS: Record<AppLogo, React.FC<any>> = {
  Building2, Heart, Shield, Star,
  Cross: ({ className }: any) => <span className={className} style={{fontSize:"1.1em",lineHeight:1}}>✚</span>,
  Stethoscope: Activity, // fallback to Activity since Stethoscope may not be in this version
  Hospital: Building2,
  Pill: Pill,
  Activity, Leaf,
};

const NAV_ITEMS = [
  { href: "/",                 label: "Dashboard",       icon: LayoutDashboard, permission: "viewDashboard" },
  { href: "/departments",      label: "Departments",     icon: Building2,       permission: "manageDepartments" },
  { href: "/items",            label: "Catalog",         icon: PackageSearch,   permission: "manageCatalog" },
  { href: "/purchases",        label: "Purchases",       icon: ShoppingCart,    permission: "managePurchases" },
  { href: "/issues",           label: "Issues Log",      icon: FileText,        permission: "issueItems" },
  { href: "/reports",          label: "Monthly Report",  icon: BarChart3,       permission: "viewReports" },
  { href: "/stock-valuation",  label: "Stock Valuation", icon: TrendingUp,      permission: "viewReports" },
  { href: "/exports",          label: "Exports",         icon: Download,        permission: "exportData" },
  { href: "/admin/users",      label: "Users",           icon: Users,           permission: "manageUsers" },
  { href: "/admin/settings",   label: "Settings",        icon: Settings2,       permission: "manageUsers" },
];

function ThemeToggle() {
  const { darkMode, toggleDarkMode } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggleDarkMode} title={darkMode === "dark" ? "Light mode" : "Dark mode"} className="h-9 w-9 rounded-full">
      {darkMode === "dark" ? <Sun className="h-4 w-4 text-yellow-400" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

function AppLogoIcon({ className }: { className?: string }) {
  const { appLogo } = useTheme();
  const Icon = LOGO_ICONS[appLogo] || Building2;
  return <Icon className={className} />;
}

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const filteredNavItems = NAV_ITEMS.filter(
    item => user?.permissions?.[item.permission as keyof typeof user.permissions]
  );

  const NavLinks = () => (
    <>
      {filteredNavItems.map((item) => {
        const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}>
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">

      {/* Mobile header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded bg-primary flex items-center justify-center">
            <AppLogoIcon className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-base">Hospital Stores</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="p-5 border-b flex items-center gap-2">
                <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
                  <AppLogoIcon className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-base">Hospital Stores</span>
              </div>
              <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5"><NavLinks /></nav>
              {user && (
                <div className="border-t p-4 space-y-3">
                  <div className="flex items-center gap-3 px-1">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
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

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r bg-card h-screen sticky top-0 shrink-0">
        <div className="p-5 flex items-center gap-2.5 border-b">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <AppLogoIcon className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm leading-tight text-foreground">Mukurweini Hospital Stores</span>
        </div>

        <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5 overflow-y-auto">
          <NavLinks />
        </nav>

        {user && (
          <div className="p-3 border-t space-y-2">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs text-muted-foreground">Appearance</span>
              <ThemeToggle />
            </div>
            <div className="flex items-center gap-2.5 px-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <UserIcon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user.fullName || user.username}</p>
                <Badge variant="secondary" className="h-4 text-[10px] px-1 uppercase">{user.role}</Badge>
              </div>
            </div>
            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground text-sm" onClick={() => logout()}>
              <LogOut className="h-4 w-4" />Logout
            </Button>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 p-4 md:p-8 min-w-0 overflow-auto">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
