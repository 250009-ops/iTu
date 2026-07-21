"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BrowseTypeTabs } from "@/components/student/browse/browse-type-tabs";
import { MockProductCard } from "@/components/student/browse/mock-product-card";
import { EnrollWizard } from "@/components/institution/enroll-wizard";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  getInstitutionMocks,
  getInstitutionStudents,
  getMockSetOrderStatus,
  type InstitutionMockPackage,
  type InstitutionMockPreview,
} from "@/lib/api/institution";
import { mapBrowseProduct } from "@/lib/api/mappers/student";
import { PageHeader } from "@/components/institution/ui";

type MockPackageLike = InstitutionMockPackage | InstitutionMockPreview["packages"][number];

function toBrowseProduct(pkg: MockPackageLike) {
  return mapBrowseProduct({
    ...pkg,
    skills: (pkg.skills as string[]) ?? [],
    included: (pkg.included as string[]) ?? [],
    rules: (pkg.rules as string[]) ?? [],
  });
}

export function InstitutionMocksView() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabs, setTabs] = useState<
    Awaited<ReturnType<typeof getInstitutionMocks>>["tabs"]
  >([]);
  const [packages, setPackages] = useState<InstitutionMockPackage[]>([]);
  const [preview, setPreview] = useState<InstitutionMockPreview | null>(null);
  const [activeTabId, setActiveTabId] = useState("");
  const [previewTabId, setPreviewTabId] = useState("");
  const [pickStudentFor, setPickStudentFor] = useState<InstitutionMockPackage | null>(
    null,
  );
  const [students, setStudents] = useState<
    { id: string; name: string; status: string }[]
  >([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollStudentId, setEnrollStudentId] = useState("");
  const [enrollStudentName, setEnrollStudentName] = useState("");
  const [enrollPackageId, setEnrollPackageId] = useState("");

  const paymentStatus = searchParams.get("payment");
  const orderCode = searchParams.get("order");

  function loadMocks() {
    setLoading(true);
    return getInstitutionMocks()
      .then((data) => {
        setTabs(data.tabs);
        setPackages(data.packages);
        setPreview(data.preview);
        setActiveTabId(data.tabs[0]?.tabId ?? "");
        setPreviewTabId(data.preview?.tabs[0]?.tabId ?? "");
        setError(null);
      })
      .catch(() => setError("Failed to load your mock sets"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    void loadMocks();
  }, []);

  useEffect(() => {
    if (paymentStatus === "success") {
      toast("Payment successful", {
        description: "Your mock set is now available for student enrollment.",
        variant: "success",
      });
      void loadMocks();
    } else if (paymentStatus === "failed") {
      toast("Payment failed", {
        description: "Your payment was not completed. Try again from Buy mock sets.",
        variant: "error",
      });
    }
  }, [paymentStatus, toast]);

  useEffect(() => {
    if (!orderCode || paymentStatus !== "success") return;
    void getMockSetOrderStatus(orderCode).then(() => {
      void loadMocks();
    });
  }, [orderCode, paymentStatus]);

  const tabPackages = useMemo(() => {
    const tab = tabs.find((t) => t.tabId === activeTabId);
    if (!tab) return [];
    return packages.filter(
      (pkg) =>
        pkg.packageKind === tab.packageKind &&
        pkg.examType === tab.examType,
    );
  }, [packages, tabs, activeTabId]);

  const previewTabPackages = useMemo(() => {
    if (!preview) return [];
    const tab = preview.tabs.find((t) => t.tabId === previewTabId);
    if (!tab) return [];
    return preview.packages.filter(
      (pkg) =>
        pkg.packageKind === tab.packageKind &&
        pkg.examType === tab.examType,
    );
  }, [preview, previewTabId]);

  async function openStudentPicker(pkg: InstitutionMockPackage) {
    setPickStudentFor(pkg);
    setSelectedStudentId("");
    try {
      const data = await getInstitutionStudents("active");
      setStudents(
        data.students.map((s) => ({
          id: s.id,
          name: s.name,
          status: s.status,
        })),
      );
    } catch {
      setStudents([]);
    }
  }

  function startEnroll() {
    if (!pickStudentFor || !selectedStudentId) return;
    const student = students.find((s) => s.id === selectedStudentId);
    setEnrollPackageId(pickStudentFor.id);
    setEnrollStudentId(selectedStudentId);
    setEnrollStudentName(student?.name ?? "student");
    setPickStudentFor(null);
    setEnrollOpen(true);
  }

  const hasOwnedSets = tabs.length > 0;
  const showLockedPreview = !hasOwnedSets && preview != null;

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 lg:p-6">
      <PageHeader
        breadcrumb="Institution"
        title="Mocks"
        description="Your centre's owned mock sets — enroll students on section mocks from purchased or granted bundles."
        actions={
          <Link href="/institution/mocks/shop">
            <Button variant="secondary" size="sm">
              Buy mock sets
            </Button>
          </Link>
        }
      />

      <ApiDataShell loading={loading} error={error}>
        {showLockedPreview ? (
          <div className="space-y-6">
            <p className="text-sm text-muted">
              This is exactly what your Mocks page will look like after purchase —
              section tabs and enroll cards from your chosen set.
            </p>

            <div className="relative overflow-hidden rounded-xl">
              <div
                className="pointer-events-none select-none space-y-6 blur-sm"
                aria-hidden
              >
                <BrowseTypeTabs
                  tabs={preview.tabs.map((tab) => ({
                    tabId: tab.tabId,
                    label: tab.label,
                    available: preview.packages.some(
                      (pkg) =>
                        pkg.packageKind === tab.packageKind &&
                        pkg.examType === tab.examType,
                    ),
                  }))}
                  activeTabId={previewTabId}
                  onTabChange={() => undefined}
                />

                <div className="grid gap-6">
                  {previewTabPackages.map((pkg) => (
                    <MockProductCard
                      key={pkg.id}
                      mode="institution"
                      grantSetTitle={pkg.grantSetTitle}
                      product={toBrowseProduct(pkg)}
                      purchaseDisabled
                      purchaseDisabledReason="Purchase the mock set to enroll students"
                    />
                  ))}
                </div>
              </div>

              <div className="absolute inset-0 flex items-center justify-center bg-white/70 px-6 py-10 backdrop-blur-[2px]">
                <div className="max-w-md rounded-xl border border-sky-200 bg-white px-6 py-6 text-center shadow-lg">
                  <h2 className="text-base font-semibold text-navy">
                    Purchase {preview.showcaseSetTitle} to unlock
                  </h2>
                  <p className="mt-2 text-sm text-muted">
                    After purchase you can enroll students on each section mock
                    directly from this page — no extra setup.
                  </p>
                  <Link href="/institution/mocks/shop" className="mt-5 inline-block">
                    <Button variant="danger" size="sm">
                      Buy mock set
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : hasOwnedSets ? (
          <>
            <BrowseTypeTabs
              tabs={tabs.map((tab) => ({
                tabId: tab.tabId,
                label: tab.label,
                available: packages.some(
                  (pkg) =>
                    pkg.packageKind === tab.packageKind &&
                    pkg.examType === tab.examType,
                ),
              }))}
              activeTabId={activeTabId}
              onTabChange={setActiveTabId}
            />

            <div className="grid gap-6">
              {tabPackages.map((pkg) => (
                <MockProductCard
                  key={pkg.id}
                  mode="institution"
                  grantSetTitle={pkg.grantSetTitle}
                  grantSource={pkg.grantSource}
                  product={toBrowseProduct(pkg)}
                  onEnrollClick={() => void openStudentPicker(pkg)}
                />
              ))}
              {tabPackages.length === 0 && tabs.length > 0 && (
                <p className="rounded-xl border border-border bg-white px-6 py-10 text-center text-sm text-muted">
                  No mocks in this category from your owned sets.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-border bg-white px-6 py-12 text-center shadow-sm">
            <h2 className="text-base font-semibold text-navy">No mock sets yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Purchase a mock set from the shop, or ask iTestU admin to grant one to
              your centre. Then you can enroll students here.
            </p>
            <Link href="/institution/mocks/shop" className="mt-6 inline-block">
              <Button variant="primary" size="sm">
                Buy mock sets
              </Button>
            </Link>
          </div>
        )}
      </ApiDataShell>

      <Modal
        open={pickStudentFor != null}
        onClose={() => setPickStudentFor(null)}
        ariaLabel="Select student to enroll"
        className="max-w-md"
      >
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-bold text-navy">Enroll a student</h2>
          <p className="mt-1 text-sm text-muted">
            Choose an active student for{" "}
            {pickStudentFor ? toBrowseProduct(pickStudentFor).title : "this mock"}
          </p>
        </div>
        <div className="space-y-4 p-5">
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
          >
            <option value="">Select student…</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="secondary" size="sm" onClick={() => setPickStudentFor(null)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!selectedStudentId}
            onClick={startEnroll}
          >
            Continue
          </Button>
        </div>
      </Modal>

      <EnrollWizard
        open={enrollOpen}
        studentId={enrollStudentId}
        studentName={enrollStudentName}
        initialPackageId={enrollPackageId}
        onClose={() => setEnrollOpen(false)}
        onEnrolled={() => setEnrollOpen(false)}
      />
    </div>
  );
}
