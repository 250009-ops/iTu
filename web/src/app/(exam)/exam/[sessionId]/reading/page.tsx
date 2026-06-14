import { ReadingPlayer } from "@/components/exam/reading/reading-player";

export default async function ReadingExamPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <ReadingPlayer sessionId={sessionId} />;
}
