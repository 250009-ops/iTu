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

export type InstitutionApplicationInput = {
  name: string;
  organisation: string;
  email: string;
  phone?: string;
  expectedStudents?: string;
  message?: string;
};

export function submitInstitutionApplication(input: InstitutionApplicationInput) {
  return apiFetch<{ status: string }>("/marketing/institution-application", {
    method: "POST",
    body: input,
    auth: false,
  });
}

export function joinCenter(slug: string, input: { name: string; email: string }) {
  return apiFetch<{ status: string; centerName: string; email: string }>(
    `/marketing/centers/${encodeURIComponent(slug)}/join`,
    {
      method: "POST",
      body: input,
      auth: false,
    },
  );
}
