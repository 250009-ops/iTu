import { apiFetch } from "./client";

export type SearchResultItem = {
  type: string;
  id: string;
  label: string;
  subtitle?: string;
  href: string;
};

export function searchPortal(query: string) {
  const q = encodeURIComponent(query.trim());
  return apiFetch<SearchResultItem[]>(`/search?q=${q}`);
}
