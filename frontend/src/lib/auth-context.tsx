import { createContext, useContext, ReactNode, useEffect } from "react";
import { useGetCurrentUser, useLogin, useLogout, getGetCurrentUserQueryKey } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

interface User {
  id: number;
  username: string;
  fullName: string | null;
  role: "admin" | "manager" | "staff";
  permissions: {
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
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: ReturnType<typeof useLogin>["mutateAsync"];
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
    await queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
    return result;
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
