import { createContext, useContext, ReactNode, useEffect } from "react";
import { useGetCurrentUser, useLogin, useLogout, getGetCurrentUserQueryKey, verifyLoginOtp } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

interface User {
  id: number;
  username: string;
  fullName: string | null;
  role: "admin" | "manager" | "accountant" | "staff";
  permissions: {
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
    editCatalog: boolean;
    editPurchases: boolean;
    editIssues: boolean;
    viewActivityLogs: boolean;
    manageUsers: boolean;
    viewAssets: boolean;
    manageAssets: boolean;
    manageDigitalForms: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: ReturnType<typeof useLogin>["mutateAsync"];
  completeLoginOtp: (otp: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: user, isLoading, error } = useGetCurrentUser({
    query: {
      queryKey: getGetCurrentUserQueryKey(),
      retry: false,
      staleTime: Infinity,
    }
  });

  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  const login = async (input: any) => {
    // login page calls login({ data: {...} }) so input is already { data: {...} }
    const result = await loginMutation.mutateAsync(input);
    if ("id" in result) {
      queryClient.setQueryData(getGetCurrentUserQueryKey(), result);
      await queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
    } else {
      queryClient.setQueryData(getGetCurrentUserQueryKey(), null);
    }
    return result;
  };

  const completeLoginOtp = async (otp: string) => {
    const result = await verifyLoginOtp(otp);
    queryClient.setQueryData(getGetCurrentUserQueryKey(), result);
    await queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
    queryClient.setQueryData(getGetCurrentUserQueryKey(), null);
    queryClient.clear();
  };

  const isAuthenticated = !!user && !error;

  return (
    <AuthContext.Provider value={{ 
      user: user as User | null,
      isLoading,
      login,
      completeLoginOtp,
      logout,
      isAuthenticated
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
