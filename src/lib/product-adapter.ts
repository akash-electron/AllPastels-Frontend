import type { ApiProduct } from "@/types/product";
import type { CategoryId, Product } from "@/lib/types";
import { photoSet } from "@/lib/images";

function toCategoryId(value: string): CategoryId {
  const normalized = value.trim().toLowerCase();
  if (normalized === "women" || normalized === "woman" || normalized === "dresses") return "women";
  if (normalized === "men" || normalized === "man") return "men";
  if (normalized === "kids" || normalized === "kid" || normalized === "children") return "kids";
  if (normalized === "accessories" || normalized === "accessory") return "accessories";
  return "accessories";
}

function isNew(createdAt: string): boolean {
  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) return false;
  return Date.now() - created < 1000 * 60 * 60 * 24 * 30;
}

export function toProduct(api: ApiProduct): Product {
  const id = api._id;
  return {
    id,
    slug: id,
    name: api.name,
    category: toCategoryId(api.category),
    categoryLabel: api.category || "Product",
    price: api.price,
    photoSet: photoSet(id),
    images: api.images.filter(Boolean),
    colors: [],
    sizes: api.sizes,
    summary: api.description,
    description: api.description,
    details: api.description ? [api.description] : [],
    rating: api.rating,
    reviewCount: api.reviewCount,
    isNew: isNew(api.createdAt),
    isBestseller: false,
    moods: [],
    collections: [],
    stock: api.stock,
    metaTitle: api.metaTitle.trim() || undefined,
    metaDescription: api.metaDescription.trim() || undefined,
    metaKeywords: api.metaKeywords.trim() || undefined,
    imageAlt: api.imageAlt.trim() || undefined,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}
