import { CheckInView } from "@/components/exam/flow/check-in-view";
import { ExamSessionShell } from "@/components/exam/exam-session-shell";

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return (
    <ExamSessionShell sessionCode={sessionId}>
      <CheckInView sessionId={sessionId} />
    </ExamSessionShell>
  );
}
