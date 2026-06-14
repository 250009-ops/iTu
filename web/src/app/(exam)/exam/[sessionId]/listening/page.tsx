import { ListeningPlayer } from "@/components/exam/listening/listening-player";

export default async function ListeningExamPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <ListeningPlayer sessionId={sessionId} />;
}
