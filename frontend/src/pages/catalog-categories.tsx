import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PackageSearch, Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { getListCategoriesQueryKey, useChargeItemCodes, useCreateCategory, useDeleteCategory, useListCategories, useListCatalogRoles, useUpdateCategory } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";

export default function CatalogCategoriesPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const canManage = !!user?.permissions?.manageCatalog;
  if (!user?.permissions?.viewCatalog && !canManage) { setLocation("/"); return null; }
  const { data: categories, isLoading } = useListCategories();
  const { data: roles } = useListCatalogRoles();
  const { data: chargeCodes } = useChargeItemCodes();
  const [name, setName] = useState("");
  const [chargeItemCode, setChargeItemCode] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [viewRoles, setViewRoles] = useState<string[]>([]);
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [editViewRoles, setEditViewRoles] = useState<string[]>([]);
  const [editEditRoles, setEditEditRoles] = useState<string[]>([]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
  const createCategory = useCreateCategory({ mutation: { onSuccess: () => { toast.success("Category added"); setName(""); setChargeItemCode(""); refresh(); }, onError: (e: any) => toast.error(e?.error || "Failed to add category") } });
  const updateCategory = useUpdateCategory({ mutation: { onSuccess: () => { toast.success("Category updated"); setEditingId(null); refresh(); }, onError: (e: any) => toast.error(e?.error || "Failed to update category") } });
  const deleteCategory = useDeleteCategory({ mutation: { onSuccess: () => { toast.success("Category deleted"); refresh(); }, onError: (e: any) => toast.error(e?.error || "Cannot delete category") } });
  const beginEdit = (category: any) => { setEditingId(category.id); setEditName(category.name); setEditCode(category.chargeItemCode || ""); setEditViewRoles(category.viewRoles || []); setEditEditRoles(category.editRoles || []); };
  const saveEdit = (id: number) => { if (!editName.trim()) return toast.error("Category name is required"); updateCategory.mutate({ categoryId: id, data: { name: editName, chargeItemCode: editCode, viewRoles: editViewRoles, editRoles: editEditRoles } }); };
  const toggleRole = (list: string[], setList: (next: string[]) => void, role: string) => setList(list.includes(role) ? list.filter(r => r !== role) : [...list, role]);
  const remove = (category: any) => { if (category.itemCount > 0) return toast.error("Move or reassign the items before deleting this category"); if (confirm(`Delete category \"${category.name}\"?`)) deleteCategory.mutate({ categoryId: category.id }); };

  return <Layout>
    <div className="max-w-5xl mx-auto space-y-6">
      <div><h1 className="text-3xl font-bold flex items-center gap-2"><PackageSearch className="h-7 w-7 text-primary"/>Catalog Categories</h1><p className="text-muted-foreground mt-1">Add, edit, or delete categories and assign the charge item code used in reports.</p></div>
      {canManage && <Card>
        <CardHeader><CardTitle className="text-base">Add Category</CardTitle></CardHeader>
        <CardContent><div className="flex flex-col sm:flex-row gap-3 items-end"><div className="flex-1 space-y-2"><Label>Category Name</Label><Input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. PHARM, DRESSINGS"/></div><div className="flex-1 space-y-2"><Label>Charge Item Code</Label><select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm font-mono" value={chargeItemCode} onChange={e=>setChargeItemCode(e.target.value)}><option value="">Select code</option>{(chargeCodes || []).map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></div><Button onClick={()=>{if(!name.trim()) return toast.error("Category name is required"); createCategory.mutate({data:{name,chargeItemCode,viewRoles,editRoles}})}} disabled={createCategory.isPending}><Plus className="h-4 w-4 mr-1"/>Add Category</Button></div><div className="mt-4 grid sm:grid-cols-2 gap-4 text-sm"><div><Label>Roles that can view</Label><div className="flex flex-wrap gap-2 mt-2">{(roles || []).map(role=><label key={role} className="flex items-center gap-1"><input type="checkbox" checked={viewRoles.includes(role)} onChange={()=>toggleRole(viewRoles,setViewRoles,role)}/>{role}</label>)}</div></div><div><Label>Roles that can edit</Label><div className="flex flex-wrap gap-2 mt-2">{(roles || []).map(role=><label key={role} className="flex items-center gap-1"><input type="checkbox" checked={editRoles.includes(role)} onChange={()=>toggleRole(editRoles,setEditRoles,role)}/>{role}</label>)}</div></div></div><p className="text-xs text-muted-foreground mt-3">Leave both lists empty to allow all catalog roles.</p></CardContent>
      </Card>}
      <Card><CardHeader><CardTitle className="text-base">Categories</CardTitle></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Charge Item Code</TableHead><TableHead className="text-right">Items</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{isLoading ? <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow> : (categories || []).map(category => <TableRow key={category.id}>{editingId === category.id ? <><TableCell><Input value={editName} onChange={e=>setEditName(e.target.value)}/></TableCell><TableCell><Input value={editCode} onChange={e=>setEditCode(e.target.value)} className="font-mono max-w-48"/></TableCell></> : <><TableCell className="font-medium">{category.name}</TableCell><TableCell className="font-mono">{category.chargeItemCode || "—"}</TableCell></>}<TableCell className="text-right">{category.itemCount || 0}</TableCell><TableCell className="text-right"><div className="flex justify-end gap-1">{editingId === category.id ? <><Button variant="ghost" size="icon" title="Save" onClick={()=>saveEdit(category.id)}><Save className="h-4 w-4"/></Button><Button variant="ghost" size="icon" title="Cancel" onClick={()=>setEditingId(null)}><X className="h-4 w-4"/></Button></> : <>{canManage && <><Button variant="ghost" size="icon" title="Edit category" onClick={()=>beginEdit(category)}><Pencil className="h-4 w-4"/></Button><Button variant="ghost" size="icon" title={category.itemCount ? "Move items before deleting" : "Delete category"} onClick={()=>remove(category)} className="text-destructive"><Trash2 className="h-4 w-4"/></Button></>}<Button variant="outline" size="sm" onClick={()=>setLocation(`/items?categoryId=${category.id}`)}>View Items</Button></>}</div></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
      {canManage && <Card><CardHeader><CardTitle className="text-base">Category Permissions</CardTitle></CardHeader><CardContent className="space-y-4">{(categories || []).map(category => <div key={category.id} className="rounded border p-3"><div className="font-medium mb-2">{category.name}</div><div className="grid sm:grid-cols-2 gap-3 text-sm"><div><div className="text-xs text-muted-foreground mb-1">View access (empty means everyone)</div><div className="flex flex-wrap gap-2">{(roles || []).map(role=><label key={role} className="flex items-center gap-1"><input type="checkbox" checked={(category.viewRoles || []).includes(role)} onChange={e=>{const next=e.target.checked?[...(category.viewRoles || []),role]:(category.viewRoles || []).filter(r=>r!==role); updateCategory.mutate({categoryId:category.id,data:{viewRoles:next}})}}/>{role}</label>)}</div></div><div><div className="text-xs text-muted-foreground mb-1">Edit access (empty means everyone with catalog management)</div><div className="flex flex-wrap gap-2">{(roles || []).map(role=><label key={role} className="flex items-center gap-1"><input type="checkbox" checked={(category.editRoles || []).includes(role)} onChange={e=>{const next=e.target.checked?[...(category.editRoles || []),role]:(category.editRoles || []).filter(r=>r!==role); updateCategory.mutate({categoryId:category.id,data:{editRoles:next}})}}/>{role}</label>)}</div></div></div></div>)}</CardContent></Card>}
    </div>
  </Layout>;
}
