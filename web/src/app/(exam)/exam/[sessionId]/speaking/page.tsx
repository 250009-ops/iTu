import { SpeakingStudentFlow } from "@/components/exam/speaking/speaking-student-flow";

export default async function SpeakingExamPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <SpeakingStudentFlow sessionId={sessionId} />;
}
