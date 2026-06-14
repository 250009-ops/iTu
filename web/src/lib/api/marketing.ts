import { apiFetch } from "./client";

export type MarketingTestimonial = {
  id: string;
  quote: string;
  name: string;
  country: string;
  rating: number;
  band: number | null;
};

export function getMarketingTestimonials() {
  return apiFetch<MarketingTestimonial[]>("/marketing/testimonials", {
    auth: false,
  });
}
