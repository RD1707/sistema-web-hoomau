import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import type { Product, Category } from "@/types/db";
import Papa from "papaparse";

export default function Products() {
  const [products, setProducts] = useState<(Product & { primary_image?: string; category_name?: string })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { void load(); }, []);
  
  async function load() {
    setLoading(true);
    const [{ data: cats }, { data: prods }, { data: imgs }] = await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("product_images").select("product_id, public_url, is_primary, position"),
    ]);
    setCategories((cats ?? []) as Category[]);
    const map = new Map((cats ?? []).map((c: any) => [c.id, c.name]));
    const enriched = (prods ?? []).map((p: any) => {
      const productImgs = (imgs ?? []).filter((i: any) => i.product_id === p.id);
      const primary = productImgs.find((i: any) => i.is_primary) ?? productImgs.sort((a: any, b: any) => a.position - b.position)[0];
      return { ...p, primary_image: primary?.public_url, category_name: p.category_id ? map.get(p.category_id) : undefined };
    });
    setProducts(enriched);
    setLoading(false);
  }

  async function remove(id: string) {
    if (!confirm("Remover este produto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Produto removido" }); load(); }
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
          
          const newProducts = rows.map((row) => {
            const name = row.name || row.Nome || row.NAME;
            const description = row.description || row.Description || row.Descrição || "";
            const priceRaw = row.price || row.Price || row.Preço || row.Preco || "0";
            const price = parseFloat(priceRaw.toString().replace(",", "."));
            const activeRaw = row.active || row.Active || row.Ativo;
            const active = activeRaw !== "false" && activeRaw !== "0" && activeRaw !== "nao" && activeRaw !== "não";
            
            const categoryName = row.category || row.Category || row.Categoria;
            let category_id = null;
            if (categoryName) {
              const matchedCat = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
              if (matchedCat) category_id = matchedCat.id;
            }

            const colorsRaw = row.colors || row.Colors || row.Cores || "";
            const sizesRaw = row.sizes || row.Sizes || row.Tamanhos || "";
            
            const colors = colorsRaw ? colorsRaw.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
            const sizes = sizesRaw ? sizesRaw.split(",").map((s: string) => s.trim()).filter(Boolean) : [];

            if (!name) throw new Error("A coluna 'name' ou 'Nome' é obrigatória no CSV.");
            
            return {
              name,
              description,
              price: isNaN(price) ? 0 : price,
              active,
              category_id,
              colors,
              sizes
            };
          });

          if (newProducts.length === 0) {
             toast({ title: "Arquivo vazio", variant: "destructive" });
             setLoading(false);
             return;
          }

          const { error } = await supabase.from("products").insert(newProducts);
          if (error) throw error;
          
          toast({ title: "Sucesso", description: `${newProducts.length} produtos importados.` });
          load();
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

  const filtered = products.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Produtos</h1>
          <p className="text-sm text-muted-foreground">Gerencie o catálogo que o bot usa para responder.</p>
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
          <Button asChild><Link to="/produtos/novo"><Plus className="mr-2 h-4 w-4" /> Novo produto</Link></Button>
        </div>
      </div>

      <Card className="card-elevated">
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou descrição..."
              value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">Nenhum produto encontrado.</p>
              <Button asChild className="mt-4"><Link to="/produtos/novo">Cadastrar primeiro produto</Link></Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => (
                <div key={p.id} className="group overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md">
                  <div className="aspect-square bg-muted">
                    {p.primary_image ? (
                      <img src={p.primary_image} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sem foto</div>
                    )}
                  </div>
                  <div className="space-y-2 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-1 text-sm font-medium">{p.name}</h3>
                      {!p.active && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
                    </div>
                    {p.category_name && <p className="text-xs text-muted-foreground">{p.category_name}</p>}
                    {p.price != null && <p className="text-sm font-semibold text-primary">R$ {Number(p.price).toFixed(2)}</p>}
                    <div className="flex gap-1 pt-1">
                      <Button asChild size="sm" variant="ghost" className="h-8 flex-1">
                        <Link to={`/produtos/${p.id}`}><Pencil className="h-3.5 w-3.5" /> Editar</Link>
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8" onClick={() => remove(p.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}