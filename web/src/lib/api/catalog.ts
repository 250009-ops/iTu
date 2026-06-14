import { apiFetch } from "./client";

export type CatalogPackageResponse = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  examType: string;
  mostPopular: boolean;
  rating: number | null;
  reviewCount: number;
  skills: string[];
  included: string[];
  rules: string[];
};

export function listPackages() {
  return apiFetch<CatalogPackageResponse[]>("/catalog/packages", {
    auth: false,
  });
}

export function getPackage(slug: string) {
  return apiFetch(`/catalog/packages/${slug}`, { auth: false });
}
