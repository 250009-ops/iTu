import { WritingCoachView } from "@/components/practice/writing-coach-view";

export default async function InstStudentWritingSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return (
    <WritingCoachView basePath="/inst-student/practice" sessionId={sessionId} />
  );
}
