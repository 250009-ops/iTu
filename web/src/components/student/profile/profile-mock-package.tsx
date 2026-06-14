"use client";

import Link from "next/link";
import {
  Award,
  BarChart3,
  BookOpen,
  CheckCircle,
  Download,
  Headphones,
  Mic,
  Package,
  PenLine,
  Zap,
} from "lucide-react";
import { useStudentProfileData } from "@/contexts/student-profile-context";
import { exportInvoice } from "@/lib/student/export";

const inclusionIcons = {
  Listening: Headphones,
  Reading: BookOpen,
  Writing: PenLine,
  Speaking: Mic,
  Results: BarChart3,
  Certificate: Award,
};

export function ProfileMockPackage() {
  const { profile } = useStudentProfileData();
  if (!profile) return null;
  const pkg = profile.mockPackage;

  if (!pkg.hasPackage) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h3 className="font-bold text-gray-900" style={{ fontSize: "15px" }}>
            Mock Package
          </h3>
          <p className="mt-0.5 text-gray-500" style={{ fontSize: "13px" }}>
            Your purchased exam credits and usage
          </p>
        </div>
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-10 text-center">
          <Package size={28} className="mx-auto text-gray-300" />
          <p className="mt-3 font-semibold text-gray-900" style={{ fontSize: "14px" }}>
            No package purchased yet
          </p>
          <p className="mt-1 text-gray-500" style={{ fontSize: "13px" }}>
            Book a mock package to see your credits, usage, and invoice here.
          </p>
          <Link
            href="/student/browse"
            className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, #E31837, #c01230)",
              fontSize: "13px",
            }}
          >
            <Zap size={14} />
            Browse mock packages
          </Link>
        </div>
      </div>
    );
  }

  const pct = (pkg.used / pkg.total) * 100;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h3 className="font-bold text-gray-900" style={{ fontSize: "15px" }}>
          Mock Package
        </h3>
        <p className="mt-0.5 text-gray-500" style={{ fontSize: "13px" }}>
          Your purchased exam credits and usage
        </p>
      </div>

      <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
        <div className="flex gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-200 text-gray-600">
            <Package size={20} />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-bold text-gray-900" style={{ fontSize: "14px" }}>
                {pkg.name}
              </h4>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700" style={{ fontSize: "10px" }}>
                Active
              </span>
            </div>
            <p className="mt-0.5 text-gray-500" style={{ fontSize: "12px" }}>
              Purchased {pkg.purchased} · Expires {pkg.expires}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex justify-between" style={{ fontSize: "12px" }}>
            <span className="font-medium text-gray-600">Mocks used</span>
            <span className="font-bold text-gray-900">
              {pkg.used} / {pkg.total}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-[#1B2A4A]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 font-medium text-amber-600" style={{ fontSize: "12px" }}>
            {pkg.remainingText}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {pkg.inclusions.map((item) => {
            const Icon = inclusionIcons[item.label as keyof typeof inclusionIcons];
            return (
              <div
                key={item.label}
                className={`rounded-xl border p-2 text-center ${
                  item.included
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-gray-100 opacity-50 text-gray-400"
                }`}
              >
                <Icon size={14} className="mx-auto mb-1" />
                <p className="font-semibold" style={{ fontSize: "10px" }}>
                  {item.label}
                </p>
                {item.included ? (
                  <CheckCircle size={12} className="mx-auto mt-0.5 text-emerald-500" />
                ) : (
                  <span className="mx-auto mt-0.5 block h-3 w-3 rounded-full bg-gray-200" />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/student/browse"
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, #E31837, #c01230)",
              fontSize: "13px",
            }}
          >
            <Zap size={14} />
            Buy More Mocks
          </Link>
          <button
            type="button"
            onClick={() =>
              exportInvoice({
                name: pkg.name,
                purchased: pkg.purchased,
                orderCode: pkg.orderCode,
              })
            }
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-50"
            style={{ fontSize: "13px" }}
          >
            <Download size={14} />
            Download Invoice
          </button>
        </div>
      </div>
    </div>
  );
}
