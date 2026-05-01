import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import Dashboard from "@/pages/dashboard";
import Departments from "@/pages/departments";
import DepartmentDetail from "@/pages/department-detail";
import Items from "@/pages/items";
import Purchases from "@/pages/purchases";
import Issues from "@/pages/issues";
import Reports from "@/pages/reports";
import UserManagement from "@/pages/user-management";
import Exports from "@/pages/exports";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function Router() {
  const { isLoading, isAuthenticated } = useAuth();

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
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/departments" component={Departments} />
      <Route path="/departments/:id" component={DepartmentDetail} />
      <Route path="/items" component={Items} />
      <Route path="/purchases" component={Purchases} />
      <Route path="/issues" component={Issues} />
      <Route path="/reports" component={Reports} />
      <Route path="/exports" component={Exports} />
      <Route path="/admin/users" component={UserManagement} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
