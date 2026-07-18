import { PracticeAttemptView } from "@/components/practice/practice-attempt-view";

export default async function StudentPracticeAttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  return (
    <PracticeAttemptView attemptId={attemptId} basePath="/student/practice" />
  );
}
