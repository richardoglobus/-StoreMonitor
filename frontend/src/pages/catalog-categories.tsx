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
import { getListCategoriesQueryKey, useCreateCategory, useDeleteCategory, useListCategories, useUpdateCategory } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";

export default function CatalogCategoriesPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  if (!user?.permissions?.manageCatalog) { setLocation("/"); return null; }
  const { data: categories, isLoading } = useListCategories();
  const [name, setName] = useState("");
  const [chargeItemCode, setChargeItemCode] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const refresh = () => queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
  const createCategory = useCreateCategory({ mutation: { onSuccess: () => { toast.success("Category added"); setName(""); setChargeItemCode(""); refresh(); }, onError: (e: any) => toast.error(e?.error || "Failed to add category") } });
  const updateCategory = useUpdateCategory({ mutation: { onSuccess: () => { toast.success("Category updated"); setEditingId(null); refresh(); }, onError: (e: any) => toast.error(e?.error || "Failed to update category") } });
  const deleteCategory = useDeleteCategory({ mutation: { onSuccess: () => { toast.success("Category deleted"); refresh(); }, onError: (e: any) => toast.error(e?.error || "Cannot delete category") } });
  const beginEdit = (category: any) => { setEditingId(category.id); setEditName(category.name); setEditCode(category.chargeItemCode || ""); };
  const saveEdit = (id: number) => { if (!editName.trim()) return toast.error("Category name is required"); updateCategory.mutate({ categoryId: id, data: { name: editName, chargeItemCode: editCode } }); };
  const remove = (category: any) => { if (category.itemCount > 0) return toast.error("Move or reassign the items before deleting this category"); if (confirm(`Delete category \"${category.name}\"?`)) deleteCategory.mutate({ categoryId: category.id }); };

  return <Layout>
    <div className="max-w-5xl mx-auto space-y-6">
      <div><h1 className="text-3xl font-bold flex items-center gap-2"><PackageSearch className="h-7 w-7 text-primary"/>Catalog Categories</h1><p className="text-muted-foreground mt-1">Add, edit, or delete categories and assign the charge item code used in reports.</p></div>
      <Card>
        <CardHeader><CardTitle className="text-base">Add Category</CardTitle></CardHeader>
        <CardContent><div className="flex flex-col sm:flex-row gap-3 items-end"><div className="flex-1 space-y-2"><Label>Category Name</Label><Input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. PHARM, DRESSINGS"/></div><div className="flex-1 space-y-2"><Label>Charge Item Code</Label><Input value={chargeItemCode} onChange={e=>setChargeItemCode(e.target.value)} placeholder="e.g. 221102"/></div><Button onClick={()=>{if(!name.trim()) return toast.error("Category name is required"); createCategory.mutate({data:{name,chargeItemCode}})}} disabled={createCategory.isPending}><Plus className="h-4 w-4 mr-1"/>Add Category</Button></div></CardContent>
      </Card>
      <Card><CardHeader><CardTitle className="text-base">Categories</CardTitle></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Charge Item Code</TableHead><TableHead className="text-right">Items</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{isLoading ? <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow> : (categories || []).map(category => <TableRow key={category.id}>{editingId === category.id ? <><TableCell><Input value={editName} onChange={e=>setEditName(e.target.value)}/></TableCell><TableCell><Input value={editCode} onChange={e=>setEditCode(e.target.value)} className="font-mono max-w-48"/></TableCell></> : <><TableCell className="font-medium">{category.name}</TableCell><TableCell className="font-mono">{category.chargeItemCode || "—"}</TableCell></>}<TableCell className="text-right">{category.itemCount || 0}</TableCell><TableCell className="text-right"><div className="flex justify-end gap-1">{editingId === category.id ? <><Button variant="ghost" size="icon" title="Save" onClick={()=>saveEdit(category.id)}><Save className="h-4 w-4"/></Button><Button variant="ghost" size="icon" title="Cancel" onClick={()=>setEditingId(null)}><X className="h-4 w-4"/></Button></> : <><Button variant="ghost" size="icon" title="Edit category" onClick={()=>beginEdit(category)}><Pencil className="h-4 w-4"/></Button><Button variant="ghost" size="icon" title={category.itemCount ? "Move items before deleting" : "Delete category"} onClick={()=>remove(category)} className="text-destructive"><Trash2 className="h-4 w-4"/></Button><Button variant="outline" size="sm" onClick={()=>setLocation(`/items?categoryId=${category.id}`)}>View Items</Button></>}</div></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
    </div>
  </Layout>;
}
