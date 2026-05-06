import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Building2, PackageSearch, FileText,
  Download, Menu, ShoppingCart, BarChart3, Users,
  LogOut, User as UserIcon, Sun, Moon, Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { Badge } from "@/components/ui/badge";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, permission: "viewDashboard" },
  { href: "/departments", label: "Departments", icon: Building2, permission: "manageDepartments" },
  { href: "/items", label: "Catalog", icon: PackageSearch, permission: "manageCatalog" },
  { href: "/purchases", label: "Purchases", icon: ShoppingCart, permission: "managePurchases" },
  { href: "/issues", label: "Issues Log", icon: FileText, permission: "issueItems" },
  { href: "/reports", label: "Monthly Report", icon: BarChart3, permission: "viewReports" },
  { href: "/exports", label: "Exports", icon: Download, permission: "exportData" },
  { href: "/admin/users", label: "Users", icon: Users, permission: "manageUsers" },
  { href: "/admin/settings", label: "Settings", icon: Settings2, permission: "manageUsers" },
];

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="h-9 w-9 rounded-full"
    >
      {theme === "dark" ? <Sun className="h-4 w-4 text-yellow-400" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
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
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">

      {/* Mobile Nav */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <span className="font-semibold text-base tracking-tight">Mukurweini Hospital Stores</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="p-6 border-b flex items-center gap-2">
                <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-base tracking-tight">Hospital Stores</span>
              </div>
              <nav className="flex-1 px-4 py-4 flex flex-col gap-1">
                <NavLinks />
              </nav>
              {user && (
                <div className="mt-auto border-t p-4">
                  <div className="flex items-center gap-3 px-2 mb-4">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium leading-none">{user.fullName || user.username}</span>
                      <Badge variant="secondary" className="w-fit h-4 text-[10px] mt-1 px-1 uppercase">{user.role}</Badge>
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

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-card h-screen sticky top-0">
        <div className="p-6 flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight text-foreground leading-tight">
            Mukurweini Hospital Stores App
          </span>
        </div>
        <nav className="flex-1 px-4 flex flex-col gap-1">
          <NavLinks />
        </nav>

        {user && (
          <div className="p-4 border-t space-y-3">
            {/* Theme toggle row */}
            <div className="flex items-center justify-between px-2">
              <span className="text-xs text-muted-foreground">Appearance</span>
              <ThemeToggle />
            </div>
            <div className="flex items-center gap-3 px-2">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <UserIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">{user.fullName || user.username}</span>
                <Badge variant="secondary" className="w-fit h-4 text-[10px] mt-1 px-1 uppercase">{user.role}</Badge>
              </div>
            </div>
            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground" onClick={() => logout()}>
              <LogOut className="h-4 w-4" />Logout
            </Button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 min-w-0 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
