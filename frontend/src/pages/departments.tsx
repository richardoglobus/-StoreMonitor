import { useState } from "react";
import { Layout } from "@/components/layout";
import { Link, useLocation } from "wouter";
import {
  useListDepartments,
  getListDepartmentsQueryKey,
  useCreateDepartment,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Plus, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export default function Departments() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  if (!user?.permissions?.manageDepartments) {
    setLocation("/");
    return null;
  }
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");

  const { data: departments, isLoading } = useListDepartments(
    { query: { queryKey: getListDepartmentsQueryKey() } }
  );

  const createDepartment = useCreateDepartment({
    mutation: {
      onSuccess: () => {
        toast.success("Department created successfully");
        queryClient.invalidateQueries({ queryKey: getListDepartmentsQueryKey() });
        setIsDialogOpen(false);
        setNewDeptName("");
      },
      onError: (err: any) => {
        toast.error("Failed to create department");
      }
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    createDepartment.mutate({ data: { name: newDeptName } });
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
            <p className="text-muted-foreground">Manage hospital wards and departments.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Department
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Department</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Department Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g. Maternity Ward"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={!newDeptName.trim() || createDepartment.isPending}>
                    {createDepartment.isPending ? "Creating..." : "Create Department"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : departments && departments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <Link key={dept.id} href={`/departments/${dept.id}`}>
                <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Building2 className="h-5 w-5 text-primary opacity-80" />
                      {dept.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center text-sm text-muted-foreground mt-4">
                      <span>View inventory & issues</span>
                      <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-primary" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border border-dashed rounded-lg bg-muted/20">
            <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No departments found</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Get started by adding a department.</p>
            <Button variant="outline" onClick={() => setIsDialogOpen(true)}>Add Department</Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
