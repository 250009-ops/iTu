import { WritingCoachView } from "@/components/practice/writing-coach-view";

export default async function StudentWritingSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return (
    <WritingCoachView basePath="/student/practice" sessionId={sessionId} />
  );
}
