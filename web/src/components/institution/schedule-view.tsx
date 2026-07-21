"use client";

import { getInstitutionEnrollments } from "@/lib/api/institution";
import { useApiQuery } from "@/hooks/use-api-query";
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

export function InstitutionScheduleView() {
  const { data, loading } = useApiQuery(getInstitutionEnrollments);

  return (
    <PortalPage>
      <PageHeader
        breadcrumb="Institution &gt; Mock Schedule"
        title="Mock Schedule"
        description="Track every mock your students are enrolled in and their progress."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Scheduled"
          value={data?.summary.scheduled ?? "—"}
          accent="navy"
        />
        <StatCard
          label="In progress"
          value={data?.summary.inProgress ?? "—"}
          accent="violet"
        />
        <StatCard
          label="Awaiting results"
          value={data?.summary.awaitingResults ?? "—"}
          accent="amber"
        />
        <StatCard
          label="Completed"
          value={data?.summary.completed ?? "—"}
          accent="emerald"
        />
      </div>

      <SectionCard title="Enrollments">
        {loading ? (
          <LoadingRow />
        ) : !data?.enrollments.length ? (
          <EmptyState message="No enrollments yet. Enroll students from the Students page." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">Package</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Examiner</th>
                  <th className="px-5 py-3 font-medium">Progress</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Band</th>
                </tr>
              </thead>
              <tbody>
                {data.enrollments.map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-medium text-navy">
                      {e.studentName}
                    </td>
                    <td className="px-5 py-3 text-muted">{e.packageTitle}</td>
                    <td className="px-5 py-3 text-muted">
                      {new Date(e.mockDate).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-muted">{e.examiner ?? "—"}</td>
                    <td className="px-5 py-3">
                      <ProgressDots progress={e.progress} />
                    </td>
                    <td className="px-5 py-3">
                      <StatusPill status={e.status} />
                    </td>
                    <td className="px-5 py-3">
                      <BandPill band={e.overallBand} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </PortalPage>
  );
}
