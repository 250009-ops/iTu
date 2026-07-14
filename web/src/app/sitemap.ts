import type { MetadataRoute } from "next";
import { SITE, TOP_TEACHERS } from "@/lib/marketing/data";
import { fetchCenters } from "@/lib/marketing/server-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.domain;
  const now = new Date();

  const staticRoutes = [
    { path: "/", priority: 1, freq: "weekly" as const },
    { path: "/mock-exams", priority: 0.9, freq: "weekly" as const },
    { path: "/how-it-works", priority: 0.8, freq: "monthly" as const },
    { path: "/teachers", priority: 0.8, freq: "weekly" as const },
    { path: "/pricing", priority: 0.9, freq: "monthly" as const },
    { path: "/results", priority: 0.7, freq: "monthly" as const },
    { path: "/for-students", priority: 0.7, freq: "monthly" as const },
    { path: "/for-teachers", priority: 0.7, freq: "monthly" as const },
    { path: "/for-institutions", priority: 0.7, freq: "monthly" as const },
    { path: "/centers", priority: 0.6, freq: "weekly" as const },
    { path: "/about", priority: 0.5, freq: "yearly" as const },
    { path: "/contact", priority: 0.5, freq: "yearly" as const },
    { path: "/faq", priority: 0.6, freq: "monthly" as const },
    { path: "/terms", priority: 0.3, freq: "yearly" as const },
    { path: "/privacy", priority: 0.3, freq: "yearly" as const },
  ];

  const teacherRoutes = TOP_TEACHERS.map((t) => ({
    path: `/teachers/${t.slug}`,
    priority: 0.6,
    freq: "monthly" as const,
  }));

  const centers = await fetchCenters().catch(() => []);
  const centerRoutes = centers.map((c) => ({
    path: `/centers/${c.slug}`,
    priority: 0.5,
    freq: "weekly" as const,
  }));

  return [...staticRoutes, ...teacherRoutes, ...centerRoutes].map((r) => ({
    url: `${base}${r.path}`,
    lastModified: now,
    changeFrequency: r.freq,
    priority: r.priority,
  }));
}
