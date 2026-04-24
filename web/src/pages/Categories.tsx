import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Category } from "@/types/db";
import Papa from "papaparse";

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado do formulário
  const [formData, setFormData] = useState<{ id?: string; name: string; description: string }>({
    name: "",
    description: "",
  });

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");
      
    if (error) {
      toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  }

  function openDialog(category?: Category) {
    if (category) {
      setFormData({ id: category.id, name: category.name, description: category.description || "" });
    } else {
      setFormData({ name: "", description: "" });
    }
    setIsDialogOpen(true);
  }

  function generateSlug(name: string) {
    return name.toString().toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  async function saveCategory() {
    if (!formData.name.trim()) {
      toast({ title: "Atenção", description: "O nome da categoria é obrigatório.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const slug = generateSlug(formData.name);

    if (formData.id) {
      // Atualizar
      const { error } = await supabase
        .from("categories")
        .update({ name: formData.name, description: formData.description, slug })
        .eq("id", formData.id);
        
      if (error) toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      else {
        toast({ title: "Categoria atualizada com sucesso!" });
        setIsDialogOpen(false);
        loadCategories();
      }
    } else {
      // Criar nova
      const { error } = await supabase
        .from("categories")
        .insert([{ name: formData.name, description: formData.description, slug }]);
        
      if (error) toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
      else {
        toast({ title: "Categoria criada com sucesso!" });
        setIsDialogOpen(false);
        loadCategories();
      }
    }
    setSaving(false);
  }

  async function deleteCategory(id: string) {
    if (!confirm("Tem a certeza que deseja remover esta categoria? Produtos associados poderão ficar sem categoria.")) return;
    
    const { error } = await supabase.from("categories").delete().eq("id", id);
    
    if (error) {
      toast({ 
        title: "Erro ao apagar", 
        description: error.code === '23503' ? "Não é possível apagar pois existem produtos usando esta categoria." : error.message, 
        variant: "destructive" 
      });
    } else {
      toast({ title: "Categoria removida" });
      loadCategories();
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          const newCategories = rows.map((row) => {
            const name = row.name || row.Nome || row.NAME;
            const description = row.description || row.Description || row.Descrição || "";
            if (!name) throw new Error("A coluna 'name' ou 'Nome' é obrigatória no CSV.");
            
            return {
              name,
              description,
              slug: generateSlug(name)
            };
          });

          if (newCategories.length === 0) {
             toast({ title: "Arquivo vazio", variant: "destructive" });
             setLoading(false);
             return;
          }

          const { error } = await supabase.from("categories").insert(newCategories);
          if (error) throw error;
          
          toast({ title: "Sucesso", description: `${newCategories.length} categorias importadas.` });
          loadCategories();
        } catch (err: any) {
          toast({ title: "Erro ao importar", description: err.message, variant: "destructive" });
        } finally {
          if (fileInputRef.current) fileInputRef.current.value = "";
          setLoading(false);
        }
      },
      error: (error) => {
        toast({ title: "Erro no parse do CSV", description: error.message, variant: "destructive" });
        setLoading(false);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categorias</h1>
          <p className="text-sm text-muted-foreground">Organize os seus produtos por coleções ou tipos.</p>
        </div>
        <div className="flex gap-2">
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload} 
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={loading}>
            <Upload className="mr-2 h-4 w-4" /> Importar CSV
          </Button>
          <Button onClick={() => openDialog()} disabled={loading}>
            <Plus className="mr-2 h-4 w-4" /> Nova Categoria
          </Button>
        </div>
      </div>

      <Card className="card-elevated">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : categories.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>
            </div>
          ) : (
            <div className="divide-y">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div>
                    <h3 className="font-medium">{cat.name}</h3>
                    {cat.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{cat.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openDialog(cat)}>
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteCategory(cat.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criação / Edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formData.id ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome da Categoria</label>
              <Input 
                placeholder="Ex: Vestidos de Verão" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição (Opcional)</label>
              <Textarea 
                placeholder="Uma breve descrição da categoria..." 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveCategory} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {formData.id ? "Salvar Alterações" : "Criar Categoria"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}