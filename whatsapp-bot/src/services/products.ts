import { supabase } from "../supabase/client";

export type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  colors: string[]; // Utilizado como Marcas
  sizes: string[];  // Utilizado como Compatibilidade
  notes: string | null;
  category_id: string | null;
};

export type ProductWithImages = ProductRow & { images: string[] };

// Busca produtos ativos usando Full-Text Search (tsvector)
export async function searchProducts(query: string, limit = 5): Promise<ProductWithImages[]> {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  if (!terms.length) return [];

  // Formata os termos para o formato do websearch_to_tsquery ou phraseto_tsquery
  // Unimos os termos com & (AND) lógico para o tsquery
  const searchQuery = terms.join(" | ");

  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .textSearch("search_vector", searchQuery)
    .limit(limit);

  if (error || !products?.length) return [];

  const ids = products.map((p) => p.id);
  const { data: imgs } = await supabase
    .from("product_images")
    .select("product_id, public_url, position, is_primary")
    .in("product_id", ids);

  return products.map((p) => ({
    ...p,
    images: (imgs ?? [])
      .filter((i) => i.product_id === p.id)
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || (a.position ?? 0) - (b.position ?? 0))
      .map((i) => i.public_url)
  })) as ProductWithImages[];
}

export async function listByCollectionSlug(slug: string, limit = 5): Promise<ProductWithImages[]> {
  const { data: col } = await supabase.from("collections").select("id").eq("slug", slug).maybeSingle();
  if (!col) return [];
  const { data: pcs } = await supabase
    .from("product_collections").select("product_id").eq("collection_id", col.id).limit(limit);
  const ids = (pcs ?? []).map((r) => r.product_id);
  if (!ids.length) return [];
  const { data: products } = await supabase.from("products").select("*").in("id", ids).eq("active", true);
  const { data: imgs } = await supabase
    .from("product_images").select("product_id, public_url, position, is_primary").in("product_id", ids);
  return (products ?? []).map((p) => ({
    ...p,
    images: (imgs ?? []).filter((i) => i.product_id === p.id).map((i) => i.public_url)
  })) as ProductWithImages[];
}
