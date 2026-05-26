import { useState } from "react";
import { Layout } from "@/components/layout";
import { Link, useLocation } from "wouter";
import {
  useListDepartments,
  getListDepartmentsQueryKey,
  useCreateDepartment, API_BASE,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Plus, ChevronRight, Pencil, Check, X, Trash2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export default function Departments() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  if (!user?.permissions?.manageDepartments) { setLocation("/"); return null; }

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [search, setSearch] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

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
      onError: () => toast.error("Failed to create department"),
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    createDepartment.mutate({ data: { name: newDeptName } });
  };

  const startRename = (e: React.MouseEvent, dept: any) => {
    e.preventDefault(); e.stopPropagation();
    setRenamingId(dept.id);
    setRenameValue(dept.name);
  };

  const cancelRename = (e?: React.MouseEvent) => {
    e?.preventDefault(); e?.stopPropagation();
    setRenamingId(null);
    setRenameValue("");
  };

  const handleRename = async (e: React.MouseEvent | React.KeyboardEvent, deptId: number) => {
    e.preventDefault(); e.stopPropagation();
    if (!renameValue.trim()) return;
    setRenameSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/departments/${deptId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Rename failed"); return; }
      toast.success(`Renamed to "${data.name}"`);
      queryClient.invalidateQueries({ queryKey: getListDepartmentsQueryKey() });
      setRenamingId(null);
    } catch { toast.error("Rename failed"); }
    finally { setRenameSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/departments/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.status === 204) {
        toast.success(`"${deleteTarget.name}" deleted`);
        queryClient.invalidateQueries({ queryKey: getListDepartmentsQueryKey() });
        setDeleteTarget(null);
        return;
      }
      const data = await res.json();
      toast.error(data.error || "Delete failed");
    } catch { toast.error("Delete failed"); }
    finally { setDeleteLoading(false); }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
            <p className="text-muted-foreground">Manage hospital wards and departments. Hover a card to rename or delete it.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2"/>Add Department</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Department</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Department Name</Label>
                    <Input id="name" placeholder="e.g. Maternity Ward"
                      value={newDeptName} onChange={e=>setNewDeptName(e.target.value)} autoFocus/>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={()=>setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={!newDeptName.trim()||createDepartment.isPending}>
                    {createDepartment.isPending?"Creating...":"Create Department"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input
            placeholder="Search departments…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i=><Skeleton key={i} className="h-32 w-full"/>)}
          </div>
        ) : departments && departments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.filter(d => d.name.toLowerCase().includes(search.toLowerCase())).map(dept=>(
              <div key={dept.id} className="relative group">
                {renamingId === dept.id ? (
                  <Card className="border-primary shadow-md">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Building2 className="h-5 w-5 text-primary shrink-0"/>
                        <Input
                          autoFocus
                          value={renameValue}
                          onChange={e=>setRenameValue(e.target.value.toUpperCase())}
                          className="h-8 text-sm font-semibold"
                          onKeyDown={e=>{
                            if(e.key==="Enter") handleRename(e as any, dept.id);
                            if(e.key==="Escape") cancelRename();
                          }}
                          onClick={e=>{e.preventDefault();e.stopPropagation();}}
                        />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 mt-1">
                        <Button size="sm" className="h-7 text-xs gap-1 flex-1"
                          disabled={!renameValue.trim()||renameSaving}
                          onClick={e=>handleRename(e,dept.id)}>
                          <Check className="h-3 w-3"/>{renameSaving?"Saving...":"Save"}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                          onClick={cancelRename}>
                          <X className="h-3 w-3"/>Cancel
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2">Enter to save · Esc to cancel</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Link href={`/departments/${dept.id}`}>
                    <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group h-full">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Building2 className="h-5 w-5 text-primary opacity-80"/>
                          {dept.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center text-sm text-muted-foreground mt-4">
                          <span>View inventory & issues</span>
                          <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-primary"/>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )}

                {renamingId !== dept.id && (
                  <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      title="Rename department"
                      onClick={e=>startRename(e,dept)}
                      className="bg-background border rounded p-1.5 shadow-sm hover:bg-muted"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground"/>
                    </button>
                    <button
                      title="Delete department"
                      onClick={e=>{ e.preventDefault(); e.stopPropagation(); setDeleteTarget({ id: dept.id, name: dept.name }); }}
                      className="bg-background border border-destructive/30 rounded p-1.5 shadow-sm hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive"/>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : search && departments && departments.filter(d => d.name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
          <div className="text-center py-16 border border-dashed rounded-lg bg-muted/20">
            <Search className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-40"/>
            <p className="text-sm text-muted-foreground">No departments match "<strong>{search}</strong>"</p>
            <button className="text-xs text-primary mt-2 hover:underline" onClick={() => setSearch("")}>Clear search</button>
          </div>
        ) : (
          <div className="text-center py-20 border border-dashed rounded-lg bg-muted/20">
            <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50"/>
            <h3 className="text-lg font-medium">No departments found</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Get started by adding a department.</p>
            <Button variant="outline" onClick={()=>setIsDialogOpen(true)}>Add Department</Button>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the department. This action cannot be undone.
              <br/><br/>
              <strong>Note:</strong> Departments with existing inventory records, issues, or receipts cannot be deleted — you must remove those records first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? "Deleting..." : "Delete Department"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
