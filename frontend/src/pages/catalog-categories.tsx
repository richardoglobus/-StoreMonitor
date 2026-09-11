import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PackageSearch, Plus } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { getListCategoriesQueryKey, useCreateCategory, useListCategories, useUpdateCategory } from "@/lib/api";
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
  const createCategory = useCreateCategory({ mutation: { onSuccess: () => { toast.success("Category added"); setName(""); setChargeItemCode(""); queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() }); }, onError: (e: any) => toast.error(e?.error || "Failed to add category") } });
  const updateCategory = useUpdateCategory({ mutation: { onSuccess: () => { toast.success("Charge item code updated"); queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() }); } } });

  return <Layout>
    <div className="max-w-4xl mx-auto space-y-6">
      <div><h1 className="text-3xl font-bold flex items-center gap-2"><PackageSearch className="h-7 w-7 text-primary"/>Catalog Categories</h1><p className="text-muted-foreground mt-1">Organize catalog items and assign the charge item code used in reports.</p></div>
      <Card>
        <CardHeader><CardTitle className="text-base">Add Category</CardTitle></CardHeader>
        <CardContent><div className="flex flex-col sm:flex-row gap-3 items-end"><div className="flex-1 space-y-2"><Label>Category Name</Label><Input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. PHARM, DRESSINGS"/></div><div className="flex-1 space-y-2"><Label>Charge Item Code</Label><Input value={chargeItemCode} onChange={e=>setChargeItemCode(e.target.value)} placeholder="e.g. 221102"/></div><Button onClick={()=>{if(!name.trim()) return toast.error("Category name is required"); createCategory.mutate({data:{name,chargeItemCode}})}} disabled={createCategory.isPending}><Plus className="h-4 w-4 mr-1"/>Add Category</Button></div></CardContent>
      </Card>
      <Card><CardHeader><CardTitle className="text-base">Categories</CardTitle></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Charge Item Code</TableHead><TableHead className="text-right">Items</TableHead><TableHead className="text-right">Open</TableHead></TableRow></TableHeader><TableBody>{isLoading ? <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow> : (categories || []).map(category => <TableRow key={category.id}><TableCell className="font-medium">{category.name}</TableCell><TableCell><Input defaultValue={category.chargeItemCode || ""} className="font-mono max-w-48" onBlur={e=>{if(e.target.value !== (category.chargeItemCode || "")) updateCategory.mutate({categoryId:category.id,data:{chargeItemCode:e.target.value}})}}/></TableCell><TableCell className="text-right">{category.itemCount || 0}</TableCell><TableCell className="text-right"><Button variant="outline" size="sm" onClick={()=>setLocation(`/items?categoryId=${category.id}`)}>View Items</Button></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
    </div>
  </Layout>;
}
