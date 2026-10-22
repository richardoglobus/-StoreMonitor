import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import {
  useListUsers,
  getListUsersQueryKey,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  apiFetch,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit, CheckCircle, XCircle, Users as UsersIcon, Shield, User as UserIcon, Loader2, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";

const defaultPermissionsByRole = (role: string, customRoles: any[] = []) => {
  if (role === "admin") {
    return {
      viewDashboard: true,
      issueItems: true,
      viewCatalog: true, viewDepartments: true, viewPurchases: true, viewIssues: true,
      manageCatalog: true,
      manageDepartments: true,
      manageInventory: true,
      managePurchases: true,
      viewReports: true,
      viewAccounts: true,
      manageAccounts: true,
      exportData: true,
      deleteTransactions: true,
      deletePurchases: true,
      deleteIssues: true,
      editCatalog: true,
      editPurchases: true,
      editIssues: true,
      viewActivityLogs: true,
      manageUsers: true,
      manageAssets: true,
      manageDigitalForms: true,
    };
  }
  if (role === "manager") {
    return {
      viewDashboard: true,
      issueItems: true,
      viewCatalog: true, viewDepartments: true, viewPurchases: true, viewIssues: true,
      manageCatalog: true,
      manageDepartments: true,
      manageInventory: true,
      managePurchases: true,
      viewReports: true,
      viewAccounts: true,
      manageAccounts: true,
      exportData: true,
      deleteTransactions: true,
      deletePurchases: true,
      deleteIssues: true,
      editCatalog: true,
      editPurchases: true,
      editIssues: true,
      viewActivityLogs: false,
      manageUsers: false,
      manageAssets: true,
      manageDigitalForms: false,
    };
  }
  if (role === "accountant") {
    return {
      viewDashboard: true,
      issueItems: false,
      viewCatalog: true, viewDepartments: true, viewPurchases: true, viewIssues: true,
      manageCatalog: false,
      manageDepartments: false,
      manageInventory: false,
      managePurchases: true,
      viewReports: true,
      viewAccounts: true,
      manageAccounts: true,
      exportData: true,
      deleteTransactions: false,
      deletePurchases: false,
      deleteIssues: false,
      editCatalog: false,
      editPurchases: true,
      editIssues: false,
      viewActivityLogs: false,
      manageUsers: false,
      viewAssets: true,
      manageAssets: false,
      manageDigitalForms: false,
    };
  }
  const customRole = customRoles.find(r => r.name === role);
  if (customRole?.permissions) return { ...customRole.permissions };
  return {
    viewDashboard: true,
    issueItems: true,
    viewCatalog: true, viewDepartments: true, viewPurchases: true, viewIssues: true,
    manageCatalog: false,
    manageDepartments: false,
    manageInventory: false,
    managePurchases: false,
    viewReports: false,
    viewAccounts: false,
    manageAccounts: false,
    exportData: false,
    deleteTransactions: false,
    editCatalog: false,
    editPurchases: false,
    editIssues: false,
    viewActivityLogs: false,
    manageUsers: false,
    manageAssets: false,
    manageDigitalForms: false,
  };
};

const PERMISSION_LABELS: Record<string, string> = {
  viewDashboard: "View Dashboard",
  issueItems: "Issue Items / Create Issues",
  viewCatalog: "View Catalog",
  viewDepartments: "View Departments",
  viewPurchases: "View Purchases",
  viewIssues: "View Issues",
  manageCatalog: "Manage Catalog (Add/Delete)",
  editCatalog: "Edit Catalog Items",
  manageDepartments: "Manage Departments",
  manageInventory: "Manage Inventory",
  managePurchases: "Manage Purchases (Add/Delete)",
  editPurchases: "Edit Purchases",
  viewReports: "View Reports",
  viewAccounts: "View Accounts",
  manageAccounts: "Manage Accounts",
  exportData: "Export Data",
  deleteTransactions: "Delete Transactions (legacy shared access)",
  deletePurchases: "Delete Purchases",
  deleteIssues: "Delete Issues",
  editIssues: "Edit Issues (Admin)",
  viewActivityLogs: "View Activity Logs",
  manageUsers: "Manage Users & Settings",
  viewAssets: "View Asset Register",
  manageAssets: "Manage Assets (Add/Edit/Delete)",
  manageDigitalForms: "Manage Digital Forms / CCTV Logs (Add/Edit/Delete)",
};

function TrustedOtpCountdown({ until }: { until?: string | null }) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const update = () => setRemaining(Math.max(0, until ? new Date(until).getTime() - Date.now() : 0));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [until]);
  if (!remaining) return <span className="text-muted-foreground">OTP required</span>;
  const totalSeconds = Math.ceil(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return <span className="text-emerald-600">{days ? `${days}d ` : ""}{String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(totalSeconds % 60).padStart(2, "0")}</span>;
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
  const [customRoles, setCustomRoles] = useState<any[]>([]);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");
  useEffect(() => { apiFetch<any>("/api/settings").then(s => setCustomRoles(Array.isArray(s.customRoles) ? s.customRoles : [])).catch(() => {}); }, []);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    phone: "",
    adminEmailVerified: false,
    allowPasswordOnlyLogin: false,
    role: "staff",
    permissions: defaultPermissionsByRole("staff")
  });

  const { data: users, isLoading } = useListUsers({ query: { queryKey: getListUsersQueryKey() } });
  const roleOptions = ["admin", "manager", "accountant", "staff", ...customRoles.map(role => role.name)];
  const filteredUsers = (users || []).filter(user => {
    const query = userSearch.trim().toLowerCase();
    const matchesSearch = !query || [user.fullName, user.username, user.email, user.phone].some(value => String(value || "").toLowerCase().includes(query));
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || (statusFilter === "pending" ? user.accountStatus === "pending_approval" : statusFilter === "active" ? user.accountStatus === "active" : user.accountStatus === statusFilter);
    return matchesSearch && matchesRole && matchesStatus;
  });

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
          email: "",
          phone: "",
          adminEmailVerified: false,
          allowPasswordOnlyLogin: false,
          role: "staff",
          permissions: defaultPermissionsByRole("staff")
        });
      },
      onError: (error: any) => toast.error(error?.error || error?.message || "Failed to create user")
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
      onError: (error: any) => toast.error(error?.error || error?.message || "Failed to update user")
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
      email: user.email || "",
      phone: user.phone || "",
      adminEmailVerified: !!user.emailVerifiedAt,
      allowPasswordOnlyLogin: user.allowPasswordOnlyLogin === true,
      role: user.role
      ,
      permissions: { ...defaultPermissionsByRole(user.role, customRoles), ...user.permissions }
    });
    setIsEditOpen(true);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin": return <Badge className="bg-red-100 text-red-800 border-red-200">Admin</Badge>;
      case "manager": return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Manager</Badge>;
      case "accountant": return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Accountant</Badge>;
      default: return <Badge variant="secondary">{role || "Staff"}</Badge>;
    }
  };

  const handleApprove = (user: any) => {
    if (!confirm(`Approve ${user.fullName || user.username}? You can assign additional permissions by editing the user afterward.`)) return;
    updateUser.mutate({ userId: user.id, data: { accountStatus: "active", role: user.role, permissions: user.permissions } });
  };

  const handleDecline = (user: any) => {
    if (!confirm(`Decline ${user.fullName || user.username}? This will disable the account.`)) return;
    updateUser.mutate({ userId: user.id, data: { accountStatus: "disabled" } });
  };

  const adminOnly = currentUser?.role === "admin";
  const securityHelpId = `${isEditOpen ? "edit" : "add"}-sign-in-security-help`;
  const securityHelp = !adminOnly
    ? "Only an administrator can change sign-in security options."
    : !formData.email.trim()
      ? "Enter this user's email above to enable email ownership confirmation."
      : !formData.adminEmailVerified
        ? "Confirm email ownership first to enable the password-only option."
        : "Email ownership is confirmed. Email OTP remains required unless you explicitly approve the exemption below.";
  const loginSecurityControls = <div className="space-y-3 rounded-md border p-3">
    <p className="text-sm font-semibold">Sign-in security</p>
    <p id={securityHelpId} className="text-sm text-muted-foreground" role="status">{securityHelp}</p>
    <label className="flex min-h-11 items-start gap-3 rounded-md p-2 text-sm">
      <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-primary disabled:cursor-not-allowed disabled:opacity-50" aria-describedby={securityHelpId} disabled={!adminOnly || !formData.email.trim()} checked={formData.adminEmailVerified}
        onChange={e=>setFormData({...formData,adminEmailVerified:e.target.checked,allowPasswordOnlyLogin:e.target.checked && formData.allowPasswordOnlyLogin})}/>
      <span>I have verified this email belongs to this user.</span>
    </label>
    <p className="text-xs text-muted-foreground">Administrators must confirm ownership through a trusted process. Changing the email clears its verification. Without a verified email, sign-in is blocked.</p>
    <label className="flex min-h-11 items-start gap-3 rounded-md p-2 text-sm">
      <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-primary disabled:cursor-not-allowed disabled:opacity-50" aria-describedby={securityHelpId} disabled={!adminOnly || !formData.email.trim() || !formData.adminEmailVerified} checked={formData.allowPasswordOnlyLogin}
        onChange={e=>setFormData({...formData,allowPasswordOnlyLogin:e.target.checked})}/>
      <span>Allow password-only sign-in (skip Email OTP)</span>
    </label>
    <p className="text-xs text-muted-foreground">Off by default. Only administrators can approve this exemption. A verified email is still required. Exempt accounts have less sign-in protection.</p>
  </div>;

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">Manage system access and roles. {users?.filter(u => u.accountStatus === "pending_approval").length ? <span className="font-medium text-amber-600">{users.filter(u => u.accountStatus === "pending_approval").length} awaiting approval</span> : null}</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="flex flex-col overflow-hidden sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain py-1 pr-1">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value, adminEmailVerified:false, allowPasswordOnlyLogin:false})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                {loginSecurityControls}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={formData.role} onValueChange={(v: any) => setFormData({...formData, role: v, permissions: defaultPermissionsByRole(v, customRoles)})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="accountant">Accountant</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      {customRoles.map(role => <SelectItem key={role.name} value={role.name}>{role.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Access Rights</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    {Object.entries(formData.permissions).map(([key, value]) => (
                      <label key={key} className="flex min-h-11 items-center gap-3 rounded-md p-2">
                        <input type="checkbox" className="h-4 w-4 shrink-0 accent-primary" checked={!!value} onChange={(e) => setFormData({...formData, permissions: { ...formData.permissions, [key]: e.target.checked }})} />
                        <span>{PERMISSION_LABELS[key] || key}</span>
                      </label>
                    ))}
                  </div>
                </div>
                </div>
                <DialogFooter className="mt-4 border-t pt-4">
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
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search name, username, email or phone" className="pl-9" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All roles" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All roles</SelectItem>{roleOptions.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="pending">Awaiting approval</SelectItem><SelectItem value="pending_verification">Pending verification</SelectItem><SelectItem value="disabled">Disabled</SelectItem></SelectContent>
            </Select>
            {(userSearch || roleFilter !== "all" || statusFilter !== "all") && <Button variant="ghost" size="sm" onClick={() => { setUserSearch(""); setRoleFilter("all"); setStatusFilter("all"); }}><X className="mr-1 h-4 w-4" />Clear</Button>}
            <span className="text-xs text-muted-foreground">{filteredUsers.length} of {users?.length || 0} users</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>OTP Trusted For</TableHead>
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
                filteredUsers.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserIcon className="h-4 w-4 text-primary" />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{u.fullName} {u.id === currentUser?.id && <span className="text-xs text-muted-foreground ml-1">(You)</span>}</TableCell>
                    <TableCell className="text-sm font-mono">{u.username}</TableCell>
                    <TableCell className="text-sm">{u.email || <span className="text-muted-foreground">Not set</span>}{u.emailVerifiedAt && <span className="ml-1 text-xs text-emerald-600">Verified</span>}</TableCell>
                    <TableCell className="text-sm">{u.phone || <span className="text-muted-foreground">Not set</span>}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap"><TrustedOtpCountdown until={u.loginOtpTrustedUntil} /></TableCell>
                    <TableCell>{getRoleBadge(u.role)}<div className="mt-1 text-xs text-muted-foreground">{u.accountStatus === "pending_approval" ? <span className="text-amber-600">Awaiting approval</span> : !u.email || !u.emailVerifiedAt ? "Sign-in blocked: verify email" : u.allowPasswordOnlyLogin ? "Password only (admin approved)" : "Email OTP required"}</div></TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-1">
                      {u.accountStatus === "pending_approval" && <><Button variant="outline" size="sm" className="h-8 gap-1 text-emerald-700" onClick={() => handleApprove(u)} disabled={updateUser.isPending}><CheckCircle className="h-4 w-4" />Approve</Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Decline user" onClick={() => handleDecline(u)} disabled={updateUser.isPending}><XCircle className="h-4 w-4" /></Button></>}
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
          <DialogContent className="flex flex-col overflow-hidden sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit User: {editingUser?.fullName}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain py-1 pr-1">
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
                  <Label htmlFor="edit-email">Email</Label>
                  <Input id="edit-email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value, adminEmailVerified:false, allowPasswordOnlyLogin:false})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone Number</Label>
                  <Input id="edit-phone" type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                {loginSecurityControls}
                <div className="space-y-2">
                <Label htmlFor="edit-password">New Password (Optional)</Label>
                <Input id="edit-password" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Leave blank to keep current" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                  <Select value={formData.role} onValueChange={(v: any) => setFormData({...formData, role: v, permissions: defaultPermissionsByRole(v, customRoles)})} disabled={editingUser?.id === currentUser?.id}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="accountant">Accountant</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      {customRoles.map(role => <SelectItem key={role.name} value={role.name}>{role.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {editingUser?.id === currentUser?.id && <p className="text-[10px] text-muted-foreground">You cannot change your own role</p>}
              </div>
              <div className="space-y-2">
                <Label>Access Rights</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {Object.entries(formData.permissions).map(([key, value]) => (
                    <label key={key} className="flex min-h-11 items-center gap-3 rounded-md p-2">
                      <input type="checkbox" className="h-4 w-4 shrink-0 accent-primary disabled:opacity-50" checked={!!value} disabled={editingUser?.id === currentUser?.id} onChange={(e) => setFormData({...formData, permissions: { ...formData.permissions, [key]: e.target.checked }})} />
                      <span>{PERMISSION_LABELS[key] || key}</span>
                    </label>
                  ))}
                </div>
              </div>
              </div>
              <DialogFooter className="mt-4 border-t pt-4">
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
