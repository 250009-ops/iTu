"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, FileText, UserPlus } from "lucide-react";
import { getInstitutionOverview } from "@/lib/api/institution";
import { useApiQuery } from "@/hooks/use-api-query";
import { Button } from "@/components/ui/button";
import {
  BandPill,
  EmptyState,
  LoadingRow,
  PageHeader,
  ProgressDots,
  SectionCard,
  StatCard,
  StatusPill,
} from "@/components/institution/ui";
import { PortalPage } from "@/components/portal/portal-page";

export function InstitutionDashboardView() {
  const { data, loading } = useApiQuery(getInstitutionOverview);

  return (
    <PortalPage>
      <PageHeader
        breadcrumb="Institution &gt; Dashboard"
        title={data?.centerName ? `Welcome, ${data.centerName}` : "Dashboard"}
        description="Overview of your centre's owned mock sets, students, and mock activity."
        actions={
          <>
            <Link href="/institution/mocks/shop">
              <Button variant="secondary" size="sm">
                <FileText className="h-4 w-4" />
                Buy mock sets
              </Button>
            </Link>
            <Link href="/institution/mocks">
              <Button variant="secondary" size="sm">
                My mocks
              </Button>
            </Link>
            <Link href="/institution/students">
              <Button variant="primary" size="sm">
                <UserPlus className="h-4 w-4" />
                Enroll students
              </Button>
            </Link>
          </>
        }
      />

      {data && data.pendingStudents > 0 && (
        <Link
          href="/institution/students?status=pending"
          className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 transition hover:bg-amber-100"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="flex-1 font-medium">
            {data.pendingStudents} student
            {data.pendingStudents !== 1 ? "s are" : " is"} awaiting your approval.
          </span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Owned mock sets"
          value={data?.grantedSetCount ?? "—"}
          hint="Purchased or granted platform bundles"
          accent="red"
        />
        <StatCard
          label="Active students"
          value={data?.activeStudents ?? "—"}
          hint={`${data?.pendingStudents ?? 0} pending`}
          accent="navy"
        />
        <StatCard
          label="Upcoming mocks (7d)"
          value={data?.upcomingMocksCount ?? "—"}
          accent="violet"
        />
        <StatCard
          label="Avg cohort band"
          value={data?.avgCohortBand != null ? data.avgCohortBand.toFixed(1) : "—"}
          hint="Released results"
          accent="emerald"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard
          title="Upcoming mocks"
          className="lg:col-span-2"
          action={
            <Link
              href="/institution/schedule"
              className="text-xs font-semibold text-brand-red hover:underline"
            >
              View all
            </Link>
          }
        >
          {loading ? (
            <LoadingRow />
          ) : !data?.upcomingMocks.length ? (
            <EmptyState message="No upcoming mocks scheduled yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-5 py-3 font-medium">Student</th>
                    <th className="px-5 py-3 font-medium">Package</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Progress</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.upcomingMocks.map((m) => (
                    <tr key={m.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 font-medium text-navy">
                        {m.studentName}
                      </td>
                      <td className="px-5 py-3 text-muted">{m.packageTitle}</td>
                      <td className="px-5 py-3 text-muted">
                        {new Date(m.mockDate).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3">
                        <ProgressDots progress={m.progress} />
                      </td>
                      <td className="px-5 py-3">
                        <StatusPill status={m.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Recent results"
          action={
            <Link
              href="/institution/reports"
              className="text-xs font-semibold text-brand-red hover:underline"
            >
              Reports
            </Link>
          }
        >
          {loading ? (
            <LoadingRow />
          ) : !data?.recentResults.length ? (
            <EmptyState message="No released results yet." />
          ) : (
            <ul className="divide-y divide-border">
              {data.recentResults.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-navy">
                      {r.studentName}
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(r.date).toLocaleDateString()}
                      {r.targetBand != null && ` · target ${r.targetBand}`}
                    </p>
                  </div>
                  <BandPill band={r.overallBand} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </PortalPage>
  );
}
