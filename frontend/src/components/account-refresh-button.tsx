import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

export function AccountRefreshButton() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey[0];
          return typeof queryKey === "string" && queryKey.startsWith("/api/accounts/");
        },
      });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing} className="gap-2" title="Refresh account data">
      <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
      Refresh
    </Button>
  );
}
