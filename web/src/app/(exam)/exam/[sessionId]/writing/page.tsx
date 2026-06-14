import { WritingPlayer } from "@/components/exam/writing/writing-player";

export default async function WritingExamPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <WritingPlayer sessionId={sessionId} />;
}
