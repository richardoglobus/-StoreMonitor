import { useState } from "react";
import { Layout } from "@/components/layout";
import {
  useListUsers,
  getListUsersQueryKey,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit, Users as UsersIcon, Shield, User as UserIcon, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";

const defaultPermissionsByRole = (role: "admin" | "manager" | "staff") => {
  if (role === "admin") {
    return {
      viewDashboard: true,
      issueItems: true,
      manageCatalog: true,
      editCatalog: true,
      manageDepartments: true,
      manageInventory: true,
      managePurchases: true,
      editPurchases: true,
      viewReports: true,
      exportData: true,
      deleteTransactions: true,
      editIssues: true,
      viewActivityLogs: true,
      manageUsers: true,
    };
  }
  if (role === "manager") {
    return {
      viewDashboard: true,
      issueItems: true,
      manageCatalog: true,
      editCatalog: true,
      manageDepartments: true,
      manageInventory: true,
      managePurchases: true,
      editPurchases: true,
      viewReports: true,
      exportData: true,
      deleteTransactions: true,
      editIssues: true,
      viewActivityLogs: false,
      manageUsers: false,
    };
  }
  return {
    viewDashboard: true,
    issueItems: true,
    manageCatalog: false,
    editCatalog: false,
    manageDepartments: false,
    manageInventory: false,
    managePurchases: false,
    editPurchases: false,
    viewReports: false,
    exportData: false,
    deleteTransactions: false,
    editIssues: false,
    viewActivityLogs: false,
    manageUsers: false,
  };
};

// Human-readable labels and grouping for the permissions UI
const PERMISSION_META: Record<string, { label: string; description: string; group: string }> = {
  viewDashboard:      { label: "View Dashboard",        description: "See the main dashboard and stats",          group: "General" },
  issueItems:         { label: "Issue Items",            description: "Create issue vouchers for departments",     group: "Issues" },
  editIssues:         { label: "Edit Issues",            description: "Edit existing issue log entries",           group: "Issues" },
  deleteTransactions: { label: "Delete Transactions",    description: "Delete issue and purchase records",         group: "Issues" },
  manageCatalog:      { label: "Manage Catalog",         description: "Add & delete items from the catalog",       group: "Catalog" },
  editCatalog:        { label: "Edit Catalog Items",     description: "Edit existing catalog item details",        group: "Catalog" },
  managePurchases:    { label: "Manage Purchases",       description: "Record and view purchase entries",          group: "Purchases" },
  editPurchases:      { label: "Edit Purchases",         description: "Edit existing purchase records",            group: "Purchases" },
  manageDepartments:  { label: "Manage Departments",     description: "Add and edit hospital departments",         group: "Admin" },
  manageInventory:    { label: "Manage Inventory",       description: "Adjust inventory counts & receipts",        group: "Admin" },
  viewReports:        { label: "View Reports",           description: "Access monthly reports & stock valuation",  group: "Reports" },
  exportData:         { label: "Export Data",            description: "Download CSV and Excel exports",            group: "Reports" },
  viewActivityLogs:   { label: "View Activity Logs",     description: "See the full system audit trail",           group: "Admin" },
  manageUsers:        { label: "Manage Users & Settings", description: "Create/edit users, change settings",       group: "Admin" },
};

const PERMISSION_GROUPS = ["General", "Issues", "Catalog", "Purchases", "Reports", "Admin"];

function PermissionsEditor({ permissions, onChange, disabled }: {
  permissions: Record<string, boolean>;
  onChange: (key: string, value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      {PERMISSION_GROUPS.map(group => {
        const keys = Object.keys(PERMISSION_META).filter(k => PERMISSION_META[k].group === group && k in permissions);
        if (keys.length === 0) return null;
        return (
          <div key={group}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{group}</p>
            <div className="space-y-2">
              {keys.map(key => {
                const meta = PERMISSION_META[key];
                return (
                  <label key={key} className={`flex items-start gap-3 p-2 rounded-md border transition-colors cursor-pointer ${permissions[key] ? "bg-primary/5 border-primary/30" : "bg-muted/20 border-transparent"} ${disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-muted/40"}`}>
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-primary"
                      checked={!!permissions[key]}
                      disabled={disabled}
                      onChange={e => onChange(key, e.target.checked)}
                    />
                    <div>
                      <p className="text-sm font-medium leading-none">{meta.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function UserManagement() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [, setLocation] = useLocation();

  if (!currentUser?.permissions?.manageUsers) {
    setLocation("/");
    return null;
  }

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    fullName: "",
    role: "staff" as const,
    permissions: defaultPermissionsByRole("staff")
  });

  const { data: users, isLoading } = useListUsers({ query: { queryKey: getListUsersQueryKey() } });

  const createUser = useCreateUser({
    mutation: {
      onSuccess: () => {
        toast.success("User created successfully");
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        setIsAddOpen(false);
        setFormData({
          username: "",
          password: "",
          fullName: "",
          role: "staff",
          permissions: defaultPermissionsByRole("staff")
        });
      },
      onError: () => toast.error("Failed to create user")
    }
  });

  const updateUser = useUpdateUser({
    mutation: {
      onSuccess: () => {
        toast.success("User updated successfully");
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        setIsEditOpen(false);
        setEditingUser(null);
      },
      onError: () => toast.error("Failed to update user")
    }
  });

  const deleteUser = useDeleteUser({
    mutation: {
      onSuccess: () => {
        toast.success("User deleted");
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
      onError: () => toast.error("Failed to delete user")
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createUser.mutate({ data: formData });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const { password, ...rest } = formData;
    updateUser.mutate({ 
      userId: editingUser.id, 
      data: password ? { ...rest, password } : rest 
    });
  };

  const handleDelete = (id: number) => {
    if (id === currentUser?.id) {
      toast.error("You cannot delete your own account");
      return;
    }
    if (confirm("Are you sure you want to delete this user?")) {
      deleteUser.mutate({ userId: id });
    }
  };

  const openEdit = (user: any) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: "",
      fullName: user.fullName,
      role: user.role
      ,
      permissions: user.permissions
    });
    setIsEditOpen(true);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin": return <Badge className="bg-red-100 text-red-800 border-red-200">Admin</Badge>;
      case "manager": return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Manager</Badge>;
      default: return <Badge variant="secondary">Staff</Badge>;
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">Manage system access and roles.</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={formData.role} onValueChange={(v: any) => setFormData({...formData, role: v, permissions: defaultPermissionsByRole(v)})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Access Rights</Label>
                  <div className="max-h-80 overflow-y-auto pr-1">
                    <PermissionsEditor
                      permissions={formData.permissions}
                      onChange={(key, val) => setFormData({...formData, permissions: { ...formData.permissions, [key]: val }})}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createUser.isPending}>
                    {createUser.isPending ? "Creating..." : "Create User"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))
              ) : (
                users?.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserIcon className="h-4 w-4 text-primary" />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{u.fullName} {u.id === currentUser?.id && <span className="text-xs text-muted-foreground ml-1">(You)</span>}</TableCell>
                    <TableCell className="text-sm font-mono">{u.username}</TableCell>
                    <TableCell>{getRoleBadge(u.role)}</TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(u.id)}
                        disabled={deleteUser.isPending || u.id === currentUser?.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User: {editingUser?.fullName}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-fullName">Full Name</Label>
                <Input id="edit-fullName" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-username">Username</Label>
                <Input id="edit-username" value={formData.username} disabled />
                <p className="text-[10px] text-muted-foreground">Username cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-password">New Password (Optional)</Label>
                <Input id="edit-password" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Leave blank to keep current" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={formData.role} onValueChange={(v: any) => setFormData({...formData, role: v, permissions: defaultPermissionsByRole(v)})} disabled={editingUser?.id === currentUser?.id}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
                {editingUser?.id === currentUser?.id && <p className="text-[10px] text-muted-foreground">You cannot change your own role</p>}
              </div>
              <div className="space-y-2">
                <Label>Access Rights</Label>
                <div className="max-h-80 overflow-y-auto pr-1">
                  <PermissionsEditor
                    permissions={formData.permissions}
                    onChange={(key, val) => setFormData({...formData, permissions: { ...formData.permissions, [key]: val }})}
                    disabled={editingUser?.id === currentUser?.id}
                  />
                </div>
                {editingUser?.id === currentUser?.id && <p className="text-[10px] text-muted-foreground">You cannot change your own permissions</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={updateUser.isPending}>
                  {updateUser.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
